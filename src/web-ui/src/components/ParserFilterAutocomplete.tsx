import {
  Autocomplete,
  TextField,
  type SxProps,
  type Theme,
} from '@mui/material';

export type ParserSuggestion = {
  slug: string;
  displayName: string;
};

interface ParserFilterAutocompleteProps {
  value: string;
  options: ParserSuggestion[];
  onChange: (value: string) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

export const ParserFilterAutocomplete: React.FC<ParserFilterAutocompleteProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Filter by parser slug',
  sx,
}) => {
  return (
    <Autocomplete<ParserSuggestion, false, false, true>
      freeSolo
      options={options}
      value={options.find((option) => option.slug === value) ?? null}
      inputValue={value}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
          return;
        }

        onChange(newValue?.slug ?? '');
      }}
      onInputChange={(_, newValue, reason) => {
        if (reason === 'input' || reason === 'clear') {
          onChange(newValue);
        }
      }}
      filterOptions={(opts, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) {
          return opts;
        }

        return opts.filter((option) =>
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
          placeholder={placeholder}
          size="small"
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '0.95rem',
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
      sx={[{ minWidth: 280 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
};
