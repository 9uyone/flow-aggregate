import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  Dataset as DatasetIcon,
  Tune as TuneIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { useParserStore } from '../../store/parserStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CollectedDataPreviewDialog } from '../data/CollectedDataPreviewDialog';
import type { ParserRunStatus, ParserTaskItem } from '../../types/storage';

const getStatusColor = (status: ParserRunStatus) => {
  switch (status) {
    case 'Success':
      return 'success';
    case 'Failed':
      return 'error';
    case 'Running':
      return 'info';
    default:
      return 'default';
  }
};

type StatusFilter = 'all' | ParserRunStatus;

export const HistoryDataGrid: React.FC = () => {
  const taskStatusesByCorrelationId = useParserStore((state) => state.taskStatusesByCorrelationId);
  const parsers = useParserStore((state) => state.parsers);
  const taskCompletionVersion = useParserStore((state) => state.taskCompletionVersion);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [correlationIdFilter, setCorrelationIdFilter] = useState('');
  const [tasks, setTasks] = useState<ParserTaskItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [parserSlugFilter, setParserSlugFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [previewCorrelationId, setPreviewCorrelationId] = useState<string | null>(null);

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
      // Ignore clipboard failures; the value is still visible.
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await storageApi.getTasks(page + 1, rowsPerPage, {
        oldFirst: sortOrder === 'oldest',
        status: statusFilter === 'all' ? undefined : statusFilter,
        parserSlug: parserSlugFilter.trim() || undefined,
        correlationId: correlationIdFilter.trim() || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setTasks(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      setTasks([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, parserSlugFilter, correlationIdFilter, fromFilter, toFilter, sortOrder]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks, taskCompletionVersion]);

  useEffect(() => {
    const correlationIdFromQuery = searchParams.get('correlationId') ?? '';
    if (correlationIdFromQuery !== correlationIdFilter) {
      setPage(0);
      setCorrelationIdFilter(correlationIdFromQuery);
    }
  }, [searchParams, correlationIdFilter]);

  useEffect(() => {
    if (correlationIdFilter) {
      setIsAdvancedFiltersOpen(true);
    }
  }, [correlationIdFilter]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setPage(0);
    setCorrelationIdFilter('');
    setStatusFilter('all');
    setParserSlugFilter('');
    setFromFilter('');
    setToFilter('');
    setSortOrder('newest');
    navigate('/history', { replace: true });
  };

  const displayedTasks = useMemo(() => {
    return tasks.map((task) => {
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
  }, [tasks, taskStatusesByCorrelationId]);

  return (
    <Box>
      <PageSectionHeader
        title="Task history"
        description="Browse and filter execution logs for parser tasks"
        action={(
          <Tooltip title="Refresh">
            <IconButton onClick={() => void fetchTasks()} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      />

      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={1} 
        sx={{ mb: 2, alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, value: StatusFilter | null) => {
            if (value !== null) {
              setStatusFilter(value);
            }
          }}
          size="small"
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          <ToggleButton
            value="all"
            sx={{
              px: { xs: 1, md: 2 },
              py: 0.7,
              flex: { xs: 1, md: 'none' },
              color: 'text.primary',
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'text.primary',
              },
            }}
          >
            All
          </ToggleButton>
          <ToggleButton
            value="Running"
            sx={{
              px: { xs: 1, md: 2 },
              py: 0.7,
              flex: { xs: 1, md: 'none' },
              color: 'info.main',
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'info.main',
              },
            }}
          >
            Running
          </ToggleButton>
          <ToggleButton
            value="Success"
            sx={{
              px: { xs: 1, md: 2 },
              py: 0.7,
              flex: { xs: 1, md: 'none' },
              color: 'success.main',
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'success.main',
              },
            }}
          >
            Success
          </ToggleButton>
          <ToggleButton
            value="Failed"
            sx={{
              px: { xs: 1, md: 2 },
              py: 0.7,
              flex: { xs: 1, md: 'none' },
              color: 'error.main',
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'error.main',
              },
            }}
          >
            Failed
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Separator */}
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          width: '100%', 
          border: `1px solid`,
          borderColor: 'divider',
          my: 0.5
        }} />

        {/* Sort buttons */}
        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={(_, value: 'newest' | 'oldest' | null) => {
            if (value !== null) {
              setPage(0);
              setSortOrder(value);
            }
          }}
          size="small"
          sx={{ ml: { xs: 0, md: 'auto' }, width: { xs: '100%', md: 'auto' } }}
        >
          <ToggleButton
            value="newest"
            sx={{
              px: 1.5,
              py: 0.5,
              fontSize: '0.8rem',
              textTransform: 'none',
              color: 'text.primary',
              flex: { xs: 1, md: 'none' },
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'text.primary',
              },
            }}
          >
            Newest
          </ToggleButton>
          <ToggleButton
            value="oldest"
            sx={{
              px: 1.5,
              py: 0.5,
              fontSize: '0.8rem',
              textTransform: 'none',
              color: 'text.primary',
              flex: { xs: 1, md: 'none' },
              '&.Mui-selected, &.Mui-selected:hover': {
                color: 'text.primary',
              },
            }}
          >
            Oldest
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Search */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Filter by parser slug"
          size="small"
          value={parserSlugFilter}
          onChange={(e) => {
            setPage(0);
            setParserSlugFilter(e.target.value);
          }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="From"
          type="datetime-local"
          size="small"
          value={fromFilter}
          onChange={(e) => {
            setPage(0);
            setFromFilter(e.target.value);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="datetime-local"
          size="small"
          value={toFilter}
          onChange={(e) => {
            setPage(0);
            setToFilter(e.target.value);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
          sx={{ alignSelf: 'center', height: 40, textTransform: 'none' }}
        >
          Advanced filters
        </Button>
        <Button
          variant="text"
          onClick={handleClearFilters}
          sx={{ alignSelf: 'center', height: 40 }}
        >
          Clear filters
        </Button>
      </Box>

      <Collapse in={isAdvancedFiltersOpen}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Filter by correlation ID"
            size="small"
            value={correlationIdFilter}
            onChange={(event) => {
              setPage(0);
              setCorrelationIdFilter(event.target.value);
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>
      </Collapse>

      {/* Data Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        <TableContainer
          sx={{
            maxHeight: { xs: '60vh', sm: 'none' },
            overflowY: { xs: 'auto', sm: 'visible' },
            overflowX: 'auto',
          }}
        >
          <Table
            stickyHeader
            sx={{
              minWidth: 980,
              '& .MuiTableCell-stickyHeader': {
                backgroundColor: 'background.paper',
                zIndex: 2,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Parser</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Records</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Finished</TableCell>
                <TableCell>Error</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedTasks.map((record) => (
                  <TableRow
                    key={record.correlationId}
                    hover
                    sx={{ '&:last-child td': { border: 0 } }}
                  >
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={500}>
                          {parserBySlug.get(record.parserSlug) ?? record.parserSlug}
                        </Typography>
                        {parserBySlug.get(record.parserSlug) && parserBySlug.get(record.parserSlug) !== record.parserSlug && (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            ({record.parserSlug})
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {record.recordsCount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(record.startedAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {record.finishedAt ? new Date(record.finishedAt).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color={record.errorMessage ? 'error.main' : 'text.secondary'}
                      >
                        {record.errorMessage || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Preview collected data">
                          <IconButton
                            size="small"
                            onClick={() => setPreviewCorrelationId(record.correlationId)}
                            aria-label="Preview collected data"
                          >
                            <VisibilityIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy correlation ID">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => void copyToClipboard(record.correlationId)}
                              aria-label="Copy correlation ID"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Open collected data">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/data?correlationId=${encodeURIComponent(record.correlationId)}`)}
                            aria-label="Open collected data"
                          >
                            <DatasetIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              {displayedTasks.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No task logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
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

export default HistoryDataGrid;
