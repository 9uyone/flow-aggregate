import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { ParserDetailsResponse } from '../../types/storage';

interface RunParserDialogProps {
  open: boolean;
  parserDetails: ParserDetailsResponse | null;
  runParameterValues: Record<string, string>;
  onClose: () => void;
  onParameterChange: (parameterName: string, value: string) => void;
  onRun: () => void;
}

export const RunParserDialog: React.FC<RunParserDialogProps> = ({
  open,
  parserDetails,
  runParameterValues,
  onClose,
  onParameterChange,
  onRun,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Run parser with parameters</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {parserDetails?.displayName || parserDetails?.slug}
        </Typography>

        {parserDetails?.parameters.map((parameter) => {
          const hasOptions = parameter.options.length > 0;
          const isConfigurable = parameter.allowCustomValues || hasOptions;
          if (!isConfigurable) {
            return null;
          }

          const isSelectOnly = hasOptions && !parameter.allowCustomValues;
          const isCustomWithSuggestions = hasOptions && parameter.allowCustomValues;

          const helperText = isCustomWithSuggestions
            ? `${parameter.description} Suggested: ${parameter.options
                .slice(0, 5)
                .map((option) => option.value)
                .join(', ')}${parameter.options.length > 5 ? '...' : ''}`
            : parameter.description;

          return (
            <Box key={parameter.name}>
              <TextField
                select={isSelectOnly}
                fullWidth
                margin="normal"
                label={parameter.name}
                helperText={helperText}
                required={parameter.isRequired}
                value={runParameterValues[parameter.name] ?? ''}
                onChange={(event) => onParameterChange(parameter.name, event.target.value)}
                placeholder={isCustomWithSuggestions ? 'Enter your value or use suggested one' : undefined}
                inputProps={isCustomWithSuggestions ? { list: `${parameter.name}-options` } : undefined}
              >
                {isSelectOnly
                  ? parameter.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label || option.value}
                    </MenuItem>
                  ))
                  : undefined}
              </TextField>
              {isCustomWithSuggestions && (
                <datalist id={`${parameter.name}-options`}>
                  {parameter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || option.value}
                    </option>
                  ))}
                </datalist>
              )}
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onRun}>
          Run
        </Button>
      </DialogActions>
    </Dialog>
  );
};
