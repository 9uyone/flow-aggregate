import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Grid,
  Stack,
  Typography,
  Chip,
  Divider,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { analyzeApi, type MetricQueryParams, type ParserMetricStats } from '../../api';

interface ParserStatsDisplayProps {
  parserSlug: string | null;
  metric: string | null;
  queryParams: MetricQueryParams | null;
}

interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  format?: 'number' | 'percent' | 'default';
  icon?: React.ReactNode;
}

export const ParserStatsDisplay: React.FC<ParserStatsDisplayProps> = ({
  parserSlug,
  metric,
  queryParams,
}) => {
  const theme = useTheme();
  const [stats, setStats] = useState<ParserMetricStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats data
  useEffect(() => {
    if (!parserSlug || !metric || !queryParams) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await analyzeApi.getParserStats(parserSlug, {
          metric,
          ...queryParams,
        });
        setStats(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch statistics';
        setError(message);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStats();
  }, [parserSlug, metric, queryParams]);

  if (!parserSlug || !metric) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info" icon={<InfoIcon />}>
            Select a parser and metric to view statistics
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Metric Statistics" />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Metric Statistics" />
        <CardContent>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const isPositiveTrend = stats.percentChange === null || stats.percentChange >= 0;
  const TrendIcon = isPositiveTrend ? TrendingUpIcon : TrendingDownIcon;

  const formatNumber = (value: number): string => {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  };

  const statItems: StatItem[] = [
    {
      label: 'Data Points',
      value: stats.count,
      format: 'number',
    },
    {
      label: 'Minimum',
      value: formatNumber(stats.min),
      format: 'number',
    },
    {
      label: 'Maximum',
      value: formatNumber(stats.max),
      format: 'number',
    },
    {
      label: 'Average',
      value: formatNumber(stats.average),
      format: 'number',
    },
    {
      label: 'First Value',
      value: formatNumber(stats.firstValue),
      format: 'number',
    },
    {
      label: 'Last Value',
      value: formatNumber(stats.lastValue),
      format: 'number',
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="Metric Statistics" subheader={metric} />
      <CardContent>
        <Stack spacing={2.5}>
          {/* Trend Summary */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 1.5,
              backgroundColor: isPositiveTrend
                ? theme.palette.success.lighter || `${theme.palette.success.main}15`
                : theme.palette.warning.lighter || `${theme.palette.warning.main}15`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: isPositiveTrend
                  ? theme.palette.success.main
                  : theme.palette.warning.main,
                color: 'white',
              }}
            >
              <TrendIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Change
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {stats.percentChange !== null ? (
                  <>
                    {isPositiveTrend ? '+' : ''}
                    {stats.percentChange.toFixed(1)}%
                  </>
                ) : (
                  'N/A'
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatNumber(stats.delta)} ({isPositiveTrend ? 'increase' : 'decrease'})
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                From: {stats.firstValue.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                To: {stats.lastValue.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Statistics Grid */}
          <Grid container spacing={1.5}>
            {statItems.map((item, idx) => (
              <Grid item xs={6} sm={4} key={idx}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: theme.palette.mode === 'light'
                      ? theme.palette.grey[50]
                      : theme.palette.grey[900],
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {item.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {item.value}
                  </Typography>
                  {item.unit && (
                    <Typography variant="caption" color="text.secondary">
                      {item.unit}
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider />

          {/* Timestamp Info */}
          <Box sx={{ p: 1.5, backgroundColor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Data Range
            </Typography>
            <Stack spacing={0.5}>
              {stats.firstTimestamp && (
                <Typography variant="body2">
                  <Box component="span" fontWeight={500}>From:</Box> {new Date(stats.firstTimestamp).toLocaleString()}
                </Typography>
              )}
              {stats.lastTimestamp && (
                <Typography variant="body2">
                  <Box component="span" fontWeight={500}>To:</Box> {new Date(stats.lastTimestamp).toLocaleString()}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
