import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  Box,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Tune as TuneIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CollectedDataItem, ParserCatalogItem } from '../../types/storage';
import { MetricsSummary, ParserLabel } from './CollectedDataViewParts';

export const CollectedDataGrid: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<CollectedDataItem[]>([]);
  const [parsers, setParsers] = useState<ParserCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [parserSlugFilter, setParserSlugFilter] = useState('');
  const [correlationIdFilter, setCorrelationIdFilter] = useState('');
  const [configIdFilter, setConfigIdFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const parserBySlug = useMemo(() => {
    return new Map(parsers.map((parser) => [parser.slug, parser]));
  }, [parsers]);

  const copyToClipboard = useCallback(async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard failures; the row remains readable.
    }
  }, []);

  const fetchCollectedData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [collectedResponse, parsersResponse] = await Promise.all([
        storageApi.getCollectedData(page + 1, rowsPerPage, {
        oldFirst: sortOrder === 'oldest',
        search: searchQuery.trim() || undefined,
        parserSlug: parserSlugFilter.trim() || undefined,
        correlationId: correlationIdFilter.trim() || undefined,
        configId: configIdFilter.trim() || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        }),
        storageApi.getAvailableParsers(),
      ]);
      setItems(collectedResponse.items);
      setParsers(parsersResponse);
      setTotalCount(collectedResponse.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load collected data';
      setError(message);
      setItems([]);
      setParsers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    sortOrder,
    searchQuery,
    parserSlugFilter,
    correlationIdFilter,
    configIdFilter,
    fromFilter,
    toFilter,
  ]);

  useEffect(() => {
    void fetchCollectedData();
  }, [fetchCollectedData]);

  useEffect(() => {
    const correlationIdFromQuery = searchParams.get('correlationId') ?? '';
    if (correlationIdFromQuery !== correlationIdFilter) {
      setPage(0);
      setCorrelationIdFilter(correlationIdFromQuery);
    }
  }, [searchParams, correlationIdFilter]);

  useEffect(() => {
    if (correlationIdFilter || configIdFilter) {
      setIsAdvancedFiltersOpen(true);
    }
  }, [correlationIdFilter, configIdFilter]);

  const displayedItems = useMemo(() => items, [items]);

  const handleClearFilters = () => {
    setPage(0);
    setSearchQuery('');
    setParserSlugFilter('');
    setCorrelationIdFilter('');
    setConfigIdFilter('');
    setFromFilter('');
    setToFilter('');
    setSortOrder('newest');
    navigate('/data', { replace: true });
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <PageSectionHeader
        title="Collected data"
        description="Browse collected parser results with filters and quick metric preview"
        action={(
          <Tooltip title="Refresh">
            <IconButton onClick={() => void fetchCollectedData()} disabled={isLoading}>
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
        <TextField
          placeholder="Search parser / IDs / metric value"
          size="small"
          value={searchQuery}
          onChange={(event) => {
            setPage(0);
            setSearchQuery(event.target.value);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: { xs: '100%', md: 340 } }}
        />

        {/* Separator */}
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          width: '100%', 
          border: `1px solid`,
          borderColor: 'divider',
          my: 0.5
        }} />

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
              flex: { xs: 1, md: 'none' },
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
              flex: { xs: 1, md: 'none' },
            }}
          >
            Oldest
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Filter by parser slug"
          size="small"
          value={parserSlugFilter}
          onChange={(event) => {
            setPage(0);
            setParserSlugFilter(event.target.value);
          }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="From"
          type="datetime-local"
          size="small"
          value={fromFilter}
          onChange={(event) => {
            setPage(0);
            setFromFilter(event.target.value);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To"
          type="datetime-local"
          size="small"
          value={toFilter}
          onChange={(event) => {
            setPage(0);
            setToFilter(event.target.value);
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
            sx={{ minWidth: 280 }}
          />
          <TextField
            placeholder="Filter by config ID"
            size="small"
            value={configIdFilter}
            onChange={(event) => {
              setPage(0);
              setConfigIdFilter(event.target.value);
            }}
            sx={{ minWidth: 260 }}
          />
        </Box>
      </Collapse>

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
              minWidth: 920,
              '& .MuiTableCell-stickyHeader': {
                backgroundColor: 'background.paper',
                zIndex: 2,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Parser</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Captured at</TableCell>
                <TableCell>Metrics</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedItems.map((item) => {
                const parser = parserBySlug.get(item.parserSlug);
                const metricFields = parser?.metricFields ?? [];

                return (
                  <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <ParserLabel
                        slug={item.parserSlug}
                        displayName={parser?.displayName}
                        metricFields={metricFields}
                        showMetricFields
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {item.capturedAt ? new Date(item.capturedAt).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <MetricsSummary metrics={item.metrics} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Copy correlation ID">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => void copyToClipboard(item.correlationId ?? '')}
                              disabled={!item.correlationId}
                              aria-label="Copy correlation ID"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Copy config ID">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => void copyToClipboard(item.configId ?? '')}
                              disabled={!item.configId}
                              aria-label="Copy config ID"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Open history">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/history?correlationId=${encodeURIComponent(item.correlationId ?? '')}`)}
                            disabled={!item.correlationId}
                            aria-label="Open history"
                          >
                            <HistoryIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {displayedItems.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No collected data found
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

export default CollectedDataGrid;
