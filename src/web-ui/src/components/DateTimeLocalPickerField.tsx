import { useRef } from "react";
import {
  Box,
  IconButton,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import { CalendarMonthOutlined as CalendarIcon } from "@mui/icons-material";
import { FilterTextField } from "./FilterTextField";

interface DateTimeLocalPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

const dateFieldBaseSx = {
  minWidth: 0,
  width: "100%",
  '& .MuiInputBase-input[type="datetime-local"]': {
    colorScheme: "dark",
    paddingRight: "3.25rem",
  },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-calendar-picker-indicator':
    {
      opacity: 0,
      cursor: "pointer",
    },
};

const emptyFieldSx = {
  ...dateFieldBaseSx,
  '& .MuiInputBase-input[type="datetime-local"]': {
    ...(dateFieldBaseSx[
      '& .MuiInputBase-input[type="datetime-local"]'
    ] as object),
    color: "transparent",
    caretColor: "transparent",
    WebkitTextFillColor: "transparent",
  },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit': {
    color: "transparent",
    background: "transparent",
  },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-text': {
    color: "transparent",
    background: "transparent",
  },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-month-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-day-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-year-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-hour-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-minute-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-second-field':
    {
      color: "transparent",
      background: "transparent",
    },
  '& .MuiInputBase-input[type="datetime-local"]::-webkit-datetime-edit-ampm-field':
    {
      color: "transparent",
      background: "transparent",
    },
};

const filledFieldSx = {
  ...dateFieldBaseSx,
  '& .MuiInputBase-input[type="datetime-local"]': {
    ...(dateFieldBaseSx[
      '& .MuiInputBase-input[type="datetime-local"]'
    ] as object),
    color: "text.primary",
    caretColor: "text.primary",
    WebkitTextFillColor: "currentColor",
  },
};

export const DateTimeLocalPickerField: React.FC<
  DateTimeLocalPickerFieldProps
> = ({ label, value, onChange, inputRef, placeholder = "Select date", sx }) => {
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const mergedInputRef = (node: HTMLInputElement | null) => {
    localInputRef.current = node;

    if (!inputRef) {
      return;
    }

    if (typeof inputRef === "function") {
      inputRef(node);
      return;
    }

    inputRef.current = node;
  };

  const showHint = value.trim() === "";

  return (
    <Box
      sx={{
        position: "relative",
        minWidth: 0,
        ...sx,
      }}
    >
      <FilterTextField
        label={label}
        type="datetime-local"
        size="small"
        value={value}
        onChange={onChange}
        inputRef={mergedInputRef}
        showClearButton={false}
        slotProps={{
          inputLabel: { shrink: true },
        }}
        fullWidth
        sx={value ? filledFieldSx : emptyFieldSx}
      />
      {showHint && (
        <Typography
          variant="body2"
          sx={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "text.secondary",
            fontSize: "0.875rem",
          }}
        >
          {placeholder}
        </Typography>
      )}
      <IconButton
        size="small"
        sx={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: "rgba(255, 255, 255, 0.92)",
          width: 30,
          height: 30,
          zIndex: 1,
        }}
        aria-label={`Open ${label.toLowerCase()} date picker`}
        onClick={() => openDatePicker(localInputRef.current)}
      >
        <CalendarIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};
