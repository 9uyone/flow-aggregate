import {
  Box,
  Button,
  Collapse,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Tune as TuneIcon,
} from '@mui/icons-material';
import { DateRangeFilter, FilterTextField, ParserFilterAutocomplete, type ParserSuggestion } from '../../components';
import type { ParserRunStatus } from '../../types/storage';

export type HistoryStatusFilter = 'all' | ParserRunStatus;

interface HistoryFiltersProps {
  statusFilter: HistoryStatusFilter;
  sortOrder: 'newest' | 'oldest';
  parserSlugFilter: string;
  fromFilter: string;
  toFilter: string;
  correlationIdFilter: string;
  isAdvancedFiltersOpen: boolean;
  parserSuggestions: ParserSuggestion[];
  onStatusFilterChange: (value: HistoryStatusFilter) => void;
  onSortOrderChange: (value: 'newest' | 'oldest') => void;
  onParserSlugFilterChange: (value: string) => void;
  onFromFilterChange: (value: string) => void;
  onToFilterChange: (value: string) => void;
  onCorrelationIdFilterChange: (value: string) => void;
  onToggleAdvancedFilters: () => void;
  onClearFilters: () => void;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  statusFilter,
  sortOrder,
  parserSlugFilter,
  fromFilter,
  toFilter,
  correlationIdFilter,
  isAdvancedFiltersOpen,
  parserSuggestions,
  onStatusFilterChange,
  onSortOrderChange,
  onParserSlugFilterChange,
  onFromFilterChange,
  onToFilterChange,
  onCorrelationIdFilterChange,
  onToggleAdvancedFilters,
  onClearFilters,
}) => {
  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ flex: 1, minWidth: 0, alignItems: { md: 'center' } }}
        >
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, value: HistoryStatusFilter | null) => {
              if (value !== null) {
                onStatusFilterChange(value);
              }
            }}
            size="small"
            sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: { xs: 'wrap', md: 'nowrap' } }}
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

          <ParserFilterAutocomplete
            value={parserSlugFilter}
            options={parserSuggestions}
            onChange={onParserSlugFilterChange}
            placeholder="Parser"
            sx={{
              minWidth: { xs: '100%', md: 250 },
              maxWidth: { md: 300 },
            }}
          />
        </Stack>

        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={(_, value: 'newest' | 'oldest' | null) => {
            if (value !== null) {
              onSortOrderChange(value);
            }
          }}
          size="small"
          sx={{ ml: { xs: 0, md: 2 }, width: { xs: '100%', md: 'auto' } }}
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

      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangeFilter
          fromValue={fromFilter}
          toValue={toFilter}
          onFromChange={onFromFilterChange}
          onToChange={onToFilterChange}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: { md: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={onToggleAdvancedFilters}
            sx={{ height: 40, textTransform: 'none' }}
          >
            Advanced filters
          </Button>

          <Button
            variant="text"
            onClick={onClearFilters}
            sx={{ height: 40 }}
          >
            Clear filters
          </Button>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -2, mb: 2 }}>
        Suggestions match slug and display name; filter is applied by slug.
      </Typography>

      <Collapse in={isAdvancedFiltersOpen}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <FilterTextField
            placeholder="Filter by correlation ID"
            size="small"
            value={correlationIdFilter}
            onChange={onCorrelationIdFilterChange}
            sx={{ minWidth: 300 }}
          />
        </Box>
      </Collapse>
    </>
  );
};
