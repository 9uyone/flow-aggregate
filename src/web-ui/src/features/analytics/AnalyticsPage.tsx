import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { RefreshOutlined as RefreshIcon } from "@mui/icons-material";
import {
  analyzeApi,
  type AnalyticsQueryInput,
  type MetricOption,
  type MetricQueryParams,
  type TimeInterval,
} from "../../api";
import { PageSectionHeader } from "../../components/layout";
import { ParserSelector } from "../../components";
import { useParserStore } from "../../store/parserStore";
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
} from "./analyticsUiHelpers";
import { AnalyticsChartSection } from "./AnalyticsChartSection";
import { AnalyticsFiltersPanel } from "./AnalyticsFiltersPanel";
import { AnalyticsInsightsCards } from "./AnalyticsInsightsCards";
import { ParserStatsDisplay } from "./ParserStatsDisplay";
import { useParserAnalyticsData } from "./useParserAnalyticsData";

type IntervalSelection = TimeInterval | "auto";

export const AnalyticsPage: React.FC = () => {
  const { selectedParserSlug, setSelectedParserSlug, parsers } =
    useParserStore();
  const [metricOptions, setMetricOptions] = useState<MetricOption[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("");

  const [selectedDimensions, setSelectedDimensions] = useState<
    Record<string, string>
  >({});
  const [dimensionOptionsByKey, setDimensionOptionsByKey] = useState<
    Record<string, string[]>
  >({});
  const [isDimensionOptionsLoading, setIsDimensionOptionsLoading] =
    useState(false);
  const [dimensionOptionsError, setDimensionOptionsError] = useState<
    string | null
  >(null);

  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [timeRange, setTimeRange] = useState<PresetRange>("week");
  const [interval, setInterval] = useState<IntervalSelection>("auto");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [forecastHorizon, setForecastHorizon] = useState(12);

  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Load available metrics when parser changes
  useEffect(() => {
    if (!selectedParserSlug) {
      setMetricOptions([]);
      setSelectedMetric("");
      setSelectedDimensions({});
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsMetricsLoading(false);
      setMetricsError(null);
      return;
    }

    const fetchAvailableMetrics = async () => {
      setSelectedMetric("");
      setSelectedDimensions({});
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsMetricsLoading(true);
      setMetricsError(null);

      try {
        const options = normalizeMetricOptions(
          await analyzeApi.getAvailableMetrics(selectedParserSlug),
        );
        setMetricOptions(options);
        setSelectedMetric(options[0]?.metric ?? "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load available metrics";
        setMetricsError(message);
        setMetricOptions([]);
        setSelectedMetric("");
      } finally {
        setIsMetricsLoading(false);
      }
    };

    void fetchAvailableMetrics();
  }, [selectedParserSlug]);

  // Load dimension options when metric or dimensions change
  useEffect(() => {
    if (!selectedParserSlug || !selectedMetric) {
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsDimensionOptionsLoading(false);
      return;
    }

    const selectedMetricOption = metricOptions.find(
      (o) => o.metric === selectedMetric,
    );
    const selectedDimensionKeys = selectedMetricOption?.dimensions ?? [];

    if (selectedDimensionKeys.length === 0) {
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setIsDimensionOptionsLoading(false);
      return;
    }

    let isActive = true;

    const fetchDimensionOptions = async () => {
      setIsDimensionOptionsLoading(true);
      setDimensionOptionsError(null);

      const results = await Promise.allSettled(
        selectedDimensionKeys.map(async (dimensionKey) => {
          const filters = Object.fromEntries(
            Object.entries(selectedDimensions).filter(
              ([key, value]) =>
                key !== dimensionKey &&
                selectedDimensionKeys.includes(key) &&
                value.trim() !== "",
            ),
          );

          const values = await analyzeApi.getDimensionOptions(
            selectedParserSlug,
            {
              metric: selectedMetric,
              dimension: dimensionKey,
              ...filters,
            },
          );

          return [
            dimensionKey,
            Array.from(
              new Set(values.map((v) => String(v).trim()).filter(Boolean)),
            ),
          ] as const;
        }),
      );

      if (!isActive) {
        return;
      }

      const nextOptions: Record<string, string[]> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const [dimensionKey, values] = result.value;
          nextOptions[dimensionKey] = values;
        }
      });

      setDimensionOptionsByKey((prev) =>
        areDimensionOptionsEqual(prev, nextOptions) ? prev : nextOptions,
      );

      const firstError = results.find((result) => result.status === "rejected");
      if (firstError && firstError.status === "rejected") {
        const nextError =
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Failed to load dimension options";
        setDimensionOptionsError(nextError);
      } else {
        setDimensionOptionsError(null);
      }

      // Keep valid dimensions
      setSelectedDimensions((prev) => {
        let changed = false;
        const next: Record<string, string> = {};

        selectedDimensionKeys.forEach((dimensionKey) => {
          const currentValue = prev[dimensionKey]?.trim() ?? "";
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
  }, [selectedParserSlug, selectedMetric, metricOptions, selectedDimensions]);

  const selectedMetricOption = useMemo(
    () => metricOptions.find((o) => o.metric === selectedMetric) ?? null,
    [metricOptions, selectedMetric],
  );

  const selectedDimensionKeys = useMemo(
    () => selectedMetricOption?.dimensions ?? [],
    [selectedMetricOption],
  );

  const dimensionQueryParams = useMemo(() => {
    const allowedKeys = new Set(selectedDimensionKeys);
    const entries = Object.entries(selectedDimensions)
      .filter(([key, value]) => allowedKeys.has(key) && value.trim() !== "")
      .map(([key, value]) => [key, value.trim()] as const);

    return Object.fromEntries(entries) as Record<string, string>;
  }, [selectedDimensions, selectedDimensionKeys]);

  const baseQueryParams: MetricQueryParams | null = useMemo(() => {
    if (rangeMode === "preset") {
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
    if (interval !== "auto") {
      return interval;
    }

    if (rangeMode === "preset") {
      return getAutoIntervalForPreset(timeRange);
    }

    return undefined;
  }, [interval, rangeMode, timeRange]);

  const resolvedStatsInterval = useMemo<TimeInterval | undefined>(() => {
    if (interval === "auto") {
      return undefined;
    }

    if (rangeMode === "preset" && shouldOmitStatsIntervalForPreset(timeRange)) {
      return undefined;
    }

    return interval;
  }, [interval, rangeMode, timeRange]);

  const buildMetricRequest = (
    query: MetricQueryParams | null,
    extra?: Pick<AnalyticsQueryInput, "interval" | "horizon">,
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
    () =>
      buildMetricRequest(baseQueryParams, {
        interval: resolvedHistoryInterval,
      }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval],
  );

  const statsRequest = useMemo(
    () =>
      buildMetricRequest(baseQueryParams, { interval: resolvedStatsInterval }),
    [selectedMetric, baseQueryParams, resolvedStatsInterval],
  );

  const insightRequest = useMemo(
    () =>
      buildMetricRequest(baseQueryParams, {
        interval: resolvedHistoryInterval,
      }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval],
  );

  const forecastRequest = useMemo(
    () =>
      buildMetricRequest(baseQueryParams, {
        interval: resolvedHistoryInterval,
        horizon: forecastHorizon,
      }),
    [selectedMetric, baseQueryParams, resolvedHistoryInterval, forecastHorizon],
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

    const allTimestamps = Array.from(
      new Set([...actualByTimestamp.keys(), ...forecastByTimestamp.keys()]),
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return {
      timestamps: allTimestamps,
      actualSeries: allTimestamps.map(
        (ts) => actualByTimestamp.get(ts) ?? null,
      ),
      forecastSeries: allTimestamps.map(
        (ts) => forecastByTimestamp.get(ts) ?? null,
      ),
    };
  }, [chartData, forecast]);

  const historyIntervalLabel = useMemo(() => {
    if (interval !== "auto") {
      return interval;
    }

    if (rangeMode === "preset") {
      const mapped = getAutoIntervalForPreset(timeRange);
      if (mapped) {
        return `auto -> ${mapped}`;
      }
    }

    return "auto (backend)";
  }, [interval, rangeMode, timeRange]);

  const statsIntervalLabel = useMemo(() => {
    if (interval === "auto") {
      return "auto (omitted)";
    }

    if (rangeMode === "preset" && shouldOmitStatsIntervalForPreset(timeRange)) {
      return "omitted for this range";
    }

    return interval;
  }, [interval, rangeMode, timeRange]);

  const trendMeta = trend ? getTrendMeta(trend.direction) : null;
  const trendQuality = trend
    ? Math.max(0, Math.min(100, normalizePercent(trend.r2)))
    : 0;

  const cvPercent = volatility
    ? Math.abs(normalizePercent(volatility.coefficientOfVariation))
    : 0;
  const volatilityMeta = volatility ? getVolatilityMeta(cvPercent) : null;

  const forecastUnavailableReason =
    selectedMetric && !isChartLoading && !chartError && chartData.length === 1
      ? "Forecast unavailable: at least 2 actual points are required."
      : null;

  const isNoDataForSelectedPeriod =
    !isChartLoading && !chartError && mergedChartData.timestamps.length === 0;

  const handleRefresh = useCallback(() => {
    if (!selectedParserSlug || !selectedMetric || !historyRequest) {
      return;
    }
    refresh();
  }, [selectedParserSlug, selectedMetric, historyRequest, refresh]);

  const handleDimensionChange = (dimensionKey: string, value: string) => {
    setSelectedDimensions((prev) => {
      if (value.trim() === "") {
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

  const handleMetricChange = (value: string) => {
    setSelectedMetric(value);
    setSelectedDimensions({});
  };

  return (
    <Box>
      <PageSectionHeader
        title="Analytics"
        description="Explore parser metrics, trends, and forecasts"
      />

      <Card
        sx={{
          mb: 3,
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: (theme) => theme.shadows[2],
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Parser Selection
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={
                  isChartLoading ||
                  !selectedParserSlug ||
                  !selectedMetric ||
                  !historyRequest
                }
              >
                Refresh
              </Button>
            </Box>
            <ParserSelector
              parsers={parsers}
              selectedParserSlug={selectedParserSlug}
              onChange={setSelectedParserSlug}
              label="Parser for analytics"
              helperText="Selection is shared across all pages"
            />
          </Stack>
        </CardContent>
      </Card>

      {!selectedParserSlug ? (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Select a parser to explore metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Once selected, you can review trends, forecasts, and detailed
              statistics here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          <AnalyticsFiltersPanel
            metricOptions={metricOptions}
            selectedMetric={selectedMetric}
            onMetricChange={handleMetricChange}
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
              {rangeMode === "custom" && !baseQueryParams && (
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

              {!isNoDataForSelectedPeriod && (
                <>
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

                  <Box sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <ParserStatsDisplay
                      parserSlug={selectedParserSlug}
                      metric={selectedMetric}
                      queryParams={statsRequest}
                      timeRange={timeRange}
                    />
                  </Box>
                </>
              )}
            </Stack>
          ) : (
            <Alert severity="info">
              Choose a metric to load history and statistics.
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
};
