import { useEffect, useState } from 'react';
import {
  analyzeApi,
  type AnalyticsQueryInput,
  type ChartDataPoint,
  type ParserForecastResponse,
  type ParserTrendResponse,
  type ParserVolatilityResponse,
} from '../../api';

interface UseParserAnalyticsDataArgs {
  selectedParserSlug: string | null;
  historyRequest: AnalyticsQueryInput | null;
  insightRequest: AnalyticsQueryInput | null;
  forecastRequest: AnalyticsQueryInput | null;
}

export const useParserAnalyticsData = ({
  selectedParserSlug,
  historyRequest,
  insightRequest,
  forecastRequest,
}: UseParserAnalyticsDataArgs) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [trend, setTrend] = useState<ParserTrendResponse | null>(null);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  const [volatility, setVolatility] = useState<ParserVolatilityResponse | null>(null);
  const [isVolatilityLoading, setIsVolatilityLoading] = useState(false);
  const [volatilityError, setVolatilityError] = useState<string | null>(null);

  const [forecast, setForecast] = useState<ParserForecastResponse | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!selectedParserSlug || !historyRequest) {
      setChartData([]);
      setChartError(null);
      return;
    }

    const fetchHistoryData = async () => {
      setIsChartLoading(true);
      setChartError(null);
      setChartData([]);

      try {
        const data = await analyzeApi.getParserHistory(selectedParserSlug, historyRequest);
        setChartData(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch history data';
        setChartError(message);
        setChartData([]);
      } finally {
        setIsChartLoading(false);
      }
    };

    void fetchHistoryData();
  }, [selectedParserSlug, historyRequest, refreshVersion]);

  useEffect(() => {
    if (!selectedParserSlug || !insightRequest) {
      setTrend(null);
      setTrendError(null);
      return;
    }

    const fetchTrend = async () => {
      setIsTrendLoading(true);
      setTrendError(null);

      try {
        const data = await analyzeApi.getParserTrend(selectedParserSlug, insightRequest);
        setTrend(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch trend';
        setTrendError(message);
        setTrend(null);
      } finally {
        setIsTrendLoading(false);
      }
    };

    void fetchTrend();
  }, [selectedParserSlug, insightRequest, refreshVersion]);

  useEffect(() => {
    if (!selectedParserSlug || !insightRequest) {
      setVolatility(null);
      setVolatilityError(null);
      return;
    }

    const fetchVolatility = async () => {
      setIsVolatilityLoading(true);
      setVolatilityError(null);

      try {
        const data = await analyzeApi.getParserVolatility(selectedParserSlug, insightRequest);
        setVolatility(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch volatility';
        setVolatilityError(message);
        setVolatility(null);
      } finally {
        setIsVolatilityLoading(false);
      }
    };

    void fetchVolatility();
  }, [selectedParserSlug, insightRequest, refreshVersion]);

  useEffect(() => {
    const canFetchForecast = chartData.length > 1;

    if (!selectedParserSlug || !forecastRequest || !canFetchForecast) {
      setForecast(null);
      setForecastError(null);
      return;
    }

    const fetchForecast = async () => {
      setIsForecastLoading(true);
      setForecastError(null);

      try {
        const data = await analyzeApi.getParserForecast(selectedParserSlug, forecastRequest);
        setForecast(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch forecast';
        setForecastError(message);
        setForecast(null);
      } finally {
        setIsForecastLoading(false);
      }
    };

    void fetchForecast();
  }, [selectedParserSlug, forecastRequest, chartData.length, refreshVersion]);

  const refresh = () => {
    setRefreshVersion((prev) => prev + 1);
  };

  const clearChartError = () => setChartError(null);

  return {
    chartData,
    isChartLoading,
    chartError,
    clearChartError,
    trend,
    isTrendLoading,
    trendError,
    volatility,
    isVolatilityLoading,
    volatilityError,
    forecast,
    isForecastLoading,
    forecastError,
    refresh,
  };
};
