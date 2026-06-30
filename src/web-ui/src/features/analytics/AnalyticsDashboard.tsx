import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  DataUsage as DataUsageIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Dataset as DatasetIcon,
  AutoAwesomeOutlined as AutoAwesomeOutlinedIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { analyzeApi, storageApi, axiosInstance } from "../../api";
import type { AnalyzeOverviewResponse } from "../../api/analyzeApi";
import { useParserStore } from "../../store/parserStore";
import { PageSectionHeader } from "../../components/layout";
import { CollectedDataPreviewDialog } from "../data";
import type { ParserTaskItem } from "../../types/storage";

// Utility function for relative time formatting
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

// TypeScript Interfaces
interface QuickStat {
  id: string;
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  subtitle: React.ReactNode;
}

const formatNumber = (value: number): string => value.toLocaleString();

const formatPercent = (value: number): string => {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? `${value.toFixed(0)}%` : `${fixed}%`;
};

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    parsers,
    parserConfigs,
    taskStatusesByCorrelationId,
    taskCompletionVersion,
    updateParser,
    updateParserConfigsBySlug,
    addRunningTaskId,
    setTaskSlugForCorrelationId,
  } = useParserStore();
  const [recentTasks, setRecentTasks] = useState<ParserTaskItem[]>([]);
  const [recentTasksLoading, setRecentTasksLoading] = useState(false);
  const [isRecentTasksExpanded, setIsRecentTasksExpanded] = useState(false);
  const [previewCorrelationId, setPreviewCorrelationId] = useState<
    string | null
  >(null);
  const [overviewStats, setOverviewStats] = useState<AnalyzeOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [quickActionsBusy, setQuickActionsBusy] = useState(false);
  const [quickActionsMessage, setQuickActionsMessage] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);

    try {
      const data = await analyzeApi.getOverview();
      setOverviewStats(data);
    } catch (error) {
      console.error("Error fetching overview stats:", error);
      setOverviewStats(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  // Fetch recent tasks only when expanded
  useEffect(() => {
    if (!isRecentTasksExpanded) {
      return;
    }

    const fetchRecentTasks = async () => {
      setRecentTasksLoading(true);
      try {
        const response = await storageApi.getTasks(1, 10, { oldFirst: false });
        setRecentTasks(response.items);
      } catch (err) {
        console.error("Error fetching recent tasks:", err);
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

  const formatParserOptions = useCallback(
    (options?: ParserTaskItem["parserOptions"]) => {
      if (!options) {
        return null;
      }

      const entries = Object.entries(options);
      if (entries.length === 0) {
        return null;
      }

      const preview = entries
        .slice(0, 2)
        .map(([key, value]) => `${key}=${String(value ?? "null")}`);
      const extra = entries.length - preview.length;
      return `${preview.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
    },
    [],
  );

  const parserTypeBreakdown = useMemo(() => {
    const internal = overviewStats?.internalParsers ?? parsers.filter((parser) => parser.sourceType === "internal").length;
    const plugin = overviewStats?.pluginParsers ?? parsers.filter((parser) => parser.sourceType === "plugin").length;
    const external = overviewStats?.externalParsers ?? parsers.filter((parser) => parser.sourceType === "external").length;

    return { internal, plugin, external };
  }, [overviewStats, parsers]);

  const openManagementCreate = useCallback((mode: 'internal' | 'external') => {
    navigate('/management', { state: { openCreate: mode } });
  }, [navigate]);

  const handleRunAllActiveConfigs = useCallback(async () => {
    const activeConfigs = parserConfigs.filter((config) => {
      const parser = parsers.find((item) => item.slug === config.slug);
      return config.isActive && parser?.supportsManualRun;
    });

    if (activeConfigs.length === 0) {
      setQuickActionsMessage('No active configs to run.');
      return;
    }

    setQuickActionsBusy(true);
    setQuickActionsMessage(null);

    let startedCount = 0;
    let failedCount = 0;

    for (const config of activeConfigs) {
      try {
        const response = await storageApi.runConfig(config.configId);
        startedCount += 1;
        updateParser(config.slug, { status: 'Running' });
        updateParserConfigsBySlug(config.slug, { status: 'Running' });
        addRunningTaskId(response.correlationId);
        setTaskSlugForCorrelationId(response.correlationId, config.slug);
      } catch (error) {
        failedCount += 1;
        console.error(`Failed to run config ${config.configId}:`, error);
      }
    }

    if (failedCount === 0) {
      setQuickActionsMessage(`Started ${startedCount} active config${startedCount === 1 ? '' : 's'}.`);
    } else if (startedCount === 0) {
      setQuickActionsMessage('No active configs could be started.');
    } else {
      setQuickActionsMessage(`Started ${startedCount} config${startedCount === 1 ? '' : 's'}, ${failedCount} failed.`);
    }

    setQuickActionsBusy(false);
  }, [
    parserConfigs,
    parsers,
    updateParser,
    updateParserConfigsBySlug,
    addRunningTaskId,
    setTaskSlugForCorrelationId,
  ]);

  const handleSyncScheduler = useCallback(async () => {
    setQuickActionsBusy(true);
    setQuickActionsMessage(null);

    try {
      await axiosInstance.post('/scheduler/sync-parsers');
      setQuickActionsMessage('Scheduler sync triggered.');
    } catch (error) {
      console.error('Failed to trigger scheduler sync:', error);
      setQuickActionsMessage('Scheduler sync failed.');
    } finally {
      setQuickActionsBusy(false);
    }
  }, []);

  const overviewCards: QuickStat[] = [
    {
      id: "total-records",
      title: "Total records",
      value: overviewStats ? formatNumber(overviewStats.totalRecords) : "—",
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      subtitle: overviewStats ? `+${formatNumber(overviewStats.recordsLastDay)} over the last 24 hours` : "Loading data...",
    },
    {
      id: "parsers-catalog",
      title: "Parsers catalog",
      value: overviewStats ? `${formatNumber(parserTypeBreakdown.internal + parserTypeBreakdown.plugin + parserTypeBreakdown.external)} parsers` : "—",
      icon: <DataUsageIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
      subtitle: overviewStats
        ? `Internal ${parserTypeBreakdown.internal} · Plugin ${parserTypeBreakdown.plugin} · External ${parserTypeBreakdown.external}`
        : "Loading data...",
    },
    {
      id: "success-rate",
      title: "Success rate",
      value: overviewStats ? formatPercent(overviewStats.successRateLast100) : "—",
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
      subtitle: overviewStats
        ? `Based on the last ${formatNumber(overviewStats.runsConsidered)} runs`
        : "Loading data...",
    },
    {
      id: "ai-cache-efficiency",
      title: "AI cache efficiency",
      value: overviewStats ? `${formatPercent(overviewStats.aiSummaryCache.hitRate)} cached` : "—",
      icon: <AutoAwesomeOutlinedIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.info.main,
      subtitle: overviewStats
        ? `Saved ${formatNumber(overviewStats.aiSummaryCache.hits)} OpenAI requests`
        : "Loading data...",
    },
  ];

  return (
    <Box>
      <PageSectionHeader
        title="Overview"
        description="Monitor your data parsing platform performance and activity"
        action={
          <Tooltip title="Refresh overview cards">
            <span>
              <IconButton
                size="small"
                onClick={() => void fetchOverview()}
                disabled={overviewLoading}
                aria-label="Refresh overview cards"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        }
      />

      {/* Quick Stats - Top Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {overviewCards.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.id}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      padding: 1.5,
                      borderRadius: 2,
                      backgroundColor: `${stat.color}15`,
                      color: stat.color,
                      alignSelf: "flex-start",
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    {overviewLoading ? (
                      <Skeleton variant="text" width="60%" height={40} />
                    ) : (
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{ mb: 0.5 }}
                      >
                        {stat.value}
                      </Typography>
                    )}
                    <Typography variant="body1" color="text.secondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                      {stat.subtitle}
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
            onClick={() => openManagementCreate('internal')}
            disabled={quickActionsBusy}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
              },
            }}
          >
            New config
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PlayArrowIcon />}
            onClick={() => void handleRunAllActiveConfigs()}
            disabled={quickActionsBusy}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
              },
            }}
          >
            Run all now
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => openManagementCreate('external')}
            disabled={quickActionsBusy}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              fontWeight: 600,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
              },
            }}
          >
            New external
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void handleSyncScheduler()}
            disabled={quickActionsBusy}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              py: 1.5,
              fontWeight: 600,
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
              },
            }}
          >
            Sync scheduler
          </Button>
        </Stack>
        {quickActionsMessage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {quickActionsMessage}
          </Typography>
        )}
      </Paper>

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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
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
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1.25,
                    gap: 2,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                  onClick={() => setPreviewCorrelationId(task.correlationId)}
                >
                  {/* Left: Parser name and compact metadata - CLICKABLE */}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    {/* Parser name */}
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ mb: 0.5 }}
                    >
                      {parserBySlug.get(task.parserSlug) ?? task.parserSlug}
                    </Typography>

                    {/* Compact metadata: Records and Options on separate lines */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {task.recordsCount.toLocaleString()} record
                        {task.recordsCount !== 1 ? "s" : ""}
                      </Typography>
                      {formatParserOptions(task.parserOptions) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {formatParserOptions(task.parserOptions)}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Right: Relative time, Status badge, Navigation icons - NON-CLICKABLE */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Relative time */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {formatRelativeTime(new Date(task.startedAt))}
                    </Typography>

                    {/* Status badge */}
                    <Chip
                      size="small"
                      label={task.status}
                      color={
                        task.status === "Success"
                          ? "success"
                          : task.status === "Failed"
                            ? "error"
                            : "info"
                      }
                      variant="filled"
                    />

                    {/* Navigation icons - visible on hover, muted */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        opacity: 0.6,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <Tooltip title="View in History">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(
                              `/history?correlationId=${encodeURIComponent(task.correlationId)}`,
                            )
                          }
                          aria-label="View in History"
                          sx={{
                            p: 0.5,
                            color: "text.secondary",
                            "&:hover": { opacity: 1, color: "text.primary" },
                          }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="View Data">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(
                              `/data?correlationId=${encodeURIComponent(task.correlationId)}`,
                            )
                          }
                          aria-label="View Data"
                          sx={{
                            p: 0.5,
                            color: "text.secondary",
                            "&:hover": { opacity: 1, color: "text.primary" },
                          }}
                        >
                          <DatasetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
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
