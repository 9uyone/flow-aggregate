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
using StorageService.Validation;

namespace StorageService;

internal class ParserConfigService(
	IMongoRepository<ParserUserConfig> repo,
	IConfiguration config,
	IIntegrationDispatcher dispatcher)
{
	public async Task CreateInternalAsync(UserConfigCreateInternalDto dto, Guid userId) {
		var interval = config.GetValue<int>("ParserConfigs:minIntervalSeconds");
		if (!CronValidator.TryValidate(dto.CronExpression, minIntervalSeconds: interval, out var error))
			throw new BadRequestException(error);

		if (await repo.AnyAsync(x => x.ParserName == dto.ParserName))
			throw new BadRequestException("Parser name must be unique");

		await repo.CreateAsync(new ParserUserConfig {
			UserId = userId,
			ParserName = dto.ParserName,
			IsEnabled = dto.IsEnabled,
			SourceType = ParserSourceType.Internal,
			Internal = new InternalOptions
			{
				CronExpression = dto.CronExpression,
				Options = dto.Options,
			}
		});
	}

	public async Task<string> CreateExternalAsync(UserConfigCreateExternalDto dto, Guid userId) {
		if (await repo.AnyAsync(x => x.ParserName == dto.ParserName))
			throw new BadRequestException("Parser name must be unique");

		var token = GenerateToken();
		var tokenHash = SecurityHelper.HashToken(token);

		await repo.CreateAsync(new ParserUserConfig {
			UserId = userId,
			ParserName = dto.ParserName,
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
			ParserName = config.ParserName,
			UserId = config.UserId,
			Options = config.Internal.Options,
			CorrelationId = Guid.GenCorrelationId(),
		};

		await dispatcher.DispatchAsync(command);
		return new RunParserResult { CorrelationId = command.CorrelationId.Value };
	}

	private static string GenerateToken() {
		return Guid.NewGuid().ToString("N");
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
					ParserName = config.ParserName,
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
					ParserName = config.ParserName,
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