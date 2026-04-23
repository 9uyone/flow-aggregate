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
  Chip,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  DataUsage as DataUsageIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  ContentCopy as ContentCopyIcon,
  History as HistoryIcon,
  Dataset as DatasetIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useParserStore } from '../../store/parserStore';
import { storageApi } from '../../api';
import { ParserSelector } from '../../components';
import { PageSectionHeader } from '../../components/layout';
import { CollectedDataPreviewDialog } from '../data';
import { ParserHistoryChart } from './ParserHistoryChart';
import type { ParserTaskItem } from '../../types/storage';

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
  const {
    selectedParserSlug,
    setSelectedParserSlug,
    parsers,
    taskStatusesByCorrelationId,
    taskCompletionVersion,
  } = useParserStore();
  const [recentTasks, setRecentTasks] = useState<ParserTaskItem[]>([]);
  const [recentTasksLoading, setRecentTasksLoading] = useState(false);
  const [isRecentTasksExpanded, setIsRecentTasksExpanded] = useState(false);
  const [previewCorrelationId, setPreviewCorrelationId] = useState<string | null>(null);

  const overallStats = useMemo(() => ({
    totalRecords: 0,
    activeParsers: parsers.filter((parser) => parser.isActive).length,
    successRate: 0,
  }), [parsers]);

  // Fetch recent tasks only when expanded
  useEffect(() => {
    if (!isRecentTasksExpanded) {
      return;
    }

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
  }, [isRecentTasksExpanded, taskCompletionVersion]);

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
      value: overallStats?.totalRecords.toLocaleString() || '0',
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
      id: 'selected-parser',
      title: 'Selected parser',
      value: selectedParserSlug || 'None',
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
              }}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
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

      {/* Parser metrics panel */}
      <Box sx={{ mt: 3 }}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            mb: 2,
          }}
        >
          <ParserSelector
            parsers={parsers}
            selectedParserSlug={selectedParserSlug}
            onChange={setSelectedParserSlug}
            label="Parser for analytics"
            helperText="You can choose parser here or in Management. Selection is shared."
          />
        </Paper>

        <ParserHistoryChart selectedParserSlug={selectedParserSlug} />
      </Box>

      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          mt: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setIsRecentTasksExpanded(!isRecentTasksExpanded)}
        >
          <Box>
            <Typography variant="h6" fontWeight="600">
              Recent tasks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Latest parser execution logs
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsRecentTasksExpanded(!isRecentTasksExpanded);
            }}
          >
            {isRecentTasksExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={isRecentTasksExpanded} sx={{ mt: 2 }}>

        {recentTasksLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isRecentTasksExpanded && recentTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
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
        </Collapse>
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
