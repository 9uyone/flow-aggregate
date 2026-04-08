import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  InputAdornment,
  Alert,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { useParserStore } from '../../store/parserStore';
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
  const taskCompletionVersion = useParserStore((state) => state.taskCompletionVersion);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<ParserTaskItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [parserSlugFilter, setParserSlugFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await storageApi.getTasks(page + 1, rowsPerPage, {
        oldFirst: sortOrder === 'oldest',
        status: statusFilter === 'all' ? undefined : statusFilter,
        parserSlug: parserSlugFilter.trim() || undefined,
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
  }, [page, rowsPerPage, statusFilter, parserSlugFilter, fromFilter, toFilter, sortOrder]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks, taskCompletionVersion]);

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
    setSearchQuery('');
    setStatusFilter('all');
    setParserSlugFilter('');
    setFromFilter('');
    setToFilter('');
    setSortOrder('newest');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const bySearch =
        task.correlationId.toLowerCase().includes(searchQuery.toLowerCase());
      return bySearch;
    });
  }, [tasks, searchQuery]);

  const displayedTasks = useMemo(() => {
    return filteredTasks.map((task) => {
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
  }, [filteredTasks, taskStatusesByCorrelationId]);

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
          placeholder="Search by correlation ID..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 300 }}
        />
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
          variant="text"
          onClick={handleClearFilters}
          sx={{ alignSelf: 'center', height: 40 }}
        >
          Clear filters
        </Button>
      </Box>

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
                <TableCell>Correlation ID</TableCell>
                <TableCell align="right">Records</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Finished</TableCell>
                <TableCell>Error</TableCell>
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
                      <Typography variant="body2" fontWeight={500}>
                        {record.parserSlug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          display: 'block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.correlationId}
                      </Typography>
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
    </Box>
  );
};

export default HistoryDataGrid;
