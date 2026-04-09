import {
  Autocomplete,
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import type { ParserRunStatus } from '../../types/storage';

export type HistoryStatusFilter = 'all' | ParserRunStatus;

type ParserSuggestion = {
  slug: string;
  displayName: string;
};

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
        spacing={1}
        sx={{ mb: 2, alignItems: { xs: 'stretch', md: 'center' } }}
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

        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
            my: 0.5,
          }}
        />

        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={(_, value: 'newest' | 'oldest' | null) => {
            if (value !== null) {
              onSortOrderChange(value);
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

      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Autocomplete<ParserSuggestion, false, false, true>
          freeSolo
          options={parserSuggestions}
          value={parserSuggestions.find((option) => option.slug === parserSlugFilter) ?? null}
          inputValue={parserSlugFilter}
          onChange={(_, value) => {
            if (typeof value === 'string') {
              onParserSlugFilterChange(value);
              return;
            }

            onParserSlugFilterChange(value?.slug ?? '');
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'input' || reason === 'clear') {
              onParserSlugFilterChange(value);
            }
          }}
          filterOptions={(options, state) => {
            const query = state.inputValue.trim().toLowerCase();
            if (!query) {
              return options;
            }

            return options.filter((option) =>
              option.slug.toLowerCase().includes(query) ||
              option.displayName.toLowerCase().includes(query)
            );
          }}
          getOptionLabel={(option) => {
            if (typeof option === 'string') {
              return option;
            }

            return option.displayName !== option.slug
              ? `${option.displayName} (${option.slug})`
              : option.slug;
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Filter by parser slug"
              size="small"
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.85rem',
                },
              }}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 8,
                '& .MuiAutocomplete-option': {
                  fontSize: '0.85rem',
                  padding: '8px 12px !important',
                  '&[data-highlighted="true"]': {
                    backgroundColor: 'action.hover',
                    color: 'text.primary',
                    fontWeight: 500,
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: 'action.selected',
                    color: 'text.primary',
                    fontWeight: 600,
                  },
                },
              },
            },
            popper: {
              sx: {
                '& .MuiAutocomplete-listbox': {
                  py: 0.5,
                },
              },
            },
          }}
          sx={{ minWidth: 280 }}
        />

        <TextField
          label="From"
          type="datetime-local"
          size="small"
          value={fromFilter}
          onChange={(event) => onFromFilterChange(event.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: fromFilter ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Clear from filter"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onFromFilterChange('')}
                  >
                    <ClearIcon fontSize="inherit" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <TextField
          label="To"
          type="datetime-local"
          size="small"
          value={toFilter}
          onChange={(event) => onToFilterChange(event.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: toFilter ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Clear to filter"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onToFilterChange('')}
                  >
                    <ClearIcon fontSize="inherit" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <Button
          variant="outlined"
          startIcon={<TuneIcon />}
          onClick={onToggleAdvancedFilters}
          sx={{ alignSelf: 'center', height: 40, textTransform: 'none' }}
        >
          Advanced filters
        </Button>

        <Button
          variant="text"
          onClick={onClearFilters}
          sx={{ alignSelf: 'center', height: 40 }}
        >
          Clear filters
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -2, mb: 2 }}>
        Suggestions match slug and display name; filter is applied by slug.
      </Typography>

      <Collapse in={isAdvancedFiltersOpen}>
        <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Filter by correlation ID"
            size="small"
            value={correlationIdFilter}
            onChange={(event) => onCorrelationIdFilterChange(event.target.value)}
            sx={{ minWidth: 300 }}
          />
        </Box>
      </Collapse>
    </>
  );
};
