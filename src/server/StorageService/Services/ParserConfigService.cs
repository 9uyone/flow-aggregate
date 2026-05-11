using CollectorService.Interfaces;
using Common.Contracts.Events;
using Common.Contracts.Parser;
using Common.Entities;
using Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces;
using MongoDB.Driver;
using StorageService.Contracts.ParserUserConfig;
using StorageService.Contracts.ParserUserConfig.Get;
using StorageService.Entities;
using StorageService.Validation;
using System.Security.Cryptography;

namespace StorageService.Services;

internal class ParserConfigService(
	IMongoRepository<ParserUserConfig> repo,
	IMongoRepository<ParserDefinition> definitionsRepo,
	IMongoDatabase database,
	IConfiguration config,
	IIntegrationDispatcher dispatcher) {
	public async Task CreateInternalAsync(UserConfigCreateInternalDto dto, Guid userId) {
		var parserDefinition = await GetParserDefinitionAsync(dto.ParserSlug);
		if (!parserDefinition.SupportsManualRun)
			throw new BadRequestException($"Parser '{dto.ParserSlug}' does not support internal/manual execution");

		if (!string.IsNullOrEmpty(dto.CronExpression) && !parserDefinition.SupportsScheduledRun)
			throw new BadRequestException($"Parser '{dto.ParserSlug}' does not support scheduled execution");

		if (!string.IsNullOrEmpty(dto.CronExpression)) {
			var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
			if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: interval, out var error))
				throw new BadRequestException(error);
		}

		var isNameBusy = await repo.AnyAsync(x =>
			(x.SourceType == ParserSourceType.Internal || x.SourceType == ParserSourceType.Plugin) &&
			x.UserId == userId &&
			x.Internal!.CustomName == dto.CustomName);
		if (isNameBusy && !string.IsNullOrEmpty(dto.CustomName))
			throw new BadRequestException("Parser with the same custom name already exists");

		var (existingConfigs, _) = await repo.FindAsync(x =>
			x.UserId == userId &&
			(x.SourceType == ParserSourceType.Internal || x.SourceType == ParserSourceType.Plugin) &&
			x.ParserSlug == dto.ParserSlug);
		var isDuplicate = existingConfigs.Any(x =>
			(x.Internal!.Options?.Count == dto.Options?.Count) &&
			!(x.Internal.Options?.Except(dto.Options ?? Enumerable.Empty<KeyValuePair<string, string>>()).Any() ?? false));
		if (isDuplicate)
			throw new BadRequestException("Parser with the same options already exists");

		await repo.CreateAsync(new ParserUserConfig {
			UserId = userId,
			ParserSlug = dto.ParserSlug,
			IsEnabled = dto.IsEnabled,
			SourceType = parserDefinition.SourceType,
			Internal = new InternalOptions {
				CustomName = dto.CustomName,
				CronExpression = dto.CronExpression,
				Options = dto.Options,
			}
		});
	}

	public async Task<UpsertExternalConfigResponse> UpsertExternalWithDefinitionAsync(UpsertExternalConfigWithDefinitionDto dto, Guid userId) {
		var slug = dto.Slug.Trim();
		var displayName = dto.DisplayName.Trim();
		var description = dto.Description?.Trim() ?? string.Empty;
		var metricFields = NormalizeStrings(dto.MetricFields);
		var dimensions = NormalizeStrings(dto.Dimensions);

		using var session = await database.Client.StartSessionAsync();
		session.StartTransaction();

		try {
			var definitionsCollection = database.GetCollection<ParserDefinition>("parser_definitions");
			var configsCollection = database.GetCollection<ParserUserConfig>("parser_user_configs");

			var existingDefinition = await definitionsCollection.Find(session, x => x.Slug == slug).FirstOrDefaultAsync();
			if (existingDefinition is not null && existingDefinition.SourceType != ParserSourceType.External)
				throw new BadRequestException($"Parser slug '{slug}' is already used by non-external parser");

			if (existingDefinition is not null && existingDefinition.OwnerUserId is not null && existingDefinition.OwnerUserId != userId)
				throw new BadRequestException($"External parser slug '{slug}' belongs to another user");

			var definitionFilter = Builders<ParserDefinition>.Filter.Eq(x => x.Slug, slug);
			var definitionUpdate = Builders<ParserDefinition>.Update
				.Set(x => x.Slug, slug)
				.Set(x => x.DisplayName, displayName)
				.Set(x => x.Description, description)
				.Set(x => x.MetricFields, metricFields)
				.Set(x => x.Dimensions, dimensions)
				.Set(x => x.SourceType, ParserSourceType.External)
				.Set(x => x.SupportsPushIngest, true)
				.Set(x => x.SupportsManualRun, false)
				.Set(x => x.SupportsScheduledRun, false)
				.Set(x => x.SupportsParameters, false)
				.Set(x => x.OwnerUserId, userId)
				.Set(x => x.UpdatedAt, DateTime.UtcNow)
				.SetOnInsert(x => x.Id, Guid.NewGuid())
				.SetOnInsert(x => x.Timestamp, DateTime.UtcNow);

			await definitionsCollection.UpdateOneAsync(session, definitionFilter, definitionUpdate, new UpdateOptions { IsUpsert = true });

			var existingConfig = await configsCollection.Find(session, x => x.UserId == userId && x.ParserSlug == slug && x.SourceType == ParserSourceType.External).FirstOrDefaultAsync();
			var created = existingConfig is null;
			string? createdToken = null;
			var configId = existingConfig?.Id ?? Guid.NewGuid();

			if (created) {
				createdToken = GenerateToken();
				var tokenHash = SecurityHelper.HashToken(createdToken);
				await configsCollection.InsertOneAsync(session, new ParserUserConfig {
					Id = configId,
					Timestamp = DateTime.UtcNow,
					UserId = userId,
					ParserSlug = slug,
					IsEnabled = dto.IsEnabled,
					SourceType = ParserSourceType.External,
					External = new ExternalOptions { TokenHash = tokenHash }
				});
			}
			else {
				var configFilter = Builders<ParserUserConfig>.Filter.Eq(x => x.Id, existingConfig!.Id);
				var configUpdate = Builders<ParserUserConfig>.Update
					.Set(x => x.IsEnabled, dto.IsEnabled);
				await configsCollection.UpdateOneAsync(session, configFilter, configUpdate);
			}

			await session.CommitTransactionAsync();
			return new UpsertExternalConfigResponse {
				ConfigId = configId,
				Token = createdToken,
				IsCreated = created
			};
		}
		catch {
			await session.AbortTransactionAsync();
			throw;
		}
	}

	public async Task<(IEnumerable<UserConfigBaseDto> configs, int totalCount)> GetAllForUserAsync(
		Guid userId, int? page, int? pageSize, bool? oldFirst) {
		var (configs, totalCount) = await repo.FindAsync(
			c => c.UserId == userId,
			page,
			pageSize,
			oldFirst);

		var resp = configs.Select(MapToDto).ToList();
		return (resp, totalCount);
	}

	public async Task<UserConfigBaseDto> GetByIdAsync(Guid id, Guid userId) {
		var config = await repo.GetByIdAsync(id);
		if (config == null || config.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		return MapToDto(config);
	}

	public async Task UpdateInternalAsync(
		Guid id,
		UserConfigPatchDto dto,
		Guid userId) {
		if (dto.CronExpression != null) {
			var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
			if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: interval, out var error))
				throw new BadRequestException(error);
		}

		var existing = await repo.GetByIdAsync(id);
		if (existing == null || existing.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		if (existing.SourceType != ParserSourceType.Internal)
			throw new BadRequestException("This configuration is not an internal parser");

		var updates = new List<UpdateDefinition<ParserUserConfig>>();
		//if (dto.CronExpression != null)
		updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.Internal.CronExpression, dto.CronExpression));
		if (dto.CustomName != null)
			updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.Internal.CustomName, dto.CustomName));
		if (dto.IsEnabled.HasValue)
			updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.IsEnabled, dto.IsEnabled.Value));
		if (dto.Options is not null)
			updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.Internal.Options, dto.Options));

		if (updates.Count == 0)
			throw new BadRequestException("No fields to update");

		var combinedUpdate = Builders<ParserUserConfig>.Update.Combine(updates);
		await repo.UpdateOneAsync(c => c.Id == id, combinedUpdate);
	}

	public async Task UpdateExternalAsync(
		Guid id,
		UserConfigPatchDto dto,
		Guid userId) {
		var existing = await repo.GetByIdAsync(id);
		if (existing == null || existing.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		if (existing.SourceType != ParserSourceType.External)
			throw new BadRequestException("This configuration is not an external parser");

		var updates = new List<UpdateDefinition<ParserUserConfig>>();
		if (dto.IsEnabled.HasValue)
			updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.IsEnabled, dto.IsEnabled.Value));

		if (updates.Count == 0)
			throw new BadRequestException("No fields to update");

		var combinedUpdate = Builders<ParserUserConfig>.Update.Combine(updates);
		await repo.UpdateOneAsync(c => c.Id == id, combinedUpdate);
	}

	public async Task DeleteAsync(Guid id, Guid userId) {
		var existing = await repo.GetByIdAsync(id);
		if (existing == null || existing.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		await repo.DeleteAsync(c => c.Id == id);

		if (existing.SourceType != ParserSourceType.External)
			return;

		var hasOtherConfigsWithSlug = await repo.AnyAsync(c => c.ParserSlug == existing.ParserSlug && c.Id != id);
		if (hasOtherConfigsWithSlug)
			return;

		var parserDefinition = await FindParserDefinitionAsync(existing.ParserSlug);
		if (parserDefinition is null)
			return;

		if (parserDefinition.SourceType != ParserSourceType.External)
			return;

		if (parserDefinition.OwnerUserId != userId)
			return;

		await definitionsRepo.DeleteAsync(x => x.Slug == existing.ParserSlug);
	}

	public async Task<RunParserResult> RunConfigAsync(Guid id, Guid userId) {
		var config = await repo.GetByIdAsync(id);
		if (config == null || config.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		var parserDefinition = await GetParserDefinitionAsync(config.ParserSlug);
		if (!parserDefinition.SupportsManualRun)
			throw new BadRequestException($"Parser '{config.ParserSlug}' does not support manual run");

		var command = new RunParserEvent {
			ConfigId = config.Id,
			ParserSlug = config.ParserSlug,
			UserId = config.UserId,
			Options = config.Internal?.Options,
			CorrelationId = Guid.GenCorrelationId(),
		};

		await dispatcher.DispatchAsync(command);
		return new RunParserResult { CorrelationId = command.CorrelationId.Value };
	}

	private async Task<ParserDefinition> GetParserDefinitionAsync(string slug) {
		var parserDefinition = await FindParserDefinitionAsync(slug);
		if (parserDefinition is null)
			throw new BadRequestException($"Parser '{slug}' not found in parser catalog");

		return parserDefinition;
	}

	private async Task<ParserDefinition?> FindParserDefinitionAsync(string slug) {
		var (items, _) = await definitionsRepo.FindAsync(x => x.Slug == slug, page: 1, pageSize: 1);
		return items.FirstOrDefault();
	}

	private static string[] NormalizeStrings(IEnumerable<string>? items) =>
		items?.Where(v => !string.IsNullOrWhiteSpace(v))
			.Select(v => v.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(v => v)
			.ToArray() ?? [];

	private static string GenerateToken() {
		byte[] randomNumber = new byte[32];
		using (var rng = RandomNumberGenerator.Create()) {
			rng.GetBytes(randomNumber);
		}
		return Convert.ToHexString(randomNumber);
	}

	private static UserConfigBaseDto MapToDto(ParserUserConfig config) {
		var baseStatus = config.LastStatus == null
			? null
			: (config.LastStatus == true ? ExecutionStatus.Success.ToString() : ExecutionStatus.Failed.ToString());

		return config.SourceType switch {
			ParserSourceType.Internal =>
				new UserInternalConfigDto {
					Id = config.Id,
					CustomName = config.Internal?.CustomName,
					SourceType = config.SourceType,
					ParserSlug = config.ParserSlug,
					IsEnabled = config.IsEnabled,
					LastRunAt = config.LastRunAt,
					LastStatus = baseStatus,
					LastErrorMessage = config.LastErrorMessage,
					Options = config.Internal?.Options,
					CronExpression = config.Internal?.CronExpression,
				},
			ParserSourceType.External =>
				new UserExternalConfigDto {
					Id = config.Id,
					SourceType = config.SourceType,
					ParserSlug = config.ParserSlug,
					IsEnabled = config.IsEnabled,
					LastRunAt = config.LastRunAt,
					LastStatus = baseStatus,
					LastErrorMessage = config.LastErrorMessage,
					TokenHash = config.External?.TokenHash ?? string.Empty,
				},
			_ => throw new InvalidOperationException($"Unknown parser source type: {config.SourceType}")
		};
	}
}