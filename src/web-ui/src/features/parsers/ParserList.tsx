import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Grid,
  CircularProgress,
  Tooltip,
  CardActionArea,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useParserStore, type ParserConfig } from '../../store/parserStore';
import { storageApi } from '../../api';
import type { ParserDetailsResponse } from '../../types/storage';

const getConfigStatusColor = (status: ParserConfig['status']) => {
  switch (status) {
    case 'Running':
      return 'info';
    case 'Success':
      return 'success';
    case 'Failed':
      return 'error';
    default:
      return 'default';
  }
};

const getConfigStatusLabel = (status: ParserConfig['status']) => {
  switch (status) {
    case 'Running':
      return 'Running';
    case 'Success':
      return 'Success';
    case 'Failed':
      return 'Failed';
    default:
      return 'Idle';
  }
};

export const ParserList: React.FC = () => {
  const {
    parsers,
    parserConfigs,
    isLoading,
    error,
    fetchConfigs,
    setSelectedParserSlug,
    selectedParserSlug,
    updateParser,
    updateParserConfigsBySlug,
  } = useParserStore();
  const [runningParsers, setRunningParsers] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [parserDetails, setParserDetails] = useState<ParserDetailsResponse | null>(null);
  const [runParameterValues, setRunParameterValues] = useState<Record<string, string>>({});
  const [isPreparingRun, setIsPreparingRun] = useState(false);
  const [runningTaskIds, setRunningTaskIds] = useState<Set<string>>(new Set());

  const configuredParsers = parserConfigs;
  const availableParsers = parsers;
  const parserBySlug = new Map(parsers.map((parser) => [parser.slug, parser]));

  useEffect(() => {
    const activeCorrelationIds = Array.from(runningTaskIds.values());
    if (activeCorrelationIds.length === 0) {
      return;
    }

    const pollTasks = async () => {
      try {
        const statusResults = await Promise.all(
          activeCorrelationIds.map(async (correlationId) => {
            try {
              const status = await storageApi.getTaskStatus(correlationId);
              return { correlationId, status };
            } catch {
              return null;
            }
          })
        );

        statusResults
          .filter((result): result is { correlationId: string; status: { correlationId: string; parserSlug: string; status: 'Running' | 'Success' | 'Failed'; errorMessage?: string; startedAt: string; finishedAt: string | null } } => result !== null)
          .forEach(({ correlationId, status }) => {
            const parserSlug = status.parserSlug;
            if (!parserSlug) {
              return;
            }

            if (status.status === 'Running') {
              updateParser(parserSlug, { status: 'Running' });
              updateParserConfigsBySlug(parserSlug, { status: 'Running' });
              return;
            }

            updateParser(parserSlug, {
              status: status.status,
              lastRunAt: status.finishedAt ?? new Date().toISOString(),
            });
            updateParserConfigsBySlug(parserSlug, {
              status: status.status,
              lastRunAt: status.finishedAt ?? new Date().toISOString(),
              lastErrorMessage: status.errorMessage ?? undefined,
            });

            setRunningParsers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(parserSlug);
              return newSet;
            });

            if (status.status === 'Failed') {
              setNotification({
                message: status.errorMessage || `Parser ${parserSlug} failed`,
                severity: 'error',
              });
            }

            setRunningTaskIds((prev) => {
              const next = new Set(prev);
              next.delete(correlationId);
              return next;
            });
          });
      } catch (pollError) {
        console.error('Failed to poll task statuses:', pollError);
      }
    };

    void pollTasks();
    const intervalId = window.setInterval(() => {
      void pollTasks();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningTaskIds, updateParser, updateParserConfigsBySlug]);

  const buildDefaultParameters = (details: ParserDetailsResponse): Record<string, string> => {
    return details.parameters.reduce<Record<string, string>>((acc, parameter) => {
      if (parameter.options.length > 0) {
        acc[parameter.name] = parameter.options[0].value;
        return acc;
      }

      acc[parameter.name] = '';
      return acc;
    }, {});
  };

  const runParserWithParams = async (slug: string, parameters: Record<string, string>) => {
    setRunningParsers((prev) => new Set(prev).add(slug));

    try {
      const response = await storageApi.runParserBySlug(slug, parameters);
      updateParser(slug, { status: 'Running' });
      setRunningTaskIds((prev) => new Set(prev).add(response.correlationId));
      setNotification({
        message: `Parser ${slug} started. Task: ${response.correlationId}`,
        severity: 'success',
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run parser';
      setNotification({ message, severity: 'error' });
      setRunningParsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }
  };

  const handleRunSavedConfig = async (config: ParserConfig, event: React.MouseEvent) => {
    event.stopPropagation();

    if (config.sourceType === 'external') {
      setNotification({
        message: 'External parsers are triggered via ingest API and cannot be run manually',
        severity: 'error',
      });
      return;
    }

    setRunningParsers((prev) => new Set(prev).add(config.slug));

    try {
      const response = await storageApi.runConfig(config.configId);
      updateParser(config.slug, { status: 'Running' });
      updateParserConfigsBySlug(config.slug, { status: 'Running' });
      setRunningTaskIds((prev) => new Set(prev).add(response.correlationId));
      setNotification({
        message: `Config ${config.customName || config.slug} started. Task: ${response.correlationId}`,
        severity: 'success',
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run saved config';
      setNotification({ message, severity: 'error' });
      setRunningParsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(config.slug);
        return newSet;
      });
    }
  };

  const handleRunAvailableParser = async (slug: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const parser = parsers.find((item) => item.slug === slug);
    if (parser?.sourceType === 'external') {
      setNotification({
        message: 'External parsers are triggered via ingest API and cannot be run manually',
        severity: 'error',
      });
      return;
    }

    setIsPreparingRun(true);
    
    try {
      const details = await storageApi.getParserDetails(slug);
      setParserDetails(details);

      if (details.parameters.length === 0) {
        await runParserWithParams(slug, {});
      } else {
        setRunParameterValues(buildDefaultParameters(details));
        setRunDialogOpen(true);
      }
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to prepare parser run';
      setNotification({ message, severity: 'error' });
      console.error('Error preparing parser run:', runError);
    } finally {
      setIsPreparingRun(false);
    }
  };

  const handleStopParser = async (slug: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      // TODO: Stop endpoint not yet available on backend
      setNotification({ 
        message: 'Stop parser feature is coming soon', 
        severity: 'success' 
      });
      // await storageApi.stopParser(slug);
      // updateParser(slug, { status: 'Success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop parser';
      setNotification({ message, severity: 'error' });
      console.error('Error stopping parser:', error);
    } finally {
      setRunningParsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }
  };

  const handleCardClick = (slug: string) => {
    setSelectedParserSlug(slug);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleRunDialogClose = () => {
    setRunDialogOpen(false);
    setParserDetails(null);
    setRunParameterValues({});
  };

  const handleParameterChange = (parameterSlug: string, value: string) => {
    setRunParameterValues((prev) => ({
      ...prev,
      [parameterSlug]: value,
    }));
  };

  const handleRunWithParameters = async () => {
    if (!parserDetails) {
      return;
    }

    const missingRequired = parserDetails.parameters.some(
      (parameter) => parameter.isRequired && !runParameterValues[parameter.name]?.trim()
    );

    if (missingRequired) {
      setNotification({ message: 'Fill all required parameters', severity: 'error' });
      return;
    }

    await runParserWithParams(parserDetails.slug, runParameterValues);
    handleRunDialogClose();
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load configs: {error}
        </Alert>
      )}

      {/* Action Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 3,
        }}
      >
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Parser
        </Button>
      </Box>

      {/* Saved Configurations */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Saved Configurations
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {configuredParsers.length === 0 ? (
          <Grid size={12}>
            <Card>
              <CardContent
                sx={{
                  textAlign: 'center',
                  py: 6,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No saved configurations
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Create a configuration with parameters and schedule to manage recurring runs
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={fetchConfigs}>
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          configuredParsers.map((config) => {
            const parserDefinition = parserBySlug.get(config.slug);
            const parserName = config.customName || parserDefinition?.name || config.slug;
            const parserDescription =
              parserDefinition?.description ||
              (config.sourceType === 'internal'
                ? 'Internal parser configuration'
                : 'External parser configuration');
            const metricFields = parserDefinition?.metricFields ?? [];

            return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={config.configId}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  border: selectedParserSlug === config.slug ? 2 : 0,
                  borderColor: 'primary.main',
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleCardClick(config.slug)}
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ flex: 1, width: '100%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        {parserName}
                      </Typography>
                      <Chip
                        label={getConfigStatusLabel(config.status)}
                        color={getConfigStatusColor(config.status)}
                        size="small"
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {parserDescription || 'No description'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      Type: {config.sourceType}
                    </Typography>

                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                      Config: Saved
                    </Typography>

                    {config.configOptions && Object.keys(config.configOptions).length > 0 && (
                      <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                        Params: {Object.entries(config.configOptions)
                          .map(([key, value]) => `${key}=${value}`)
                          .join(', ')}
                      </Typography>
                    )}

                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                      Metrics: {metricFields.length}
                    </Typography>

                    {config.cronExpression && (
                      <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                        Schedule: {config.cronExpression}
                      </Typography>
                    )}

                    {config.lastRunAt && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        mt={1}
                      >
                        Last run: {new Date(config.lastRunAt).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>

                {/* Actions */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1,
                    p: 2,
                    pt: 0,
                  }}
                >
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={(e) => e.stopPropagation()}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {runningParsers.has(config.slug) || config.status === 'Running' ? (
                    <Tooltip title="Stop">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={(e) => handleStopParser(config.slug, e)}
                        disabled={runningParsers.has(config.slug)}
                      >
                        {runningParsers.has(config.slug) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <StopIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Run">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => handleRunSavedConfig(config, e)}
                        disabled={
                          runningParsers.has(config.slug) ||
                          isPreparingRun ||
                          config.sourceType === 'external'
                        }
                      >
                        {runningParsers.has(config.slug) || isPreparingRun ? (
                          <CircularProgress size={20} />
                        ) : (
                          <PlayIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Card>
            </Grid>
          )})
        )}
      </Grid>

      {/* Available Parsers */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Available Parsers
      </Typography>
      <Grid container spacing={3}>
        {availableParsers.length === 0 ? (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Collector did not return parser catalog
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          availableParsers.map((parser) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`available-${parser.slug}`}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: selectedParserSlug === parser.slug ? 2 : 0,
                  borderColor: 'primary.main',
                }}
              >
                <CardActionArea
                  onClick={() => handleCardClick(parser.slug)}
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {parser.name}
                      </Typography>
                      <Chip label={parser.hasConfig ? 'Has saved configs' : 'No saved config'} size="small" />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {parser.description || 'No description'}
                    </Typography>

                    <Typography variant="caption" display="block" color="text.secondary">
                      Type: {parser.sourceType}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                      Metrics: {parser.metricFields.length}
                    </Typography>
                  </CardContent>
                </CardActionArea>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Tooltip title="Run">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => handleRunAvailableParser(parser.slug, e)}
                        disabled={runningParsers.has(parser.slug) || isPreparingRun || parser.sourceType === 'external'}
                      >
                        {runningParsers.has(parser.slug) || isPreparingRun ? (
                          <CircularProgress size={20} />
                        ) : (
                          <PlayIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.severity}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Dialog open={runDialogOpen} onClose={handleRunDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Run parser with parameters</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {parserDetails?.displayName || parserDetails?.slug}
          </Typography>

          {parserDetails?.parameters.map((parameter) => {
            const hasOptions = parameter.options.length > 0;
            return (
              <Box key={parameter.name}>
                <TextField
                  fullWidth
                  margin="normal"
                  label={parameter.name}
                  helperText={
                    hasOptions
                      ? `${parameter.description} Suggested: ${parameter.options
                          .slice(0, 5)
                          .map((option) => option.value)
                          .join(', ')}${parameter.options.length > 5 ? '...' : ''}`
                      : parameter.description
                  }
                  required={parameter.isRequired}
                  value={runParameterValues[parameter.name] ?? ''}
                  onChange={(event) => handleParameterChange(parameter.name, event.target.value)}
                  placeholder={hasOptions ? 'Enter your value or use suggested one' : undefined}
                  inputProps={hasOptions ? { list: `${parameter.name}-options` } : undefined}
                />
                {hasOptions && (
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
          <Button onClick={handleRunDialogClose}>Cancel</Button>
          <Button variant="contained" onClick={handleRunWithParameters}>
            Run
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParserList;
