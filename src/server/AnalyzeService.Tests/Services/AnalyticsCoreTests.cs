using AnalyzeService.Contracts;
using AnalyzeService.Interfaces;
using AnalyzeService.Services;
using Common.Interfaces.Parser;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Xunit;

namespace AnalyzeService.Tests.Services;

public sealed class AnalyticsCoreTests {
	[Fact]
	public async Task GetTrendAsync_Should_Calculate_Ols_R2_And_Momentum_For_Valid_TimeSeries() {
		// Arrange
		var points = CreatePoints(10, 20, 30, 40);
		var historyService = new FakeHistoryQueryService(points);
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetTrendAsync(request);

		// Assert
		result.Slope.Should().BeApproximately(10d, 0.0001);
		result.Intercept.Should().BeApproximately(10d, 0.0001);
		result.R2.Should().BeApproximately(1d, 0.0001);
		result.Direction.Should().Be("up");
		result.Momentum.Should().BeApproximately(0d, 0.0001);
		result.MomentumDirection.Should().Be("Stable");
		result.PointsCount.Should().Be(4);
	}

	[Fact]
	public async Task GetVolatilityAsync_Should_Calculate_Mean_StdDev_And_Cv_For_Valid_TimeSeries() {
		// Arrange
		var points = CreatePoints(10, 20, 30, 40);
		var historyService = new FakeHistoryQueryService(points);
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetVolatilityAsync(request);

		// Assert
		result.Mean.Should().BeApproximately(25d, 0.0001);
		result.StdDev.Should().BeApproximately(11.1803398875d, 0.0001);
		result.CoefficientOfVariation.Should().BeApproximately(44.72135955d, 0.0001);
		result.Min.Should().Be(10d);
		result.Max.Should().Be(40d);
		result.PointsCount.Should().Be(4);
	}

	[Fact]
	public async Task GetStatsAsync_Should_Calculate_Median_Q1_And_Q3_For_Valid_TimeSeries() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(10, 20, 30, 40));
		var cache = CreateAnalyticsCache();
		var httpClient = new FakeHttpRestClient(new StorageStatsDto(
			Count: 4,
			Min: 10,
			Max: 40,
			Average: 25,
			FirstValue: 10,
			LastValue: 40,
			FirstTimestamp: "2026-01-01T00:00:00.0000000Z",
			LastTimestamp: "2026-01-04T00:00:00.0000000Z"));
		var sut = new AnalyticsStatsService(httpClient, cache, historyService);
		var request = CreateRequest();

		// Act
		var result = await sut.GetStatsAsync(request);

		// Assert
		result.Count.Should().Be(4);
		result.Average.Should().Be(25);
		result.Median.Should().BeApproximately(25d, 0.0001);
		result.Q1.Should().BeApproximately(17.5d, 0.0001);
		result.Q3.Should().BeApproximately(32.5d, 0.0001);
		result.Delta.Should().BeApproximately(15d, 0.0001);
		result.PercentChange.Should().BeApproximately(60d, 0.0001);
	}

	[Fact]
	public async Task GetTrendAsync_Should_Return_Defaults_For_Empty_TimeSeries() {
		// Arrange
		var historyService = new FakeHistoryQueryService(Array.Empty<HistoryPointDto>());
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetTrendAsync(request);

		// Assert
		result.Slope.Should().Be(0);
		result.Intercept.Should().Be(0);
		result.R2.Should().Be(0);
		result.Direction.Should().Be("flat");
		result.Momentum.Should().Be(0);
		result.MomentumDirection.Should().Be("Stable");
		result.PointsCount.Should().Be(0);
	}

	[Fact]
	public async Task GetVolatilityAsync_Should_Return_Defaults_For_Empty_TimeSeries() {
		// Arrange
		var historyService = new FakeHistoryQueryService(Array.Empty<HistoryPointDto>());
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetVolatilityAsync(request);

		// Assert
		result.Mean.Should().Be(0);
		result.StdDev.Should().Be(0);
		result.CoefficientOfVariation.Should().Be(0);
		result.Min.Should().Be(0);
		result.Max.Should().Be(0);
		result.PointsCount.Should().Be(0);
	}

	[Fact]
	public async Task GetStatsAsync_Should_Return_Defaults_When_Storage_And_History_Are_Empty() {
		// Arrange
		var historyService = new FakeHistoryQueryService(Array.Empty<HistoryPointDto>());
		var cache = CreateAnalyticsCache();
		var httpClient = new FakeHttpRestClient(response: null);
		var sut = new AnalyticsStatsService(httpClient, cache, historyService);
		var request = CreateRequest();

		// Act
		var result = await sut.GetStatsAsync(request);

		// Assert
		result.Count.Should().Be(0);
		result.Min.Should().Be(0);
		result.Max.Should().Be(0);
		result.Average.Should().Be(0);
		result.Median.Should().Be(0);
		result.Q1.Should().Be(0);
		result.Q3.Should().Be(0);
		result.FirstValue.Should().Be(0);
		result.LastValue.Should().Be(0);
		result.Delta.Should().Be(0);
		result.PercentChange.Should().BeNull();
	}

	[Fact]
	public async Task GetTrendAsync_Should_Handle_Single_Point_TimeSeries() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(42));
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetTrendAsync(request);

		// Assert
		result.Slope.Should().Be(0);
		result.Intercept.Should().Be(42);
		result.R2.Should().Be(1);
		result.Direction.Should().Be("flat");
		result.Momentum.Should().Be(0);
		result.MomentumDirection.Should().Be("Stable");
		result.PointsCount.Should().Be(1);
	}

	[Fact]
	public async Task GetVolatilityAsync_Should_Handle_Single_Point_TimeSeries() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(42));
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var result = await sut.GetVolatilityAsync(request);

		// Assert
		result.Mean.Should().Be(42);
		result.StdDev.Should().Be(0);
		result.CoefficientOfVariation.Should().Be(0);
		result.Min.Should().Be(42);
		result.Max.Should().Be(42);
		result.PointsCount.Should().Be(1);
	}

	[Fact]
	public async Task GetVolatilityAsync_Should_Not_Throw_When_All_Values_Are_Equal() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(5, 5, 5, 5));
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var request = CreateRequest();

		// Act
		var act = async () => await sut.GetVolatilityAsync(request);

		// Assert
		await act.Should().NotThrowAsync();
		var result = await act();
		result.StdDev.Should().Be(0);
		result.CoefficientOfVariation.Should().Be(0);
		result.Mean.Should().Be(5);
	}

	[Fact]
	public async Task GetAIAnalyticsSummary_Should_Set_IsAnomaly_True_When_Last_Value_Is_Far_From_Baseline() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(10, 20, 30));
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var input = new AiAnalyticsSummaryInput(
			new AnalyticsStatsDto(
				Count: 4,
				Min: 8,
				Max: 100,
				Average: 10,
				Median: 10,
				Q1: 9,
				Q3: 11,
				FirstValue: 9,
				LastValue: 100,
				Delta: 90,
				PercentChange: 900,
				FirstTimestamp: "2026-01-01T00:00:00.0000000Z",
				LastTimestamp: "2026-01-04T00:00:00.0000000Z"),
			new TrendResultDto(1, 0, 0.95, "up", 0.5, "Accelerating", 4),
			new VolatilityResultDto(10, 5, 50, 8, 100, 4),
			new ForecastResultDto(3, "day", Array.Empty<ForecastPointDto>(), "none"),
			new AiParserContext("temperature", "weather-parser", "Weather Parser", "Tracks weather"),
			new AiCacheContext(1, 1, 50));

		// Act
		var summary = await sut.GetAIAnalyticsSummary(input);

		// Assert
		summary.Should().Be("AI summary");
		aiClient.LastUserMessage.Should().Contain("stats.isAnomaly=true");
	}

	[Fact]
	public async Task GetAIAnalyticsSummary_Should_Set_IsAnomaly_False_When_Last_Value_Is_Within_Three_Sigma() {
		// Arrange
		var historyService = new FakeHistoryQueryService(CreatePoints(10, 20, 30));
		var aiClient = new CapturingAiModelClient();
		var sut = new AdvancedAnalyticsService(historyService, aiClient);
		var input = new AiAnalyticsSummaryInput(
			new AnalyticsStatsDto(
				Count: 4,
				Min: 8,
				Max: 24,
				Average: 10,
				Median: 10,
				Q1: 9,
				Q3: 11,
				FirstValue: 9,
				LastValue: 24,
				Delta: 14,
				PercentChange: 140,
				FirstTimestamp: "2026-01-01T00:00:00.0000000Z",
				LastTimestamp: "2026-01-04T00:00:00.0000000Z"),
			new TrendResultDto(1, 0, 0.95, "up", 0.5, "Accelerating", 4),
			new VolatilityResultDto(10, 5, 50, 8, 24, 4),
			new ForecastResultDto(3, "day", Array.Empty<ForecastPointDto>(), "none"),
			new AiParserContext("temperature", "weather-parser", "Weather Parser", "Tracks weather"),
			new AiCacheContext(1, 1, 50));

		// Act
		var summary = await sut.GetAIAnalyticsSummary(input);

		// Assert
		summary.Should().Be("AI summary");
		aiClient.LastUserMessage.Should().Contain("stats.isAnomaly=false");
	}

	private static HistoryQueryRequest CreateRequest() =>
		new(
			Slug: "demo-parser",
			Metric: "temperature",
			Range: null,
			Interval: "day",
			From: new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
			To: new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc),
			UserId: Guid.NewGuid());

	private static HistoryPointDto[] CreatePoints(params double[] values) =>
		values
			.Select((value, index) => new HistoryPointDto(
				new DateTime(2026, 1, index + 1, 0, 0, 0, DateTimeKind.Utc).ToString("O"),
				value))
			.ToArray();

	private static AnalyticsCache CreateAnalyticsCache() {
		var distributedCache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
		return new AnalyticsCache(distributedCache);
	}

	private sealed class FakeHistoryQueryService(HistoryPointDto[] points) : IHistoryQueryService {
		public Task<HistoryPointDto[]> GetHistoryAsync(HistoryQueryRequest request, CancellationToken cancellationToken = default) =>
			Task.FromResult(points);
	}

	private sealed class FakeHttpRestClient(StorageStatsDto? response) : IHttpRestClient {
		public Task<T?> GetAsync<T>(string url) {
			object? result = response;
			return Task.FromResult((T?)result);
		}
	}

	private sealed class CapturingAiModelClient : IAiModelClient {
		public string? LastUserMessage { get; private set; }

		public Task<string?> GetCompletionAsync(string systemMessage, string userMessage, CancellationToken cancellationToken = default) {
			LastUserMessage = userMessage;
			return Task.FromResult<string?>("AI summary");
		}
	}
}
