import cronstrue from 'cronstrue';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { Parser } from '../../store/parserStore';
import type { ParserDetailsResponse } from '../../types/storage';

interface CronPreset {
  label: string;
  value: string;
}

interface CreateConfigDialogProps {
  open: boolean;
  configType: 'internal' | 'external';
  internalParsers: Parser[];
  parserSlug: string;
  customName: string;
  cronExpression: string;
  cronPreset: string;
  cronPresets: CronPreset[];
  parameterValues: Record<string, string>;
  parserDetails: ParserDetailsResponse | null;
  parserDetailsLoading: boolean;
  isEnabled: boolean;
  createdExternalToken: string | null;
  isCreating: boolean;
  onClose: () => void;
  onConfigTypeChange: (value: 'internal' | 'external') => void;
  onParserSlugChange: (value: string) => void;
  onCustomNameChange: (value: string) => void;
  onCronExpressionChange: (value: string) => void;
  onCronPresetChange: (value: string) => void;
  onParameterChange: (name: string, value: string) => void;
  onEnabledChange: (value: boolean) => void;
  onCopyToken: () => Promise<void>;
  onCreate: () => Promise<void>;
}

export const CreateConfigDialog: React.FC<CreateConfigDialogProps> = ({
  open,
  configType,
  internalParsers,
  parserSlug,
  customName,
  cronExpression,
  cronPreset,
  cronPresets,
  parameterValues,
  parserDetails,
  parserDetailsLoading,
  isEnabled,
  createdExternalToken,
  isCreating,
  onClose,
  onConfigTypeChange,
  onParserSlugChange,
  onCustomNameChange,
  onCronExpressionChange,
  onCronPresetChange,
  onParameterChange,
  onEnabledChange,
  onCopyToken,
  onCreate,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create config</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={configType}
          onChange={(_, value: 'internal' | 'external') => onConfigTypeChange(value)}
          sx={{ mb: 2 }}
        >
          <Tab value="internal" label="Internal / Plugin" />
          <Tab value="external" label="External" />
        </Tabs>

        {configType === 'internal' ? (
          <>
            <TextField
              select
              fullWidth
              margin="dense"
              label="Parser"
              value={parserSlug}
              onChange={(event) => onParserSlugChange(event.target.value)}
            >
              {internalParsers.map((parser) => (
                <MenuItem key={parser.slug} value={parser.slug}>
                  {parser.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="dense"
              label="Custom name"
              value={customName}
              onChange={(event) => onCustomNameChange(event.target.value)}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Cron expression"
              value={cronExpression}
              onChange={(event) => onCronExpressionChange(event.target.value)}
              required
            />

            <TextField
              select
              fullWidth
              margin="dense"
              label="Cron presets"
              value={cronPreset}
              onChange={(event) => onCronPresetChange(event.target.value)}
            >
              <MenuItem value="">Custom expression</MenuItem>
              {cronPresets.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>

            {cronExpression.trim() && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {(() => {
                  try {
                    return cronstrue.toString(cronExpression.trim());
                  } catch {
                    return 'Invalid cron expression format';
                  }
                })()}
              </Alert>
            )}

            {parserDetailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : parserDetails && parserDetails.parameters.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Parser parameters
                </Typography>
                {parserDetails.parameters.map((parameter) => {
                  const hasOptions = parameter.options.length > 0;
                  const isConfigurable = parameter.allowCustomValues || hasOptions;
                  if (!isConfigurable) {
                    return null;
                  }

                  const isSelectOnly = hasOptions && !parameter.allowCustomValues;
                  return (
                    <TextField
                      key={parameter.name}
                      select={isSelectOnly}
                      fullWidth
                      margin="none"
                      label={parameter.name}
                      value={parameterValues[parameter.name] ?? ''}
                      onChange={(event) => onParameterChange(parameter.name, event.target.value)}
                      helperText={
                        parameter.allowCustomValues && hasOptions
                          ? `${parameter.description || ''} You can enter your own value.`.trim()
                          : (parameter.description || undefined)
                      }
                      required={parameter.isRequired}
                      placeholder={parameter.allowCustomValues && hasOptions ? 'Enter value or pick suggestion' : undefined}
                      slotProps={{
                        htmlInput: parameter.allowCustomValues && hasOptions ? { list: `${parameter.name}-create-options` } : undefined
                      }}
                    >
                      {isSelectOnly
                        ? parameter.options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label || option.value}
                          </MenuItem>
                        ))
                        : undefined}
                    </TextField>
                  );
                })}
                {parserDetails.parameters
                  .filter((parameter) => parameter.allowCustomValues && parameter.options.length > 0)
                  .map((parameter) => (
                    <datalist id={`${parameter.name}-create-options`} key={`${parameter.name}-create-options-list`}>
                      {parameter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label || option.value}
                        </option>
                      ))}
                    </datalist>
                  ))}
              </Stack>
            ) : null}
          </>
        ) : (
          <>
            <TextField
              fullWidth
              margin="none"
              label="Parser slug"
              value={parserSlug}
              onChange={(event) => onParserSlugChange(event.target.value.trim().toLowerCase())}
              placeholder="my-external-parser"
              helperText="Slug must be unique"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              External config enables backend-triggered execution. Frontend does not run external parsers directly.
            </Typography>
          </>
        )}

        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Switch checked={isEnabled} onChange={(event) => onEnabledChange(event.target.checked)} />}
          label="Enabled"
        />

        {createdExternalToken && (
          <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            External token returned by backend:
            {'\n'}
            {createdExternalToken}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {createdExternalToken && <Button onClick={onCopyToken}>Copy token</Button>}
        <Button variant="contained" onClick={onCreate} disabled={isCreating || !parserSlug}>
          {isCreating ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
