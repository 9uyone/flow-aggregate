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
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { CRON_PRESETS } from './parserUiHelpers';
import type { ConfigDialogController } from './useConfigDialog';
interface CreateConfigDialogProps {
  dialog: ConfigDialogController;
}

export const CreateConfigDialog: React.FC<CreateConfigDialogProps> = ({
  dialog,
}) => {
  const isCreateMode = dialog.mode === 'create';

  return (
    <Dialog open={dialog.open} onClose={dialog.close} fullWidth maxWidth="sm">
      <DialogTitle>{isCreateMode ? 'Create config' : 'Edit config'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={dialog.configType}
          onChange={(_, value: 'internal' | 'external') => dialog.changeType(value)}
          sx={{ mb: 2 }}
        >
          <Tab value="internal" label="Internal / Plugin" disabled={!dialog.allowTypeChange} />
          <Tab value="external" label="External" disabled={!dialog.allowTypeChange} />
        </Tabs>

        {dialog.isCustomizable ? (
          <>
            <TextField
              select
              fullWidth
              margin="dense"
              label="Parser"
              value={dialog.parserSlug}
              onChange={(event) => dialog.setParserSlug(event.target.value)}
              disabled={!isCreateMode}
            >
              {dialog.internalParsers.map((parser) => (
                <MenuItem key={parser.slug} value={parser.slug}>
                  {parser.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              margin="dense"
              label="Custom name"
              value={dialog.customName}
              onChange={(event) => dialog.setCustomName(event.target.value)}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Cron expression (optional)"
              value={dialog.cronExpression}
              onChange={(event) => dialog.setCronExpression(event.target.value)}
              placeholder="Leave empty for manual run"
              helperText="Set cron only if you want automatic scheduled runs"
                slotProps={{
                  input: {
                    endAdornment: dialog.cronExpression ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label="Clear cron expression"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={dialog.clearCronExpression}
                        >
                          <ClearIcon fontSize="inherit" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
            />

            <TextField
              select
              fullWidth
              margin="dense"
              label="Cron presets"
              value={dialog.cronPreset}
              onChange={(event) => dialog.changeCronPreset(event.target.value)}
            >
              <MenuItem value="">Custom expression</MenuItem>
              {CRON_PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>

            {dialog.cronExpression.trim() && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {(() => {
                  try {
                    return cronstrue.toString(dialog.cronExpression.trim());
                  } catch {
                    return 'Invalid cron expression format';
                  }
                })()}
              </Alert>
            )}

            {dialog.parserDetailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : dialog.parserDetails && dialog.parserDetails.parameters.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Parser parameters
                </Typography>
                {dialog.parserDetails.parameters.map((parameter) => {
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
                      value={dialog.parameterValues[parameter.name] ?? ''}
                      onChange={(event) => dialog.changeParameter(parameter.name, event.target.value)}
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
                {dialog.parserDetails.parameters
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
              value={dialog.parserSlug}
              onChange={(event) => dialog.setParserSlug(event.target.value.trim().toLowerCase())}
              placeholder="my-external-parser"
              helperText={isCreateMode ? 'Slug must be unique' : 'Parser slug cannot be changed'}
              disabled={!isCreateMode}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              External config enables backend-triggered execution. Frontend does not run external parsers directly.
            </Typography>
          </>
        )}

        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Switch checked={dialog.isEnabled} onChange={(event) => dialog.setIsEnabled(event.target.checked)} />}
          label="Enabled"
        />

        {dialog.createdExternalToken && (
          <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            External token returned by backend:
            {'\n'}
            {dialog.createdExternalToken}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={dialog.close}>Close</Button>
        {isCreateMode && dialog.createdExternalToken && <Button onClick={dialog.copyExternalToken}>Copy token</Button>}
        <Button variant="contained" onClick={dialog.submit} disabled={dialog.isSubmitting || !dialog.parserSlug}>
          {dialog.isSubmitting
            ? isCreateMode
              ? 'Creating...'
              : 'Saving...'
            : isCreateMode
              ? 'Create'
              : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
