import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PageSectionHeader } from '../../components/layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CollectedDataItem, ParserCatalogItem, UserConfig } from '../../types/storage';
import { CollectedDataFilters } from './CollectedDataFilters';
import { CollectedDataTable } from './CollectedDataTable';

export const CollectedDataGrid: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CollectedDataItem[]>([]);
  const [parsers, setParsers] = useState<ParserCatalogItem[]>([]);
  const [userConfigs, setUserConfigs] = useState<UserConfig[]>([]);
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

  const parserSuggestions = useMemo(() => {
    // Catalog parsers
    const catalogSuggestions = parsers.map((parser) => ({
      slug: parser.slug,
      displayName: parser.displayName,
    }));

    // External parser configs
    const externalSuggestions = userConfigs
      .filter((config) => config.$type === 'external')
      .map((config) => ({
        slug: config.parserSlug,
        displayName: config.parserSlug,
      }));

    // Merge and deduplicate
    const merged = new Map<string, { slug: string; displayName: string }>();
    catalogSuggestions.forEach((s) => merged.set(s.slug, s));
    externalSuggestions.forEach((s) => {
      if (!merged.has(s.slug)) {
        merged.set(s.slug, s);
      }
    });

    return Array.from(merged.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  }, [parsers, userConfigs]);

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
      const [collectedResponse, parsersResponse, configsResponse] = await Promise.all([
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
        storageApi.getConfigs(),
      ]);
      setItems(collectedResponse.items);
      setParsers(parsersResponse);
      setUserConfigs(configsResponse.items);
      setTotalCount(collectedResponse.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load collected data';
      setError(message);
      setItems([]);
      setParsers([]);
      setUserConfigs([]);
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
    const configIdFromQuery = searchParams.get('configId') ?? '';

    if (correlationIdFromQuery !== correlationIdFilter) {
      setPage(0);
      setCorrelationIdFilter(correlationIdFromQuery);
    }

    if (configIdFromQuery !== configIdFilter) {
      setPage(0);
      setConfigIdFilter(configIdFromQuery);
    }
  }, [searchParams]);

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

  const handleSearchQueryChange = (value: string) => {
    setPage(0);
    setSearchQuery(value);
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

  const handleConfigIdFilterChange = (value: string) => {
    setPage(0);
    setConfigIdFilter(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('configId', value.trim());
    } else {
      nextParams.delete('configId');
    }

    setSearchParams(nextParams, { replace: true });
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

      <CollectedDataFilters
        searchQuery={searchQuery}
        sortOrder={sortOrder}
        parserSlugFilter={parserSlugFilter}
        fromFilter={fromFilter}
        toFilter={toFilter}
        correlationIdFilter={correlationIdFilter}
        configIdFilter={configIdFilter}
        isAdvancedFiltersOpen={isAdvancedFiltersOpen}
        parserSuggestions={parserSuggestions}
        onSearchQueryChange={handleSearchQueryChange}
        onSortOrderChange={handleSortOrderChange}
        onParserSlugFilterChange={handleParserSlugFilterChange}
        onFromFilterChange={handleFromFilterChange}
        onToFilterChange={handleToFilterChange}
        onCorrelationIdFilterChange={handleCorrelationIdFilterChange}
        onConfigIdFilterChange={handleConfigIdFilterChange}
        onToggleAdvancedFilters={() => setIsAdvancedFiltersOpen((prev) => !prev)}
        onClearFilters={handleClearFilters}
      />

      <CollectedDataTable
        displayedItems={displayedItems}
        parserBySlug={parserBySlug}
        isLoading={isLoading}
        error={error}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        onJumpPageChange={setPage}
        onCopyCorrelationId={(correlationId) => void copyToClipboard(correlationId)}
        onCopyConfigId={(configId) => void copyToClipboard(configId)}
        onOpenHistory={(correlationId) => navigate(`/history?correlationId=${encodeURIComponent(correlationId)}`)}
      />
    </Box>
  );
};

export default CollectedDataGrid;
