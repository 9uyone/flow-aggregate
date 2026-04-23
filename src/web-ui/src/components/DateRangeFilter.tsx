import { useRef } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { CalendarMonthOutlined as CalendarIcon } from '@mui/icons-material';
import { FilterTextField } from './FilterTextField';

interface DateRangeFilterProps {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

const toDateTimeLocalValue = (date: Date): string => {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}) => {
  const fromInputRef = useRef<HTMLInputElement | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);

  const handlePresetApply = (daysBack: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - daysBack);

    onFromChange(toDateTimeLocalValue(from));
    onToChange(toDateTimeLocalValue(now));
  };

  const handleClear = () => {
    onFromChange('');
    onToChange('');
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const dateFieldBaseSx = {
    minWidth: 0,
    width: '100%',
    '& .MuiInputBase-input[type="datetime-local"]': {
      colorScheme: 'dark',
      paddingRight: '3.25rem',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
      opacity: 0,
      cursor: 'pointer',
    },
  };

  const emptyFieldSx = {
    ...dateFieldBaseSx,
    '& .MuiInputBase-input[type="datetime-local"]': {
      ...(dateFieldBaseSx['& .MuiInputBase-input[type="datetime-local"]'] as object),
      color: 'transparent',
      caretColor: 'transparent',
      WebkitTextFillColor: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-text': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-month-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-day-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-year-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-hour-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-minute-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-second-field': {
      color: 'transparent',
      background: 'transparent',
    },
    '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-ampm-field': {
      color: 'transparent',
      background: 'transparent',
    },
  };

  const filledFieldSx = {
    ...dateFieldBaseSx,
    '& .MuiInputBase-input[type="datetime-local"]': {
      ...(dateFieldBaseSx['& .MuiInputBase-input[type="datetime-local"]'] as object),
      color: 'text.primary',
      caretColor: 'text.primary',
      WebkitTextFillColor: 'currentColor',
    },
  };

  const fieldWrapperSx = {
    position: 'relative',
    minWidth: 0,
  } as const;

  const hintSx = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: 'text.secondary',
    fontSize: '0.875rem',
  } as const;

  return (
    <Stack
      spacing={1}
      sx={{
        minWidth: { xs: '100%', lg: 440 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'minmax(150px, 1fr) minmax(150px, 1fr) repeat(4, auto)',
          },
          gap: { xs: 1, md: 1 },
          p: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          minWidth: 0,
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        <Box sx={fieldWrapperSx}>
          <FilterTextField
            label="From"
            type="datetime-local"
            size="small"
            value={fromValue}
            onChange={onFromChange}
            inputRef={fromInputRef}
            showClearButton={false}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            fullWidth
            sx={fromValue ? filledFieldSx : emptyFieldSx}
          />
          {!fromValue && (
            <Typography variant="body2" sx={hintSx}>
              Select date
            </Typography>
          )}
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.92)',
              width: 30,
              height: 30,
              zIndex: 1,
            }}
            aria-label="Open date picker"
            onClick={() => openDatePicker(fromInputRef.current)}
          >
            <CalendarIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={fieldWrapperSx}>
          <FilterTextField
            label="To"
            type="datetime-local"
            size="small"
            value={toValue}
            onChange={onToChange}
            inputRef={toInputRef}
            showClearButton={false}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            fullWidth
            sx={toValue ? filledFieldSx : emptyFieldSx}
          />
          {!toValue && (
            <Typography variant="body2" sx={hintSx}>
              Select date
            </Typography>
          )}
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.92)',
              width: 30,
              height: 30,
              zIndex: 1,
            }}
            aria-label="Open date picker"
            onClick={() => openDatePicker(toInputRef.current)}
          >
            <CalendarIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Button size="small" variant="text" onClick={() => handlePresetApply(1)} sx={{ whiteSpace: 'nowrap' }}>
          24h
        </Button>
        <Button size="small" variant="text" onClick={() => handlePresetApply(7)} sx={{ whiteSpace: 'nowrap' }}>
          7d
        </Button>
        <Button size="small" variant="text" onClick={() => handlePresetApply(30)} sx={{ whiteSpace: 'nowrap' }}>
          30d
        </Button>
        <Button size="small" variant="text" onClick={handleClear} sx={{ whiteSpace: 'nowrap' }}>
          Any time
        </Button>
      </Box>

    </Stack>
  );
};
