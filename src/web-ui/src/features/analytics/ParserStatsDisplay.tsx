import { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";
import {
  analyzeApi,
  type MetricQueryParams,
  type ParserMetricStats,
} from "../../api";
import { type PresetRange } from "./analyticsUiHelpers";
import { AIAnalyticsInsight } from "./AIAnalyticsInsight";

interface ParserStatsDisplayProps {
  parserSlug: string | null;
  metric: string | null;
  queryParams: MetricQueryParams | null;
  timeRange?: PresetRange;
}

interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  format?: "number" | "percent" | "default";
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
        const message =
          err instanceof Error ? err.message : "Failed to fetch statistics";
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
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
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

  const isPositiveTrend =
    stats.percentChange === null || stats.percentChange >= 0;

  const formatNumber = (value: number): string => {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  };

  const statItems: StatItem[] = [
    {
      label: "Data Points",
      value: stats.count,
      format: "number",
    },
    {
      label: "Minimum",
      value: formatNumber(stats.min),
      format: "number",
    },
    {
      label: "Maximum",
      value: formatNumber(stats.max),
      format: "number",
    },
    {
      label: "Average",
      value: formatNumber(stats.average),
      format: "number",
    },
    {
      label: "First Value",
      value: formatNumber(stats.firstValue),
      format: "number",
    },
    {
      label: "Last Value",
      value: formatNumber(stats.lastValue),
      format: "number",
    },
  ];

  return (
    <Stack spacing={3}>
      {/* AI Analytics Insight - Prominently placed */}
      {parserSlug && metric && queryParams && (
        <AIAnalyticsInsight
          parserSlug={parserSlug}
          queryParams={{
            metric,
            ...queryParams,
          }}
        />
      )}

      {/* Change Indicator Card */}
      <Card
        sx={{
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.secondary.main}10 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.main}05 0%, ${theme.palette.secondary.main}05 100%)`,
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography
              variant="subtitle2"
              color="text.primary"
              fontWeight={500}
            >
              Shift
            </Typography>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="h3" fontWeight={700} sx={{ lineHeight: 1 }}>
                {stats.percentChange !== null ? (
                  <>
                    {isPositiveTrend ? (
                      <TrendingUpIcon
                        sx={{
                          fontSize: "1.2em",
                          color: "success.main",
                          marginRight: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    ) : (
                      <TrendingDownIcon
                        sx={{
                          fontSize: "1.2em",
                          color: "error.main",
                          marginRight: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                    {isPositiveTrend ? "+" : ""}
                    {stats.percentChange.toFixed(1)}%
                  </>
                ) : (
                  "N/A"
                )}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Last value vs average
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Statistics Grid - 3 columns on desktop, 2 on tablet */}
      <Grid container spacing={2}>
        {statItems.map((item, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                transition: "all 0.2s ease",
                borderRadius: 2,
                "&:hover": {
                  boxShadow: (theme) => theme.shadows[4],
                },
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ lineHeight: 1.2 }}
                  >
                    {item.value}
                  </Typography>
                  {item.unit && (
                    <Typography variant="caption" color="text.secondary">
                      {item.unit}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Linear Forecast Info Box */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Data Range
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {stats.firstTimestamp && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      From
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {new Date(stats.firstTimestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {stats.lastTimestamp && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      To
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {new Date(stats.lastTimestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
