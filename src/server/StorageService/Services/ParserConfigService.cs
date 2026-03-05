using CollectorService.Interfaces;
using Common.Contracts.Events;
using Common.Contracts.Parser;
using Common.Entities;
using Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Common.Interfaces;
using Common.Interfaces.Parser;
using MongoDB.Driver;
using StorageService.Contracts.ParserUserConfig;
using StorageService.Contracts.ParserUserConfig.Get;
using StorageService.Validation;
using System.Security.Cryptography;

namespace StorageService.Services;

internal class ParserConfigService(
	IMongoRepository<ParserUserConfig> repo,
	IConfiguration config,
	IIntegrationDispatcher dispatcher,
	IHttpRestClient restClient)
{
	public async Task CreateInternalAsync(UserConfigCreateInternalDto dto, Guid userId) {
		var response = await restClient.GetAsync<bool>($"/api/collector/parser/{dto.ParserSlug}/exists_internal");
		if (!response)
			throw new BadRequestException($"Parser '{dto.ParserSlug}' not found");

		var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
		if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: interval, out var error))
			throw new BadRequestException(error);

		var isNameBusy = await repo.AnyAsync(x =>
			x.SourceType == ParserSourceType.Internal &&
			x.UserId == userId &&
			x.Internal!.CustomName == dto.CustomName);
		if (isNameBusy && !string.IsNullOrEmpty(dto.CustomName))
			throw new BadRequestException("Parser with the same options already exists");

		var (existingConfigs, _) = await repo.FindAsync(x =>
			x.UserId == userId &&
			x.SourceType == ParserSourceType.Internal &&
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
			SourceType = ParserSourceType.Internal,
			Internal = new InternalOptions {
				CustomName = dto.CustomName,
				CronExpression = dto.CronExpression,
				Options = dto.Options,
			}
		});
	}

	public async Task<string> CreateExternalAsync(UserConfigCreateExternalDto dto, Guid userId) {
		if (await repo.AnyAsync(x => x.UserId == userId && x.ParserSlug == dto.ParserSlug))
			throw new BadRequestException("Parser name must be unique");

		var token = GenerateToken();
		var tokenHash = SecurityHelper.HashToken(token);

		await repo.CreateAsync(new ParserUserConfig {
			UserId = userId,
			ParserSlug = dto.ParserSlug,
			IsEnabled = dto.IsEnabled,
			SourceType = ParserSourceType.External,
			External = new ExternalOptions
			{
				TokenHash = tokenHash
			}
		});

		return token;
	}

	public async Task<(IEnumerable<UserConfigBaseDto> configs, int totalCount)> GetAllForUserAsync(
		Guid userId, int? page, int? pageSize, bool? oldFirst)
	{
		var (configs, totalCount) = await repo.FindAsync(
			c => c.UserId == userId,
			page,
			pageSize,
			oldFirst);

		var resp = configs.Select(MapToDto).ToList();
		return (resp, totalCount);
	}

	public async Task<ParserUserConfig> GetByIdAsync(Guid id, Guid userId) {
		var config = await repo.GetByIdAsync(id);
		if (config == null || config.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		return config;
	}

	public async Task UpdateInternalAsync(
		Guid id,
		UserConfigPatchDto dto,
		Guid userId)
	{
		if (dto.CronExpression != null)
		{
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
		if (dto.CronExpression != null)
			updates.Add(Builders<ParserUserConfig>.Update.Set(c => c.Internal.CronExpression, dto.CronExpression));
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
		Guid userId)
	{
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
	}

	public async Task<RunParserResult> RunConfigAsync(Guid id, Guid userId) {
		var config = await repo.GetByIdAsync(id);
		if (config == null || config.UserId != userId)
			throw new NotFoundException("Parser configuration not found");

		if (config.SourceType != ParserSourceType.Internal)
			throw new BadRequestException("Only internal configs can be run manually");

		var command = new RunParserEvent
		{
			ConfigId = config.Id,
			ParserName = config.ParserSlug,
			UserId = config.UserId,
			Options = config.Internal.Options,
			CorrelationId = Guid.GenCorrelationId(),
		};

		await dispatcher.DispatchAsync(command);
		return new RunParserResult { CorrelationId = command.CorrelationId.Value };
	}

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

		return config.SourceType switch
		{
			ParserSourceType.Internal =>
				new UserInternalConfigDto
				{
					ParserSlug = config.ParserSlug,
					IsEnabled = config.IsEnabled,
					LastRunUtc = config.LastRunUtc,
					LastStatus = baseStatus,
					LastErrorMessage = config.LastErrorMessage,
					Options = config.Internal?.Options,
					CronExpression = config.Internal?.CronExpression,
				},
			ParserSourceType.External =>
				new UserExternalConfigDto
				{
					ParserSlug = config.ParserSlug,
					IsEnabled = config.IsEnabled,
					LastRunUtc = config.LastRunUtc,
					LastStatus = baseStatus,
					LastErrorMessage = config.LastErrorMessage,
					TokenHash = config.External?.TokenHash ?? string.Empty,
				},
			_ => throw new InvalidOperationException($"Unknown parser source type: {config.SourceType}")
		};
	}
}