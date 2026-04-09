import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  useTheme,
  Skeleton,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  DataUsage as DataUsageIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as ContentCopyIcon,
  History as HistoryIcon,
  Dataset as DatasetIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';
import { useParserStore } from '../../store/parserStore';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { CollectedDataPreviewDialog } from '../data';
import type { AnalyticsResponse, ParserTaskItem } from '../../types/storage';

// TypeScript Interfaces
interface QuickStat {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { selectedParserSlug, parsers, taskStatusesByCorrelationId, taskCompletionVersion } = useParserStore();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [overallStats, setOverallStats] = useState<{
    totalRecords: number;
    activeParsers: number;
    successRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<ParserTaskItem[]>([]);
  const [recentTasksLoading, setRecentTasksLoading] = useState(false);
  const [previewCorrelationId, setPreviewCorrelationId] = useState<string | null>(null);

  // Fetch overall stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await storageApi.getOverallStats();
        setOverallStats(stats);
      } catch (err) {
        console.error('Error fetching overall stats:', err);
        // Use parsers count as fallback
        setOverallStats({
          totalRecords: 0,
          activeParsers: parsers.filter(p => p.isActive).length,
          successRate: 0,
        });
      }
    };
    fetchStats();
  }, [parsers]);

  // Fetch analytics data when selectedParserSlug changes
  useEffect(() => {
    if (!selectedParserSlug) {
      setAnalyticsData(null);
      return;
    }

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await storageApi.getAnalytics(selectedParserSlug, 7);
        setAnalyticsData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analytics data';
        setError(message);
        console.error('Error fetching analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedParserSlug]);

  useEffect(() => {
    const fetchRecentTasks = async () => {
      setRecentTasksLoading(true);
      try {
        const response = await storageApi.getTasks(1, 5, { oldFirst: false });
        setRecentTasks(response.items);
      } catch (err) {
        console.error('Error fetching recent tasks:', err);
        setRecentTasks([]);
      } finally {
        setRecentTasksLoading(false);
      }
    };

    void fetchRecentTasks();
  }, [taskCompletionVersion]);

  const displayedRecentTasks = recentTasks.map((task) => {
    const liveStatus = taskStatusesByCorrelationId[task.correlationId];
    if (!liveStatus) {
      return task;
    }

    return {
      ...task,
      status: liveStatus.status,
      errorMessage: liveStatus.errorMessage ?? null,
      startedAt: liveStatus.startedAt,
      finishedAt: liveStatus.finishedAt,
      recordsCount: liveStatus.recordsCount,
    };
  });

  const parserBySlug = useMemo(() => {
    return new Map(parsers.map((parser) => [parser.slug, parser.name]));
  }, [parsers]);

  const copyToClipboard = useCallback(async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard failures; the value remains visible.
    }
  }, []);

  const formatParserOptions = useCallback((options?: ParserTaskItem['parserOptions']) => {
    if (!options) {
      return null;
    }

    const entries = Object.entries(options);
    if (entries.length === 0) {
      return null;
    }

    const preview = entries.slice(0, 2).map(([key, value]) => `${key}=${String(value ?? 'null')}`);
    const extra = entries.length - preview.length;
    return `${preview.join(', ')}${extra > 0 ? ` +${extra}` : ''}`;
  }, []);

  // Prepare quick stats cards
  const quickStats: QuickStat[] = [
    {
      id: 'total-records',
      title: 'Total records',
      value: analyticsData?.totalRecords.toLocaleString() || overallStats?.totalRecords.toLocaleString() || '0',
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
    },
    {
      id: 'active-parsers',
      title: 'Active parsers',
      value: overallStats?.activeParsers || parsers.filter(p => p.isActive).length,
      icon: <DataUsageIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
    },
    {
      id: 'average-value',
      title: 'Average value',
      value: analyticsData?.averageValue.toFixed(2) || 'N/A',
      icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.info.main,
    },
    {
      id: 'success-rate',
      title: 'Success rate',
      value: overallStats?.successRate ? `${overallStats.successRate.toFixed(1)}%` : 'N/A',
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
    },
  ];

  // Prepare chart data from backend response
  const chartDates = analyticsData?.dataPoints.map((point) =>
    new Date(point.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  ) || [];
  const chartValues = analyticsData?.dataPoints.map((point) => point.value) || [];

  return (
    <Box>
      <PageSectionHeader
        title="Analytics overview"
        description="Monitor your data parsing platform performance and activity"
      />

      {/* Quick Stats - Top Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {quickStats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.id}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 2,
                boxShadow: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      padding: 1.5,
                      borderRadius: 2,
                      backgroundColor: `${stat.color}15`,
                      color: stat.color,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    {overallStats === null ? (
                      <Skeleton variant="text" width="60%" height={40} />
                    ) : (
                      <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                        {stat.value}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Middle Row - Data Trends and Instructions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Data Trends - Left Side (8 units) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              minHeight: 400,
            }}
          >
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Data trends
              {selectedParserSlug && ` - ${selectedParserSlug}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {selectedParserSlug 
                ? 'Historical data collection over the past 7 days' 
                : 'Select a parser to view its analytics'}
            </Typography>
            
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <CircularProgress size={60} />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : !selectedParserSlug ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 300,
                  color: 'text.secondary'
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" gutterBottom>
                  No parser selected
                </Typography>
                <Typography variant="body2" textAlign="center">
                  Click on a parser card in the Management tab to view its analytics
                </Typography>
              </Box>
            ) : analyticsData && analyticsData.dataPoints.length === 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 300,
                  color: 'text.secondary'
                }}
              >
                <AssessmentIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" gutterBottom>
                  No data available
                </Typography>
                <Typography variant="body2" textAlign="center">
                  This parser hasn't collected any data yet
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 300 }}>
                <LineChart
                  xAxis={[
                    {
                      scaleType: 'point',
                      data: chartDates,
                      label: 'Date',
                    },
                  ]}
                  yAxis={[
                    {
                      label: 'Value',
                    },
                  ]}
                  series={[
                    {
                      data: chartValues,
                      label: 'Collected Values',
                      color: theme.palette.primary.main,
                      curve: 'linear',
                      showMark: true,
                    },
                  ]}
                  height={300}
                  margin={{ left: 70, right: 20, top: 20, bottom: 50 }}
                  grid={{ vertical: true, horizontal: true }}
                  sx={{
                    '& .MuiChartsAxis-line': {
                      stroke: theme.palette.divider,
                    },
                    '& .MuiChartsAxis-tick': {
                      stroke: theme.palette.divider,
                    },
                    '& .MuiChartsAxis-tickLabel': {
                      fill: theme.palette.text.secondary,
                    },
                    '& .MuiChartsLegend-series text': {
                      fill: theme.palette.text.primary,
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Parser Info - Right Side (4 units) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
            }}
          >
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Parser information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Details about selected parser
            </Typography>
            
            {selectedParserSlug ? (
              <Box>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Slug
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {analyticsData?.slug || selectedParserSlug}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total records
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {analyticsData?.totalRecords.toLocaleString() || 'Loading...'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Average value
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {analyticsData?.averageValue.toFixed(2) || 'Loading...'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data points
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {analyticsData?.dataPoints.length || 0} entries
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Alert severity="info">
                Select a parser from the Management tab to see detailed information
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions Section */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Quick actions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your parsers and data collection
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              },
            }}
          >
            Add new parser
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1.5,
              fontWeight: 600,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
              },
            }}
          >
            Run all now
          </Button>
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          mt: 3,
        }}
      >
        <Typography variant="h6" fontWeight="600" gutterBottom>
          Recent tasks
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Latest parser execution logs
        </Typography>

        {recentTasksLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : recentTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No recent tasks yet
          </Typography>
        ) : (
          <Stack spacing={1.25}>
                      {displayedRecentTasks.map((task) => (
              <Box
                key={task.correlationId}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {parserBySlug.get(task.parserSlug) ?? task.parserSlug}
                  </Typography>
                  {parserBySlug.get(task.parserSlug) && parserBySlug.get(task.parserSlug) !== task.parserSlug && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      ({task.parserSlug})
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      display: 'block',
                      maxWidth: { xs: 180, sm: 340 },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.correlationId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(task.startedAt).toLocaleString()}
                    {task.finishedAt ? ` -> ${new Date(task.finishedAt).toLocaleTimeString()}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Records: {task.recordsCount.toLocaleString()}
                  </Typography>
                  {formatParserOptions(task.parserOptions) && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: 'normal' }}>
                      Options: {formatParserOptions(task.parserOptions)}
                    </Typography>
                  )}
                </Box>
                <Stack spacing={1} alignItems="flex-end">
                  <Chip
                    size="small"
                    label={task.status}
                    color={task.status === 'Success' ? 'success' : task.status === 'Failed' ? 'error' : 'info'}
                  />
                  <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Preview collected data">
                      <IconButton
                        size="small"
                        onClick={() => setPreviewCorrelationId(task.correlationId)}
                        aria-label="Preview collected data"
                      >
                        <VisibilityIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open history">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/history?correlationId=${encodeURIComponent(task.correlationId)}`)}
                        aria-label="Open history"
                      >
                        <HistoryIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open data">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/data?correlationId=${encodeURIComponent(task.correlationId)}`)}
                        aria-label="Open data"
                      >
                        <DatasetIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Tooltip title="Copy correlation ID">
                    <IconButton
                      size="small"
                      onClick={() => void copyToClipboard(task.correlationId)}
                      aria-label="Copy correlation ID"
                    >
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <CollectedDataPreviewDialog
        open={previewCorrelationId !== null}
        correlationId={previewCorrelationId}
        onClose={() => setPreviewCorrelationId(null)}
        getParserDisplayName={(slug) => parserBySlug.get(slug) ?? slug}
      />
    </Box>
  );
};
