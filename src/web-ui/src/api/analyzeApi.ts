import axiosInstance from './axiosInstance';

export interface ChartDataPoint {
  timestamp: string;
  value: number;
}

export interface ParserMetricStats {
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
  q1: number;
  q3: number;
  firstValue: number;
  lastValue: number;
  delta: number;
  percentChange: number | null;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}

export interface MetricOption {
  metric: string;
  dimensions: string[];
}

export interface ParserTrendResponse {
  slope: number;
  r2: number;
  direction: 'up' | 'down' | 'flat';
  pointsCount: number;
}

export interface ParserVolatilityResponse {
  stdDev: number;
  coefficientOfVariation: number;
  mean: number;
  min: number;
  max: number;
}

export interface ForecastPoint {
  timestamp: string;
  value: number;
}

export interface ParserForecastResponse {
  points: ForecastPoint[];
  note: string | null;
}

export type ParserAiSummaryResponse = string | null;

export type AvailableMetricsResponse = MetricOption[];

export type TimeRange =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | '3m'
  | '3-month'
  | '3 months'
  | 'year'
  | '1y'
  | 'all'
  | 'all-time'
  | 'all time';
export type TimeInterval = 'hour' | 'day' | 'week' | 'month';

export interface AnalyticsQueryInput {
  metric: string;
  range?: TimeRange;
  interval?: TimeInterval;
  from?: string;
  to?: string;
  dimensions?: Record<string, string>;
  horizon?: number;
}

export type GetParserHistoryParams = AnalyticsQueryInput;
export type GetParserStatsParams = AnalyticsQueryInput;
export type GetParserTrendParams = AnalyticsQueryInput;
export type GetParserVolatilityParams = AnalyticsQueryInput;
export type GetParserForecastParams = AnalyticsQueryInput;
export type GetParserAiSummaryParams = AnalyticsQueryInput;

export interface GetDimensionOptionsParams {
  metric: string;
  dimension: string;
  [dimensionKey: string]: string | undefined;
}

export type MetricQueryParams = Omit<AnalyticsQueryInput, 'metric' | 'horizon'>;

const validateMetricQueryParams = (params: AnalyticsQueryInput) => {
  if (!params.metric) {
    throw new Error('Metric parameter is required');
  }

  if (!params.range && (!params.from || !params.to)) {
    throw new Error('Either "range" or both "from" and "to" parameters are required');
  }
};

const buildAnalyticsQueryParams = (
  params: AnalyticsQueryInput,
  options?: {
    includeHorizon?: boolean;
    defaultHorizon?: number;
  }
) => {
  validateMetricQueryParams(params);

  const dimensions = params.dimensions ?? {};
  const normalizedDimensions = Object.fromEntries(
    Object.entries(dimensions)
      .filter(([key, value]) => key.trim().length > 0 && value.trim().length > 0)
      .map(([key, value]) => [key.trim(), value.trim()])
  );

  const query: Record<string, string | number | undefined> = {
    metric: params.metric,
    range: params.range,
    from: params.from,
    to: params.to,
    interval: params.interval,
    ...normalizedDimensions,
  };

  if (options?.includeHorizon) {
    query.horizon = params.horizon ?? options.defaultHorizon ?? 12;
  }

  return query;
};

/**
 * Analyze API service for parser metrics and charts
 */
export const analyzeApi = {
  /**
   * Get parser metrics with supported dimension keys for each metric.
   */
  getAvailableMetrics: async (slug: string): Promise<AvailableMetricsResponse> => {
    const { data } = await axiosInstance.get<AvailableMetricsResponse>(
      `/analyze/parsers/${slug}/available-metrics`
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => item && typeof item.metric === 'string')
      .map((item) => ({
        metric: String(item.metric),
        dimensions: Array.isArray(item.dimensions) ? item.dimensions.map(String) : [],
      }));
  },

  /**
   * Get parser metric history for charts
   * @param slug - Parser slug identifier
   * @param params - Query parameters (metric required)
   * @returns Array of timestamped metric values
   */
  getParserHistory: async (
    slug: string,
    params: GetParserHistoryParams
  ): Promise<ChartDataPoint[]> => {
    const queryParams = buildAnalyticsQueryParams(params);

    const { data } = await axiosInstance.get<ChartDataPoint[]>(
      `/analyze/parsers/${slug}/history`,
      { params: queryParams }
    );
    return data;
  },

  /**
   * Get parser metric statistics (summary stats)
   * @param slug - Parser slug identifier
   * @param params - Query parameters (metric required)
   * @returns Aggregated statistics for the metric
   */
  getParserStats: async (
    slug: string,
    params: GetParserStatsParams
  ): Promise<ParserMetricStats> => {
    const queryParams = buildAnalyticsQueryParams(params);

    const { data } = await axiosInstance.get<ParserMetricStats>(
      `/analyze/parsers/${slug}/stats`,
      { params: queryParams }
    );
    return data;
  },

  /**
   * Get trend diagnostics for selected metric and filters.
   */
  getParserTrend: async (
    slug: string,
    params: GetParserTrendParams
  ): Promise<ParserTrendResponse> => {
    const queryParams = buildAnalyticsQueryParams(params);

    const { data } = await axiosInstance.get<ParserTrendResponse>(
      `/analyze/parsers/${slug}/trend`,
      { params: queryParams }
    );
    return data;
  },

  /**
   * Get volatility diagnostics for selected metric and filters.
   */
  getParserVolatility: async (
    slug: string,
    params: GetParserVolatilityParams
  ): Promise<ParserVolatilityResponse> => {
    const queryParams = buildAnalyticsQueryParams(params);

    const { data } = await axiosInstance.get<ParserVolatilityResponse>(
      `/analyze/parsers/${slug}/volatility`,
      { params: queryParams }
    );
    return data;
  },

  /**
   * Get short-term forecast points for selected metric and filters.
   */
  getParserForecast: async (
    slug: string,
    params: GetParserForecastParams
  ): Promise<ParserForecastResponse> => {
    const queryParams = buildAnalyticsQueryParams(params, {
      includeHorizon: true,
      defaultHorizon: 12,
    });

    const { data } = await axiosInstance.get<ParserForecastResponse>(
      `/analyze/parsers/${slug}/forecast`,
      { params: queryParams }
    );

    const points = Array.isArray(data?.points)
      ? data.points
        .filter((point) => point && typeof point.timestamp === 'string' && typeof point.value === 'number')
        .map((point) => ({ timestamp: point.timestamp, value: point.value }))
      : [];

    return {
      points,
      note: typeof data?.note === 'string' ? data.note : null,
    };
  },

  /**
   * Get AI-generated analytics summary for selected metric and filters.
   */
  getParserAiSummary: async (
    slug: string,
    params: GetParserAiSummaryParams
  ): Promise<ParserAiSummaryResponse> => {
    const queryParams = buildAnalyticsQueryParams(params, {
      includeHorizon: true,
      defaultHorizon: 12,
    });

    const { data } = await axiosInstance.get<string>(
      `/analyze/parsers/${slug}/ai-summary`,
      { params: queryParams }
    );

    return typeof data === 'string' && data.trim().length > 0 ? data.trim() : null;
  },

  /**
   * Get available values for a specific dimension of a metric.
   * Additional selected dimensions are sent as filters.
   */
  getDimensionOptions: async (
    slug: string,
    params: GetDimensionOptionsParams
  ): Promise<string[]> => {
    if (!params.metric) {
      throw new Error('Metric parameter is required');
    }

    if (!params.dimension) {
      throw new Error('Dimension parameter is required');
    }

    const { data } = await axiosInstance.get<string[]>(
      `/analyze/parsers/${slug}/dimension-options`,
      { params }
    );

    return Array.isArray(data) ? data.map(String) : [];
  },
};
