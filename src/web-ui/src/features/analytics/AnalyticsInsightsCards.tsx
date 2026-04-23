import { Alert, Box, Card, CardContent, CardHeader, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import type { ParserTrendResponse, ParserVolatilityResponse } from '../../api';
import { formatNumber } from './analyticsUiHelpers';

interface AnalyticsInsightsCardsProps {
  trend: ParserTrendResponse | null;
  trendMeta: { label: string; text: string; color: 'success' | 'error' | 'default' } | null;
  trendQuality: number;
  isTrendLoading: boolean;
  trendError: string | null;
  volatility: ParserVolatilityResponse | null;
  volatilityMeta: { label: string; text: string; color: 'success' | 'warning' | 'error' } | null;
  cvPercent: number;
  isVolatilityLoading: boolean;
  volatilityError: string | null;
}

export const AnalyticsInsightsCards: React.FC<AnalyticsInsightsCardsProps> = ({
  trend,
  trendMeta,
  trendQuality,
  isTrendLoading,
  trendError,
  volatility,
  volatilityMeta,
  cvPercent,
  isVolatilityLoading,
  volatilityError,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardHeader title="Trend" subheader="/trend" sx={{ px: 3, pt: 3, pb: 1.5 }} />
          <CardContent sx={{ p: 3, pt: 1.5, '&:last-child': { pb: 3 } }}>
            {isTrendLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={26} />
              </Box>
            ) : trendError ? (
              <Alert severity="error">{trendError}</Alert>
            ) : trend && trendMeta ? (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Chip label={trendMeta.label} color={trendMeta.color} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {trendMeta.text}
                  </Typography>
                </Stack>
                <Typography variant="body2">slope: {formatNumber(trend.slope, 4)}</Typography>
                <Typography variant="body2">Trend quality: {trendQuality.toFixed(1)}%</Typography>
                <Typography variant="body2">pointsCount: {trend.pointsCount}</Typography>
              </Stack>
            ) : (
              <Alert severity="info">No trend data.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardHeader title="Volatility" subheader="/volatility" sx={{ px: 3, pt: 3, pb: 1.5 }} />
          <CardContent sx={{ p: 3, pt: 1.5, '&:last-child': { pb: 3 } }}>
            {isVolatilityLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={26} />
              </Box>
            ) : volatilityError ? (
              <Alert severity="error">{volatilityError}</Alert>
            ) : volatility && volatilityMeta ? (
              <Stack spacing={1.5}>
                <Chip label={volatilityMeta.label} color={volatilityMeta.color} size="small" />
                <Typography variant="body2" color="text.secondary">
                  {volatilityMeta.text}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={`mean: ${formatNumber(volatility.mean)}`} />
                  <Chip size="small" label={`min: ${formatNumber(volatility.min)}`} />
                  <Chip size="small" label={`max: ${formatNumber(volatility.max)}`} />
                </Stack>
                <Typography variant="body2">stdDev: {formatNumber(volatility.stdDev)}</Typography>
                <Typography variant="body2">CV: {cvPercent.toFixed(2)}%</Typography>
              </Stack>
            ) : (
              <Alert severity="info">No volatility data.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
