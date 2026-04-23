import {
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';

interface FilterTextFieldProps extends Omit<TextFieldProps, 'onChange' | 'slotProps'> {
  value: string;
  onChange: (value: string) => void;
  slotProps?: Omit<TextFieldProps['slotProps'], 'input'>;
  inputRef?: TextFieldProps['inputRef'];
  showClearButton?: boolean;
}

export const FilterTextField: React.FC<FilterTextFieldProps> = ({
  value,
  onChange,
  slotProps,
  inputRef,
  showClearButton = true,
  ...props
}) => {
  return (
    <TextField
      {...props}
      inputRef={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: showClearButton && value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                aria-label="Clear filter"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange('')}
              >
                <ClearIcon fontSize="inherit" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
};
