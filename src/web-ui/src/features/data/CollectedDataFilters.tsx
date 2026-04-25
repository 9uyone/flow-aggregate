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
} from '@mui/material';
import {
  Clear as ClearIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import {
  DateRangeFilter,
  FilterTextField,
  FiltersToolbarLayout,
  ParserFilterAutocomplete,
  type ParserSuggestion,
} from '../../components';

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
  const topRowLeft = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { md: 'center' } }}
    >
      <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 300 } }}>
        <TextField
          placeholder="Search"
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
          fullWidth
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>

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
  );

  const topRowRight = (
    <ToggleButtonGroup
      value={sortOrder}
      exclusive
      onChange={(_, value: 'newest' | 'oldest' | null) => {
        if (value !== null) {
          onSortOrderChange(value);
        }
      }}
      size="small"
      sx={{ width: { xs: '100%', md: 'auto' } }}
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
  );

  const secondRowLeft = (
    <DateRangeFilter
      fromValue={fromFilter}
      toValue={toFilter}
      onFromChange={onFromFilterChange}
      onToChange={onToFilterChange}
    />
  );

  const secondRowRight = (
    <>
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
    </>
  );

  const advancedSection = (
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
  );

  return (
    <FiltersToolbarLayout
      topRowLeft={topRowLeft}
      topRowRight={topRowRight}
      secondRowLeft={secondRowLeft}
      secondRowRight={secondRowRight}
      helperText="Parser suggestions match slug and display name; filter is applied by slug."
      advancedSection={advancedSection}
    />
  );
};
