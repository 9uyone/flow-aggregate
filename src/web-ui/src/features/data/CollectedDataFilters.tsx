import {
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
  Search as SearchIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { FilterTextField, ParserFilterAutocomplete, type ParserSuggestion } from '../../components';

interface CollectedDataFiltersProps {
  searchQuery: string;
  sortOrder: 'newest' | 'oldest';
  parserSlugFilter: string;
  fromFilter: string;
  toFilter: string;
  correlationIdFilter: string;
  configIdFilter: string;
  isAdvancedFiltersOpen: boolean;
  parserSuggestions: ParserSuggestion[];
  onSearchQueryChange: (value: string) => void;
  onSortOrderChange: (value: 'newest' | 'oldest') => void;
  onParserSlugFilterChange: (value: string) => void;
  onFromFilterChange: (value: string) => void;
  onToFilterChange: (value: string) => void;
  onCorrelationIdFilterChange: (value: string) => void;
  onConfigIdFilterChange: (value: string) => void;
  onToggleAdvancedFilters: () => void;
  onClearFilters: () => void;
}

export const CollectedDataFilters: React.FC<CollectedDataFiltersProps> = ({
  searchQuery,
  sortOrder,
  parserSlugFilter,
  fromFilter,
  toFilter,
  correlationIdFilter,
  configIdFilter,
  isAdvancedFiltersOpen,
  parserSuggestions,
  onSearchQueryChange,
  onSortOrderChange,
  onParserSlugFilterChange,
  onFromFilterChange,
  onToFilterChange,
  onCorrelationIdFilterChange,
  onConfigIdFilterChange,
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
        <TextField
          placeholder="Search parser / IDs / metric value"
          size="small"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Clear search"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSearchQueryChange('')}
                  >
                    <ClearIcon fontSize="inherit" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{ minWidth: { xs: '100%', md: 340 } }}
        />

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
        <ParserFilterAutocomplete
          value={parserSlugFilter}
          options={parserSuggestions}
          onChange={onParserSlugFilterChange}
        />

        <FilterTextField
          label="From"
          type="datetime-local"
          size="small"
          value={fromFilter}
          onChange={onFromFilterChange}
          slotProps={{
            inputLabel: { shrink: true },
          }}
        />

        <FilterTextField
          label="To"
          type="datetime-local"
          size="small"
          value={toFilter}
          onChange={onToFilterChange}
          slotProps={{
            inputLabel: { shrink: true },
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
          <FilterTextField
            placeholder="Filter by correlation ID"
            size="small"
            value={correlationIdFilter}
            onChange={onCorrelationIdFilterChange}
            sx={{ minWidth: 280 }}
          />
          <FilterTextField
            placeholder="Filter by config ID"
            size="small"
            value={configIdFilter}
            onChange={onConfigIdFilterChange}
            sx={{ minWidth: 260 }}
          />
        </Box>
      </Collapse>
    </>
  );
};
