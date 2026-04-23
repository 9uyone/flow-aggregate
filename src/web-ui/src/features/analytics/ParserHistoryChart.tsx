import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';
import {
  analyzeApi,
  type AnalyticsQueryInput,
  type MetricOption,
  type MetricQueryParams,
  type TimeInterval,
} from '../../api';
import { ParserStatsDisplay } from './ParserStatsDisplay';
import {
  type PresetRange,
  areDimensionOptionsEqual,
  getAutoIntervalForPreset,
  getTrendMeta,
  getVolatilityMeta,
  normalizeMetricOptions,
  normalizePercent,
  shouldOmitStatsIntervalForPreset,
  toIsoStringOrNull,
  toRangeParam,
} from './analyticsUiHelpers';
import { AnalyticsInsightsCards } from './AnalyticsInsightsCards';
import { AnalyticsFiltersPanel } from './AnalyticsFiltersPanel';
import { AnalyticsChartSection } from './AnalyticsChartSection';
import { useParserAnalyticsData } from './useParserAnalyticsData';

interface ParserHistoryChartProps {
  selectedParserSlug: string | null;
}

type IntervalSelection = TimeInterval | 'auto';

export const ParserHistoryChart: React.FC<ParserHistoryChartProps> = ({ selectedParserSlug }) => {
  const [metricOptions, setMetricOptions] = useState<MetricOption[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('');

  const [selectedDimensions, setSelectedDimensions] = useState<Record<string, string>>({});
  const [dimensionOptionsByKey, setDimensionOptionsByKey] = useState<Record<string, string[]>>({});
  const [isDimensionOptionsLoading, setIsDimensionOptionsLoading] = useState(false);
  const [dimensionOptionsError, setDimensionOptionsError] = useState<string | null>(null);

  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [timeRange, setTimeRange] = useState<PresetRange>('week');
  const [interval, setInterval] = useState<IntervalSelection>('auto');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [forecastHorizon, setForecastHorizon] = useState(12);

  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedParserSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMetricOptions([]);
      setSelectedMetric('');
      setSelectedDimensions({});
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsDimensionOptionsLoading(false);

      setRangeMode('preset');
      setTimeRange('week');
      setInterval('auto');
      setCustomFrom('');
      setCustomTo('');
      setForecastHorizon(12);

      setMetricsError(null);
      return;
    }

    const fetchAvailableMetrics = async () => {
      setSelectedMetric('');
      setSelectedDimensions({});
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsMetricsLoading(true);
      setMetricsError(null);

      try {
        const options = normalizeMetricOptions(await analyzeApi.getAvailableMetrics(selectedParserSlug));
        setMetricOptions(options);
        setSelectedMetric(options[0]?.metric ?? '');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load available metrics';
        setMetricsError(message);
        setMetricOptions([]);
        setSelectedMetric('');
      } finally {
        setIsMetricsLoading(false);
      }
    };

    void fetchAvailableMetrics();
  }, [selectedParserSlug]);

  const selectedMetricOption = useMemo(
    () => metricOptions.find((option) => option.metric === selectedMetric) ?? null,
    [metricOptions, selectedMetric]
  );

  const selectedDimensionKeys = useMemo(
    () => selectedMetricOption?.dimensions ?? [],
    [selectedMetricOption]
  );

  useEffect(() => {
    if (!selectedParserSlug || !selectedMetricOption) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDimensionOptionsByKey((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setDimensionOptionsError((prev) => (prev === null ? prev : null));
      setIsDimensionOptionsLoading((prev) => (prev ? false : prev));
      return;
    }

    let isActive = true;

    const fetchDimensionOptions = async () => {
      if (selectedDimensionKeys.length === 0) {
        setDimensionOptionsByKey((prev) => (Object.keys(prev).length === 0 ? prev : {}));
        setDimensionOptionsError((prev) => (prev === null ? prev : null));
        setIsDimensionOptionsLoading((prev) => (prev ? false : prev));
        return;
      }

      setIsDimensionOptionsLoading(true);
      setDimensionOptionsError(null);

      const results = await Promise.allSettled(
        selectedDimensionKeys.map(async (dimensionKey) => {
          const filters = Object.fromEntries(
            Object.entries(selectedDimensions).filter(
              ([key, value]) => key !== dimensionKey && selectedDimensionKeys.includes(key) && value.trim() !== ''
            )
          );

          const values = await analyzeApi.getDimensionOptions(selectedParserSlug, {
            metric: selectedMetric,
            dimension: dimensionKey,
            ...filters,
          });

          return [dimensionKey, Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)))] as const;
        })
      );

      if (!isActive) {
        return;
      }

      const nextOptions: Record<string, string[]> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [dimensionKey, values] = result.value;
          nextOptions[dimensionKey] = values;
        }
      });

      setDimensionOptionsByKey((prev) => (areDimensionOptionsEqual(prev, nextOptions) ? prev : nextOptions));

      const firstError = results.find((result) => result.status === 'rejected');
      if (firstError && firstError.status === 'rejected') {
        const nextError = firstError.reason instanceof Error
          ? firstError.reason.message
          : 'Failed to load dimension options';
        setDimensionOptionsError((prev) => (prev === nextError ? prev : nextError));
      } else {
        setDimensionOptionsError((prev) => (prev === null ? prev : null));
      }

      setSelectedDimensions((prev) => {
        let changed = false;
        const next: Record<string, string> = {};

        selectedDimensionKeys.forEach((dimensionKey) => {
          const currentValue = prev[dimensionKey]?.trim() ?? '';
          if (!currentValue) {
            return;
          }

          const availableValues = nextOptions[dimensionKey] ?? [];
          if (availableValues.includes(currentValue)) {
            next[dimensionKey] = currentValue;
            return;
          }

          changed = true;
        });

        return changed ? next : prev;
      });

      setIsDimensionOptionsLoading(false);
    };

    void fetchDimensionOptions();

    return () => {
      isActive = false;
    };
  }, [selectedParserSlug, selectedMetric, selectedMetricOption, selectedDimensionKeys, selectedDimensions]);

  const dimensionQueryParams = useMemo(() => {
    const allowedKeys = new Set(selectedDimensionKeys);
    const entries = Object.entries(selectedDimensions)
      .filter(([key, value]) => allowedKeys.has(key) && value.trim() !== '')
      .map(([key, value]) => [key, value.trim()] as const);

    return Object.fromEntries(entries) as Record<string, string>;
  }, [selectedDimensions, selectedDimensionKeys]);

  const baseQueryParams: MetricQueryParams | null = useMemo(() => {
    if (rangeMode === 'preset') {
      return {
        range: toRangeParam(timeRange),
        dimensions: dimensionQueryParams,
      };
    }

    const from = toIsoStringOrNull(customFrom);
    const to = toIsoStringOrNull(customTo);

    if (!from || !to) {
      return null;
    }

    return {
      from,
      to,
      dimensions: dimensionQueryParams,
    };
  }, [rangeMode, timeRange, customFrom, customTo, dimensionQueryParams]);

  const resolvedHistoryInterval = useMemo<TimeInterval | undefined>(() => {
    if (interval !== 'auto') {
      return interval;
    }

    if (rangeMode === 'preset') {
      return getAutoIntervalForPreset(timeRange);
    }

    return undefined;
  }, [interval, rangeMode, timeRange]);

  const resolvedStatsInterval = useMemo<TimeInterval | undefined>(() => {
    if (interval === 'auto') {
      return undefined;
    }

    if (rangeMode === 'preset' && shouldOmitStatsIntervalForPreset(timeRange)) {
      return undefined;
    }

    return interval;
  }, [interval, rangeMode, timeRange]);

  const buildMetricRequest = (
    query: MetricQueryParams | null,
    extra?: Pick<AnalyticsQueryInput, 'interval' | 'horizon'>
  ): AnalyticsQueryInput | null => {
    if (!selectedMetric || !query) {
      return null;
    }

    return {
      metric: selectedMetric,
      ...query,
      ...extra,
    };
  };

  const historyRequest = useMemo(
    () => buildMetricRequest(baseQueryParams, { interval: resolvedHistoryInterval }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval]
  );

  const statsRequest = useMemo(
    () => buildMetricRequest(baseQueryParams, { interval: resolvedStatsInterval }),
    [selectedMetric, baseQueryParams, resolvedStatsInterval]
  );

  const insightRequest = useMemo(
    () => buildMetricRequest(baseQueryParams, { interval: resolvedHistoryInterval }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval]
  );

  const forecastRequest = useMemo(
    () => buildMetricRequest(baseQueryParams, { interval: resolvedHistoryInterval, horizon: forecastHorizon }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval, forecastHorizon]
  );

  const {
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
  } = useParserAnalyticsData({
    selectedParserSlug,
    historyRequest,
    insightRequest,
    forecastRequest,
  });

  const mergedChartData = useMemo(() => {
    const actualByTimestamp = new Map<string, number>();
    chartData.forEach((point) => {
      actualByTimestamp.set(point.timestamp, point.value);
    });

    const forecastPoints = forecast?.points ?? [];
    const forecastByTimestamp = new Map<string, number>();
    forecastPoints.forEach((point) => {
      forecastByTimestamp.set(point.timestamp, point.value);
    });

    const allTimestamps = Array.from(new Set([
      ...actualByTimestamp.keys(),
      ...forecastByTimestamp.keys(),
    ])).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return {
      timestamps: allTimestamps,
      actualSeries: allTimestamps.map((timestamp) => actualByTimestamp.get(timestamp) ?? null),
      forecastSeries: allTimestamps.map((timestamp) => forecastByTimestamp.get(timestamp) ?? null),
    };
  }, [chartData, forecast]);

  const historyIntervalLabel = useMemo(() => {
    if (interval !== 'auto') {
      return interval;
    }

    if (rangeMode === 'preset') {
      const mapped = getAutoIntervalForPreset(timeRange);
      if (mapped) {
        return `auto -> ${mapped}`;
      }
    }

    return 'auto (backend)';
  }, [interval, rangeMode, timeRange]);

  const statsIntervalLabel = useMemo(() => {
    if (interval === 'auto') {
      return 'auto (omitted)';
    }

    if (rangeMode === 'preset' && shouldOmitStatsIntervalForPreset(timeRange)) {
      return 'omitted for this range';
    }

    return interval;
  }, [interval, rangeMode, timeRange]);

  const trendMeta = trend ? getTrendMeta(trend.direction) : null;
  const trendQuality = trend ? Math.max(0, Math.min(100, normalizePercent(trend.r2))) : 0;

  const cvPercent = volatility ? Math.abs(normalizePercent(volatility.coefficientOfVariation)) : 0;
  const volatilityMeta = volatility ? getVolatilityMeta(cvPercent) : null;

  const forecastUnavailableReason = selectedMetric
    && !isChartLoading
    && !chartError
    && chartData.length === 1
    ? 'Forecast unavailable: at least 2 actual points are required.'
    : null;

  const handleRefresh = () => {
    if (!selectedParserSlug || !selectedMetric || !historyRequest) {
      return;
    }

    refresh();
  };

  const handleDimensionChange = (dimensionKey: string, value: string) => {
    setSelectedDimensions((prev) => {
      if (value.trim() === '') {
        const next = { ...prev };
        delete next[dimensionKey];
        return next;
      }

      return {
        ...prev,
        [dimensionKey]: value,
      };
    });
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6">Parser Metrics</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedParserSlug ? `Parser: ${selectedParserSlug}` : 'Choose a parser from Management'}
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isChartLoading || !selectedParserSlug || !selectedMetric || !historyRequest}
            >
              Refresh
            </Button>
          </Box>

          {!selectedParserSlug && (
            <Alert severity="info">
              Select a parser in Management to load its available metrics.
            </Alert>
          )}

          {selectedParserSlug && (
            <>
              <AnalyticsFiltersPanel
                metricOptions={metricOptions}
                selectedMetric={selectedMetric}
                onMetricChange={(value) => {
                  setSelectedMetric(value);
                  setSelectedDimensions({});
                }}
                selectedDimensionKeys={selectedDimensionKeys}
                selectedDimensions={selectedDimensions}
                onDimensionChange={handleDimensionChange}
                dimensionOptionsByKey={dimensionOptionsByKey}
                isDimensionOptionsLoading={isDimensionOptionsLoading}
                dimensionOptionsError={dimensionOptionsError}
                rangeMode={rangeMode}
                onRangeModeChange={setRangeMode}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                customFrom={customFrom}
                onCustomFromChange={setCustomFrom}
                customTo={customTo}
                onCustomToChange={setCustomTo}
                interval={interval}
                onIntervalChange={setInterval}
                forecastHorizon={forecastHorizon}
                onForecastHorizonChange={setForecastHorizon}
                isMetricsLoading={isMetricsLoading}
                metricsError={metricsError}
              />

              {selectedMetric ? (
                <Stack spacing={3}>
                  {rangeMode === 'custom' && !baseQueryParams && (
                    <Alert severity="info">
                      Enter both from and to values to load custom-range data.
                    </Alert>
                  )}

                  <AnalyticsChartSection
                    selectedMetric={selectedMetric}
                    chartError={chartError}
                    onDismissChartError={clearChartError}
                    isChartLoading={isChartLoading}
                    chartTimestamps={mergedChartData.timestamps}
                    actualSeries={mergedChartData.actualSeries}
                    forecastSeries={mergedChartData.forecastSeries}
                    forecastError={forecastError}
                    forecastUnavailableReason={forecastUnavailableReason}
                    isForecastLoading={isForecastLoading}
                    forecast={forecast}
                    rangeMode={rangeMode}
                    timeRangeLabel={timeRange}
                    historyIntervalLabel={historyIntervalLabel}
                    statsIntervalLabel={statsIntervalLabel}
                    dimensionsCount={Object.keys(dimensionQueryParams).length}
                    actualPointsCount={chartData.length}
                  />

                  <AnalyticsInsightsCards
                    trend={trend}
                    trendMeta={trendMeta}
                    trendQuality={trendQuality}
                    isTrendLoading={isTrendLoading}
                    trendError={trendError}
                    volatility={volatility}
                    volatilityMeta={volatilityMeta}
                    cvPercent={cvPercent}
                    isVolatilityLoading={isVolatilityLoading}
                    volatilityError={volatilityError}
                  />

                  <ParserStatsDisplay
                    parserSlug={selectedParserSlug}
                    metric={selectedMetric}
                    queryParams={statsRequest}
                  />
                </Stack>
              ) : (
                <Alert severity="info">
                  Choose a metric to load history and stats.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
