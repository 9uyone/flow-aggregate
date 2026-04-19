import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { MetricOption, TimeInterval } from '../../api';
import type { PresetRange } from './analyticsUiHelpers';

type IntervalSelection = TimeInterval | 'auto';

interface AnalyticsFiltersPanelProps {
  metricOptions: MetricOption[];
  selectedMetric: string;
  onMetricChange: (value: string) => void;
  selectedDimensionKeys: string[];
  selectedDimensions: Record<string, string>;
  onDimensionChange: (dimensionKey: string, value: string) => void;
  dimensionOptionsByKey: Record<string, string[]>;
  isDimensionOptionsLoading: boolean;
  dimensionOptionsError: string | null;
  rangeMode: 'preset' | 'custom';
  onRangeModeChange: (value: 'preset' | 'custom') => void;
  timeRange: PresetRange;
  onTimeRangeChange: (value: PresetRange) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
  interval: IntervalSelection;
  onIntervalChange: (value: IntervalSelection) => void;
  forecastHorizon: number;
  onForecastHorizonChange: (value: number) => void;
  isMetricsLoading: boolean;
  metricsError: string | null;
}

export const AnalyticsFiltersPanel: React.FC<AnalyticsFiltersPanelProps> = ({
  metricOptions,
  selectedMetric,
  onMetricChange,
  selectedDimensionKeys,
  selectedDimensions,
  onDimensionChange,
  dimensionOptionsByKey,
  isDimensionOptionsLoading,
  dimensionOptionsError,
  rangeMode,
  onRangeModeChange,
  timeRange,
  onTimeRangeChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  interval,
  onIntervalChange,
  forecastHorizon,
  onForecastHorizonChange,
  isMetricsLoading,
  metricsError,
}) => {
  const getDimensionLabel = (dimensionKey: string) => dimensionKey.replace(/_/g, ' ');

  return (
    <Stack spacing={2}>
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
                  onChange={(event) => onMetricChange(String(event.target.value))}
                >
                  {metricOptions.map((option) => (
                    <MenuItem key={option.metric} value={option.metric}>
                      {option.metric}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedDimensionKeys.length > 0 && (
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
                            onChange={(event) => onDimensionChange(dimensionKey, String(event.target.value))}
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
          onChange={(event) => onRangeModeChange(event.target.value as 'preset' | 'custom')}
          sx={{ mb: 1 }}
        >
          <FormControlLabel value="preset" control={<Radio size="small" />} label="Preset" />
          <FormControlLabel value="custom" control={<Radio size="small" />} label="Custom" />
        </RadioGroup>

        {rangeMode === 'preset' ? (
          <RadioGroup
            row
            value={timeRange}
            onChange={(event) => onTimeRangeChange(event.target.value as PresetRange)}
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
                onChange={(event) => onCustomFromChange(event.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="To"
                type="datetime-local"
                value={customTo}
                onChange={(event) => onCustomToChange(event.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              These values are converted to ISO 8601 and sent as from / to without range.
            </Typography>
          </Stack>
        )}
      </FormControl>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <FormLabel sx={{ mb: 1 }}>Aggregation interval</FormLabel>
            <Select
              value={interval}
              onChange={(event) => onIntervalChange(event.target.value as IntervalSelection)}
            >
              <MenuItem value="auto">Auto</MenuItem>
              <MenuItem value="hour">Hour</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="Forecast horizon"
            value={forecastHorizon}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (!Number.isFinite(raw)) {
                onForecastHorizonChange(12);
                return;
              }

              const clamped = Math.max(1, Math.min(60, Math.round(raw)));
              onForecastHorizonChange(clamped);
            }}
            helperText="Number of forecast points (1-60)"
            inputProps={{ min: 1, max: 60 }}
          />
        </Grid>
      </Grid>
    </Stack>
  );
};
