import { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { analyzeApi, type ChartDataPoint, type MetricOption, type MetricQueryParams, type TimeInterval, type TimeRange } from '../../api';
import { ParserStatsDisplay } from './ParserStatsDisplay';

interface ParserHistoryChartProps {
  selectedParserSlug: string | null;
}

const normalizeMetricOptions = (options: MetricOption[]): MetricOption[] => {
  const byMetric = new Map<string, Set<string>>();

  options.forEach((option) => {
    const metric = option.metric?.trim();
    if (!metric) {
      return;
    }

    const current = byMetric.get(metric) ?? new Set<string>();
    option.dimensions
      .map((dimension) => dimension.trim())
      .filter(Boolean)
      .forEach((dimension) => current.add(dimension));

    byMetric.set(metric, current);
  });

  return Array.from(byMetric.entries()).map(([metric, dimensions]) => ({
    metric,
    dimensions: Array.from(dimensions),
  }));
};

const areStringArraysEqual = (first: string[], second: string[]) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
};

const areDimensionOptionsEqual = (
  first: Record<string, string[]>,
  second: Record<string, string[]>
) => {
  const firstKeys = Object.keys(first).sort();
  const secondKeys = Object.keys(second).sort();

  if (!areStringArraysEqual(firstKeys, secondKeys)) {
    return false;
  }

  return firstKeys.every((key) => areStringArraysEqual(first[key] ?? [], second[key] ?? []));
};

const toIsoStringOrNull = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

type IntervalSelection = TimeInterval | 'auto';
type PresetRange = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

const getHistoryAutoInterval = (range: PresetRange): TimeInterval | undefined => {
  switch (range) {
    case 'quarter':
      return 'week';
    case 'year':
      return 'month';
    default:
      return undefined;
  }
};

const toRangeParam = (range: PresetRange): TimeRange => {
  switch (range) {
    case 'quarter':
      return 'quarter';
    case 'year':
      return 'year';
    case 'all':
      return 'all';
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'week';
  }
};

const shouldOmitStatsIntervalForPreset = (range: PresetRange): boolean => (
  range === 'quarter' || range === 'year'
);

export const ParserHistoryChart: React.FC<ParserHistoryChartProps> = ({ selectedParserSlug }) => {
  const theme = useTheme();
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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedParserSlug) {
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
      setChartData([]);
      setMetricsError(null);
      setChartError(null);
      return;
    }

    const fetchAvailableMetrics = async () => {
      setSelectedMetric('');
      setSelectedDimensions({});
      setDimensionOptionsByKey({});
      setDimensionOptionsError(null);
      setChartData([]);
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
    };
  }, [rangeMode, timeRange, customFrom, customTo]);

  const historyQueryParams: MetricQueryParams | null = useMemo(() => {
    if (!baseQueryParams) {
      return null;
    }

    const queryWithDimensions: MetricQueryParams = {
      ...baseQueryParams,
      ...dimensionQueryParams,
    };

    if (interval !== 'auto') {
      return { ...queryWithDimensions, interval };
    }

    if (rangeMode === 'preset') {
      const mappedInterval = getHistoryAutoInterval(timeRange);

      if (mappedInterval) {
        return { ...queryWithDimensions, interval: mappedInterval };
      }
    }

    return queryWithDimensions;
  }, [baseQueryParams, dimensionQueryParams, interval, rangeMode, timeRange]);

  const statsQueryParams: MetricQueryParams | null = useMemo(() => {
    if (!baseQueryParams) {
      return null;
    }

    const queryWithDimensions: MetricQueryParams = {
      ...baseQueryParams,
      ...dimensionQueryParams,
    };

    if (interval === 'auto') {
      return queryWithDimensions;
    }

    if (rangeMode === 'preset' && shouldOmitStatsIntervalForPreset(timeRange)) {
      return queryWithDimensions;
    }

    return { ...queryWithDimensions, interval };
  }, [baseQueryParams, dimensionQueryParams, interval, rangeMode, timeRange]);

  useEffect(() => {
    if (!selectedParserSlug || !selectedMetric || !historyQueryParams) {
      setChartData([]);
      return;
    }

    const fetchHistoryData = async () => {
      setIsChartLoading(true);
      setChartError(null);

      try {
        const data = await analyzeApi.getParserHistory(selectedParserSlug, {
          metric: selectedMetric,
          ...historyQueryParams,
        });
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
  }, [selectedParserSlug, selectedMetric, historyQueryParams]);

  const preparedData = useMemo(() => {
    if (chartData.length === 0) {
      return { timestamps: [], values: [] };
    }

    return {
      timestamps: chartData.map((dataPoint) => {
        const date = new Date(dataPoint.timestamp);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }),
      values: chartData.map((dataPoint) => dataPoint.value),
    };
  }, [chartData]);

  const handleRangeModeChange = (mode: 'preset' | 'custom') => {
    setRangeMode(mode);
  };

  const handlePresetRangeChange = (newRange: PresetRange) => {
    setTimeRange(newRange);
  };

  const historyIntervalLabel = useMemo(() => {
    if (interval !== 'auto') {
      return interval;
    }

    if (rangeMode === 'preset') {
      const mapped = getHistoryAutoInterval(timeRange);
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

  const handleRefresh = () => {
    if (!selectedParserSlug || !selectedMetric || !historyQueryParams) {
      return;
    }

    void analyzeApi.getParserHistory(selectedParserSlug, {
      metric: selectedMetric,
      ...historyQueryParams,
    }).then(setChartData).catch((error) => {
      setChartError(error instanceof Error ? error.message : 'Refresh failed');
    });
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

  const getDimensionLabel = (dimensionKey: string) => dimensionKey.replace(/_/g, ' ');

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="Parser Metrics"
        subheader={selectedParserSlug ? `Parser: ${selectedParserSlug}` : 'Choose a parser from Management'}
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isChartLoading || !selectedParserSlug || !selectedMetric || !historyQueryParams}
          >
            Refresh
          </Button>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {!selectedParserSlug && (
            <Alert severity="info">
              Select a parser in Management to load its available metrics.
            </Alert>
          )}

          {selectedParserSlug && (
            <>
              {metricsError && <Alert severity="error">{metricsError}</Alert>}

              {isMetricsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <Stack spacing={2}>
                  {metricOptions.length > 0 ? (
                    <>
                      <FormControl fullWidth size="small">
                        <InputLabel id="metric-select-label">Metric</InputLabel>
                        <Select
                          labelId="metric-select-label"
                          label="Metric"
                          value={selectedMetric}
                          onChange={(event) => {
                            const nextMetric = String(event.target.value);
                            setSelectedMetric(nextMetric);
                            setSelectedDimensions({});
                          }}
                        >
                          {metricOptions.map((option) => (
                            <MenuItem key={option.metric} value={option.metric}>
                              {option.metric}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {selectedMetricOption && selectedDimensionKeys.length > 0 && (
                        <>
                          <Divider />
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              Dimensions
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                              Optional dimension filters. Leave empty to aggregate across all dimension values.
                            </Typography>
                            {dimensionOptionsError && (
                              <Alert severity="warning" sx={{ mb: 1.5 }}>
                                {dimensionOptionsError}
                              </Alert>
                            )}
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 1.5,
                              }}
                            >
                              {selectedDimensionKeys.map((dimensionKey) => (
                                <FormControl key={dimensionKey} fullWidth size="small">
                                  <InputLabel id={`${dimensionKey}-label`}>{getDimensionLabel(dimensionKey)}</InputLabel>
                                  <Select
                                    labelId={`${dimensionKey}-label`}
                                    label={getDimensionLabel(dimensionKey)}
                                    value={selectedDimensions[dimensionKey] ?? ''}
                                    onChange={(event) => handleDimensionChange(dimensionKey, String(event.target.value))}
                                    disabled={isDimensionOptionsLoading && !(dimensionOptionsByKey[dimensionKey]?.length)}
                                  >
                                    <MenuItem value="">
                                      <em>All values</em>
                                    </MenuItem>
                                    {(dimensionOptionsByKey[dimensionKey] ?? []).map((option) => (
                                      <MenuItem key={option} value={option}>
                                        {option}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ))}
                            </Box>
                          </Box>
                        </>
                      )}
                    </>
                  ) : (
                    <Alert severity="warning">No metrics are available for this parser.</Alert>
                  )}
                </Stack>
              )}

              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 1 }}>Range mode</FormLabel>
                <RadioGroup
                  row
                  value={rangeMode}
                  onChange={(event) => handleRangeModeChange(event.target.value as 'preset' | 'custom')}
                  sx={{ mb: 1 }}
                >
                  <FormControlLabel value="preset" control={<Radio size="small" />} label="Preset" />
                  <FormControlLabel value="custom" control={<Radio size="small" />} label="Custom" />
                </RadioGroup>

                {rangeMode === 'preset' ? (
                  <RadioGroup
                    row
                    value={timeRange}
                    onChange={(event) => handlePresetRangeChange(event.target.value as PresetRange)}
                  >
                    <FormControlLabel value="day" control={<Radio size="small" />} label="Last 24h" />
                    <FormControlLabel value="week" control={<Radio size="small" />} label="Last 7 days" />
                    <FormControlLabel value="month" control={<Radio size="small" />} label="Last month" />
                    <FormControlLabel value="quarter" control={<Radio size="small" />} label="Last 3 months" />
                    <FormControlLabel value="year" control={<Radio size="small" />} label="Last year" />
                    <FormControlLabel value="all" control={<Radio size="small" />} label="All time" />
                  </RadioGroup>
                ) : (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <TextField
                        label="From"
                        type="datetime-local"
                        value={customFrom}
                        onChange={(event) => setCustomFrom(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                      <TextField
                        label="To"
                        type="datetime-local"
                        value={customTo}
                        onChange={(event) => setCustomTo(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      These values are converted to ISO 8601 and sent as `from` / `to` without `range`.
                    </Typography>
                  </Stack>
                )}
              </FormControl>

              <FormControl fullWidth size="small">
                <FormLabel sx={{ mb: 1 }}>Aggregation interval</FormLabel>
                <Select
                  value={interval}
                  onChange={(event) => setInterval(event.target.value as IntervalSelection)}
                >
                  <MenuItem value="auto">Auto</MenuItem>
                  <MenuItem value="hour">Hour</MenuItem>
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>

              {selectedMetric ? (
                <Stack spacing={3}>
                  {chartError && <Alert severity="error" onClose={() => setChartError(null)}>{chartError}</Alert>}

                  {rangeMode === 'custom' && !baseQueryParams && (
                    <Alert severity="info">
                      Enter both `from` and `to` values to load custom-range data.
                    </Alert>
                  )}

                  {isChartLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : chartData.length > 0 ? (
                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                      <LineChart
                        xAxis={[
                          {
                            scaleType: 'point',
                            data: preparedData.timestamps,
                          },
                        ]}
                        series={[
                          {
                            data: preparedData.values,
                            label: selectedMetric,
                            color: theme.palette.primary.main,
                          },
                        ]}
                        width={Math.max(600, preparedData.timestamps.length * 60)}
                        height={300}
                        margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                        sx={{
                          '& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabelStyle': {
                            angle: 90,
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    !chartError && (
                      <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                        No data available for the selected period.
                      </Box>
                    )
                  )}

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip size="small" label={`Metric: ${selectedMetric}`} />
                    <Chip size="small" label={rangeMode === 'preset' ? `Range: ${timeRange}` : 'Range: custom'} />
                    <Chip size="small" label={`History interval: ${historyIntervalLabel}`} />
                    <Chip size="small" label={`Stats interval: ${statsIntervalLabel}`} />
                    <Chip size="small" label={`Dimensions: ${Object.keys(dimensionQueryParams).length}`} />
                    {chartData.length > 0 && <Chip size="small" label={`Points: ${chartData.length}`} />}
                  </Stack>

                  <ParserStatsDisplay
                    parserSlug={selectedParserSlug}
                    metric={selectedMetric}
                    queryParams={statsQueryParams}
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
