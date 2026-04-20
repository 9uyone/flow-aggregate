import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { useParserStore } from '../../store/parserStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CollectedDataPreviewDialog } from '../data/CollectedDataPreviewDialog';
import type { ParserTaskItem } from '../../types/storage';
import { HistoryFilters, type HistoryStatusFilter } from './HistoryFilters';
import { HistoryTable } from './HistoryTable';

export const HistoryDataGrid: React.FC = () => {
  const taskStatusesByCorrelationId = useParserStore((state) => state.taskStatusesByCorrelationId);
  const parsers = useParserStore((state) => state.parsers);
  const taskCompletionVersion = useParserStore((state) => state.taskCompletionVersion);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const latestFetchRequestIdRef = useRef(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [correlationIdFilter, setCorrelationIdFilter] = useState(() => searchParams.get('correlationId') ?? '');
  const [tasks, setTasks] = useState<ParserTaskItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [parserSlugFilter, setParserSlugFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [previewCorrelationId, setPreviewCorrelationId] = useState<string | null>(null);

  const parserBySlug = useMemo(() => {
    return new Map(parsers.map((parser) => [parser.slug, parser.name]));
  }, [parsers]);

  const parserSuggestions = useMemo(() => {
    return parsers
      .filter((parser) => parser.sourceType !== 'external')
      .map((parser) => ({
        slug: parser.slug,
        displayName: parser.name,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug));
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

  const formatParserOptions = useCallback((options?: ParserTaskItem['parserOptions']) => {
    if (!options) {
      return null;
    }

    const entries = Object.entries(options);
    if (entries.length === 0) {
      return null;
    }

    const preview = entries.slice(0, 3).map(([key, value]) => `${key}=${String(value ?? 'null')}`);
    const extra = entries.length - preview.length;
    return `${preview.join(', ')}${extra > 0 ? ` +${extra}` : ''}`;
  }, []);

  const fetchTasks = useCallback(async () => {
    const requestId = ++latestFetchRequestIdRef.current;
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
      if (requestId !== latestFetchRequestIdRef.current) {
        return;
      }
      setTasks(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      if (requestId !== latestFetchRequestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      setTasks([]);
      setTotalCount(0);
    } finally {
      if (requestId === latestFetchRequestIdRef.current) {
        setIsLoading(false);
      }
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
  }, [searchParams]);

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
        parserOptions: liveStatus.parserOptions ?? task.parserOptions,
      };
    });
  }, [tasks, taskStatusesByCorrelationId]);

  const handleStatusFilterChange = (value: HistoryStatusFilter) => {
    setPage(0);
    setStatusFilter(value);
  };

  const handleSortOrderChange = (value: 'newest' | 'oldest') => {
    setPage(0);
    setSortOrder(value);
  };

  const handleParserSlugFilterChange = (value: string) => {
    setPage(0);
    setParserSlugFilter(value);
  };

  const handleFromFilterChange = (value: string) => {
    setPage(0);
    setFromFilter(value);
  };

  const handleToFilterChange = (value: string) => {
    setPage(0);
    setToFilter(value);
  };

  const handleCorrelationIdFilterChange = (value: string) => {
    setPage(0);
    setCorrelationIdFilter(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('correlationId', value.trim());
    } else {
      nextParams.delete('correlationId');
    }

    setSearchParams(nextParams, { replace: true });
  };

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
      <HistoryFilters
        statusFilter={statusFilter}
        sortOrder={sortOrder}
        parserSlugFilter={parserSlugFilter}
        fromFilter={fromFilter}
        toFilter={toFilter}
        correlationIdFilter={correlationIdFilter}
        isAdvancedFiltersOpen={isAdvancedFiltersOpen}
        parserSuggestions={parserSuggestions}
        onStatusFilterChange={handleStatusFilterChange}
        onSortOrderChange={handleSortOrderChange}
        onParserSlugFilterChange={handleParserSlugFilterChange}
        onFromFilterChange={handleFromFilterChange}
        onToFilterChange={handleToFilterChange}
        onCorrelationIdFilterChange={handleCorrelationIdFilterChange}
        onToggleAdvancedFilters={() => setIsAdvancedFiltersOpen((prev) => !prev)}
        onClearFilters={handleClearFilters}
      />

      <HistoryTable
        displayedTasks={displayedTasks}
        parserBySlug={parserBySlug}
        formatParserOptions={formatParserOptions}
        isLoading={isLoading}
        error={error}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        onJumpPageChange={setPage}
        onPreviewCollectedData={(correlationId) => setPreviewCorrelationId(correlationId)}
        onCopyCorrelationId={(correlationId) => void copyToClipboard(correlationId)}
        onOpenCollectedData={(correlationId) => navigate(`/data?correlationId=${encodeURIComponent(correlationId)}`)}
      />

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
