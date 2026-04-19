import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Typography } from '@mui/material';

interface ParserSelectorOption {
  slug: string;
  name: string;
  isActive?: boolean;
}

interface ParserSelectorProps {
  parsers: ParserSelectorOption[];
  selectedParserSlug: string | null;
  onChange: (slug: string | null) => void;
  label?: string;
  helperText?: string;
}

export const ParserSelector: React.FC<ParserSelectorProps> = ({
  parsers,
  selectedParserSlug,
  onChange,
  label = 'Parser',
  helperText,
}) => {
  const sortedParsers = [...parsers].sort((a, b) => a.name.localeCompare(b.name));

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onChange(value || null);
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="parser-selector-label">{label}</InputLabel>
      <Select
        labelId="parser-selector-label"
        value={selectedParserSlug ?? ''}
        label={label}
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {sortedParsers.map((parser) => (
          <MenuItem key={parser.slug} value={parser.slug}>
            {parser.name}
            {parser.name !== parser.slug ? ` (${parser.slug})` : ''}
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};
