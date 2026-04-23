import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { ParserForecastResponse } from '../../api';

interface AnalyticsChartSectionProps {
  selectedMetric: string;
  chartError: string | null;
  onDismissChartError: () => void;
  isChartLoading: boolean;
  chartTimestamps: string[];
  actualSeries: Array<number | null>;
  forecastSeries: Array<number | null>;
  forecastError: string | null;
  forecastUnavailableReason: string | null;
  isForecastLoading: boolean;
  forecast: ParserForecastResponse | null;
  rangeMode: 'preset' | 'custom';
  timeRangeLabel: string;
  historyIntervalLabel: string;
  statsIntervalLabel: string;
  dimensionsCount: number;
  actualPointsCount: number;
}

export const AnalyticsChartSection: React.FC<AnalyticsChartSectionProps> = ({
  selectedMetric,
  chartError,
  onDismissChartError,
  isChartLoading,
  chartTimestamps,
  actualSeries,
  forecastSeries,
  forecastError,
  forecastUnavailableReason,
  isForecastLoading,
  forecast,
  rangeMode,
  timeRangeLabel,
  historyIntervalLabel,
  statsIntervalLabel,
  dimensionsCount,
  actualPointsCount,
}) => {
  const theme = useTheme();
  const rightHoverBuffer = 84;
  const hasMultipleYears = new Set(
    chartTimestamps.map((timestamp) => new Date(timestamp).getFullYear())
  ).size > 1;

  return (
    <Stack spacing={3}>
      {chartError && <Alert severity="error" onClose={onDismissChartError}>{chartError}</Alert>}

      {isChartLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : chartTimestamps.length > 0 ? (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <LineChart
            xAxis={[
              {
                scaleType: 'point',
                data: chartTimestamps,
                valueFormatter: (value: string) => {
                  const date = new Date(value);
                  return date.toLocaleString('en-GB', {
                    year: hasMultipleYears ? 'numeric' : undefined,
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                },
              },
            ]}
            series={[
              {
                id: 'actual',
                data: actualSeries,
                label: 'Actual',
                color: theme.palette.primary.main,
              },
              {
                id: 'forecast',
                data: forecastSeries,
                label: 'Forecast',
                color: theme.palette.warning.main,
                showMark: true,
              },
            ]}
            width={Math.max(680, chartTimestamps.length * 62 + rightHoverBuffer)}
            height={320}
            margin={{ top: 10, right: 56, bottom: 50, left: 60 }}
            sx={{
              '& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabelStyle': {
                angle: 90,
              },
              '& .MuiLineElement-series-forecast': {
                strokeDasharray: '8 5',
                strokeWidth: 2,
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

      {forecastError && <Alert severity="error">{forecastError}</Alert>}
      {forecastUnavailableReason && !forecastError && (
        <Alert severity="info">{forecastUnavailableReason}</Alert>
      )}

      {isForecastLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading forecast...</Typography>
        </Box>
      )}

      {forecast?.note && (
        <Alert severity="info">{forecast.note}</Alert>
      )}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip size="small" label={`Metric: ${selectedMetric}`} />
        <Chip size="small" label={rangeMode === 'preset' ? `Range: ${timeRangeLabel}` : 'Range: custom'} />
        <Chip size="small" label={`History interval: ${historyIntervalLabel}`} />
        <Chip size="small" label={`Stats interval: ${statsIntervalLabel}`} />
        <Chip size="small" label={`Dimensions: ${dimensionsCount}`} />
        {actualPointsCount > 0 && <Chip size="small" label={`Actual points: ${actualPointsCount}`} />}
        {forecast?.points.length ? <Chip size="small" label={`Forecast points: ${forecast.points.length}`} /> : null}
        <Chip
          size="small"
          variant="outlined"
          label="Legend: Actual"
          sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
        />
        <Chip
          size="small"
          variant="outlined"
          label="Legend: Forecast"
          sx={{ borderStyle: 'dashed', borderColor: theme.palette.warning.main, color: theme.palette.warning.main }}
        />
      </Stack>
    </Stack>
  );
};
