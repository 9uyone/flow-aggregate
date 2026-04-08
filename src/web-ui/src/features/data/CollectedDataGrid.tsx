import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import type { CollectedDataItem } from '../../types/storage';

export const CollectedDataGrid: React.FC = () => {
  const [items, setItems] = useState<CollectedDataItem[]>([]);
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

  const fetchCollectedData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await storageApi.getCollectedData(page + 1, rowsPerPage, {
        oldFirst: sortOrder === 'oldest',
        search: searchQuery.trim() || undefined,
        parserSlug: parserSlugFilter.trim() || undefined,
        correlationId: correlationIdFilter.trim() || undefined,
        configId: configIdFilter.trim() || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setItems(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load collected data';
      setError(message);
      setItems([]);
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
          variant="text"
          onClick={handleClearFilters}
          sx={{ alignSelf: 'center', height: 40 }}
        >
          Clear filters
        </Button>
      </Box>

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
              minWidth: 1100,
              '& .MuiTableCell-stickyHeader': {
                backgroundColor: 'background.paper',
                zIndex: 2,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Parser</TableCell>
                <TableCell>Correlation ID</TableCell>
                <TableCell>Config ID</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Captured at</TableCell>
                <TableCell>Metrics</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedItems.map((item) => {
                const metricsEntries = Object.entries(item.metrics);
                const preview = metricsEntries.slice(0, 3);
                const extraCount = Math.max(metricsEntries.length - preview.length, 0);

                return (
                  <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {item.parserSlug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {item.correlationId ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {item.configId ?? '—'}
                      </Typography>
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
                      <Typography variant="caption" color="text.secondary">
                        {preview.length === 0 && 'No metrics'}
                        {preview.map(([key, value], index) => (
                          <Box component="span" key={key} sx={{ mr: index < preview.length - 1 ? 1.5 : 0 }}>
                            <strong>{key}</strong>: {String(value ?? 'null')}
                          </Box>
                        ))}
                        {extraCount > 0 && (
                          <Box component="span" sx={{ ml: 1 }}>
                            +{extraCount} more
                          </Box>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}

              {displayedItems.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
