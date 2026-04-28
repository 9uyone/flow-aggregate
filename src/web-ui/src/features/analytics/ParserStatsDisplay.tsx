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
  Divider,
} from '@mui/material';
import {
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
  const hasRequiredInputs = Boolean(parserSlug && metric && queryParams);
  const [stats, setStats] = useState<ParserMetricStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats data
  useEffect(() => {
    if (!hasRequiredInputs || !parserSlug || !metric || !queryParams) {
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
  }, [hasRequiredInputs, parserSlug, metric, queryParams]);

  if (!hasRequiredInputs) {
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
      <CardHeader title="Metric Statistics" subheader={metric} sx={{ px: 3, pt: 3, pb: 1.5 }} />
      <CardContent sx={{ p: 3, pt: 1.5, '&:last-child': { pb: 3 } }}>
        <Stack spacing={3}>
          {/* Trend Summary */}
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              p: 3,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Change
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {stats.percentChange !== null ? (
                  <>
                    {isPositiveTrend ? '+' : ''}
                    {stats.percentChange.toFixed(1)}%
                  </>
                ) : (
                  'N/A'
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatNumber(stats.delta)} ({isPositiveTrend ? 'increase' : 'decrease'})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                From: {stats.firstValue.toFixed(2)}
                {' • '}
                To: {stats.lastValue.toFixed(2)}
              </Typography>
            </Stack>
          </Box>

          <Divider />

          {/* Statistics Grid */}
          <Grid container spacing={3}>
            {statItems.map((item, idx) => (
              <Grid size={{ xs: 6, sm: 4 }} key={idx}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5 }}>
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
          <Box sx={{ p: 3, borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
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
