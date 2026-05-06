import { Box, Button, Stack } from "@mui/material";
import { DateTimeLocalPickerField } from "./DateTimeLocalPickerField";

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
  const handlePresetApply = (daysBack: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - daysBack);

    onFromChange(toDateTimeLocalValue(from));
    onToChange(toDateTimeLocalValue(now));
  };

  const handleClear = () => {
    onFromChange("");
    onToChange("");
  };

  return (
    <Stack
      spacing={1}
      sx={{
        minWidth: { xs: "100%", lg: 440 },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "minmax(150px, 1fr) minmax(150px, 1fr) repeat(4, auto)",
          },
          gap: { xs: 1, md: 1 },
          p: 1,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          minWidth: 0,
          overflowX: "auto",
          alignItems: "center",
        }}
      >
        <DateTimeLocalPickerField
          label="From"
          value={fromValue}
          onChange={onFromChange}
        />
        <DateTimeLocalPickerField
          label="To"
          value={toValue}
          onChange={onToChange}
        />
        <Button
          size="small"
          variant="text"
          onClick={() => handlePresetApply(1)}
          sx={{ whiteSpace: "nowrap" }}
        >
          24h
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => handlePresetApply(7)}
          sx={{ whiteSpace: "nowrap" }}
        >
          7d
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => handlePresetApply(30)}
          sx={{ whiteSpace: "nowrap" }}
        >
          30d
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={handleClear}
          sx={{ whiteSpace: "nowrap" }}
        >
          Any time
        </Button>
      </Box>
    </Stack>
  );
};
