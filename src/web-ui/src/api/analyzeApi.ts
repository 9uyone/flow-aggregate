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

export interface GetParserHistoryParams {
  metric: string;
  range?: TimeRange;
  interval?: TimeInterval;
  from?: string;
  to?: string;
  [dimensionKey: string]: string | undefined;
}

export interface GetParserStatsParams {
  metric: string;
  range?: TimeRange;
  interval?: TimeInterval;
  from?: string;
  to?: string;
  [dimensionKey: string]: string | undefined;
}

export interface GetDimensionOptionsParams {
  metric: string;
  dimension: string;
  [dimensionKey: string]: string | undefined;
}

export type MetricQueryParams = Omit<GetParserHistoryParams, 'metric'>;

const validateMetricQueryParams = (params: GetParserHistoryParams | GetParserStatsParams) => {
  if (!params.metric) {
    throw new Error('Metric parameter is required');
  }

  if (!params.range && (!params.from || !params.to)) {
    throw new Error('Either "range" or both "from" and "to" parameters are required');
  }
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
    validateMetricQueryParams(params);

    const { data } = await axiosInstance.get<ChartDataPoint[]>(
      `/analyze/parsers/${slug}/history`,
      { params }
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
    validateMetricQueryParams(params);

    const { data } = await axiosInstance.get<ParserMetricStats>(
      `/analyze/parsers/${slug}/stats`,
      { params }
    );
    return data;
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
