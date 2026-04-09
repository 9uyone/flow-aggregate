import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { useParserStore, type ParserConfig } from '../../store/parserStore';
import { storageApi } from '../../api';
import type { ParserDetailsResponse } from '../../types/storage';
import { PageSectionHeader } from '../../components/layout';
import { RunParserDialog } from './RunParserDialog';
import { CreateConfigDialog } from './CreateConfigDialog';
import { ParserConfigCard } from './ParserConfigCard';
import { AvailableParserCard } from './AvailableParserCard';
import { useLatestTaskOptions } from './useLatestTaskOptions';
import {
  CRON_PRESETS,
} from './parserUiHelpers';

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
    addRunningTaskId,
    setTaskSlugForCorrelationId,
    runningTaskIds,
    taskSlugByCorrelationId,
    taskStatusesByCorrelationId,
    taskCompletionVersion,
  } = useParserStore();
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [parserDetails, setParserDetails] = useState<ParserDetailsResponse | null>(null);
  const [runParameterValues, setRunParameterValues] = useState<Record<string, string>>({});
  const [isPreparingRun, setIsPreparingRun] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConfigType, setCreateConfigType] = useState<'internal' | 'external'>('internal');
  const [createParserSlug, setCreateParserSlug] = useState('');
  const [createIsEnabled, setCreateIsEnabled] = useState(true);
  const [createCustomName, setCreateCustomName] = useState('');
  const [createCronExpression, setCreateCronExpression] = useState('');
  const [createParameterValues, setCreateParameterValues] = useState<Record<string, string>>({});
  const [createParserDetails, setCreateParserDetails] = useState<ParserDetailsResponse | null>(null);
  const [createParserDetailsLoading, setCreateParserDetailsLoading] = useState(false);
  const [cronPreset, setCronPreset] = useState('');
  const [createdExternalToken, setCreatedExternalToken] = useState<string | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  const configuredParsers = parserConfigs;
  const availableParsers = parsers;
  const parsersWithRunnableOptions = useMemo(
    () => availableParsers.filter((parser) => parser.sourceType !== 'external'),
    [availableParsers]
  );
  const displayedAvailableParsers = availableParsers.filter((parser) => parser.sourceType !== 'external');
  const parserBySlug = new Map(parsers.map((parser) => [parser.slug, parser]));
  const { latestTaskOptionsBySlug } = useLatestTaskOptions(parsersWithRunnableOptions, taskCompletionVersion);
  const internalParsers = useMemo(
    () => availableParsers.filter((parser) => parser.sourceType === 'internal'),
    [availableParsers]
  );


  const runningSlugs = useMemo(() => {
    const liveRunningSlugs = Object.values(taskStatusesByCorrelationId)
      .filter((status) => status.status === 'Running' && status.parserSlug)
      .map((status) => status.parserSlug);

    const mappedRunningSlugs = Object.entries(taskSlugByCorrelationId)
      .filter(([correlationId]) => runningTaskIds.has(correlationId))
      .map(([, slug]) => slug);

    return new Set([...liveRunningSlugs, ...mappedRunningSlugs]);
  }, [runningTaskIds, taskSlugByCorrelationId, taskStatusesByCorrelationId]);

  const isSlugRunning = (slug: string) => runningSlugs.has(slug);

  const liveStatusBySlug = useMemo(() => {
    const statusMap = new Map<string, ParserConfig['status']>();

    Object.values(taskStatusesByCorrelationId).forEach((status) => {
      if (status.parserSlug) {
        statusMap.set(status.parserSlug, status.status);
      }
    });

    return statusMap;
  }, [taskStatusesByCorrelationId]);

  const getDisplayedConfigStatus = (config: ParserConfig) => {
    return liveStatusBySlug.get(config.slug) ?? config.status;
  };

  useEffect(() => {
    if (!createDialogOpen) {
      return;
    }

    const nextParser = internalParsers[0];
    if (createConfigType === 'internal' && nextParser && !internalParsers.some((parser) => parser.slug === createParserSlug)) {
      setCreateParserSlug(nextParser.slug);
    }
  }, [createDialogOpen, internalParsers, createConfigType, createParserSlug]);

  useEffect(() => {
    if (!createDialogOpen || createConfigType !== 'internal' || !createParserSlug) {
      setCreateParserDetails(null);
      setCreateParameterValues({});
      return;
    }

    const loadParserDetails = async () => {
      setCreateParserDetailsLoading(true);
      try {
        const details = await storageApi.getParserDetails(createParserSlug);
        setCreateParserDetails(details);

        const initialValues = buildParametersFromDefaultsAndTaskOptions(
          details,
          latestTaskOptionsBySlug[createParserSlug]
        );
        setCreateParameterValues(initialValues);
      } catch (detailsError) {
        const message = detailsError instanceof Error ? detailsError.message : 'Failed to load parser parameters';
        setNotification({ message, severity: 'error' });
        setCreateParserDetails(null);
        setCreateParameterValues({});
      } finally {
        setCreateParserDetailsLoading(false);
      }
    };

    void loadParserDetails();
  }, [
    createDialogOpen,
    createConfigType,
    createParserSlug,
    latestTaskOptionsBySlug,
  ]);

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
    setCreateConfigType('internal');
    setCreatedExternalToken(null);

    const defaultParser = internalParsers[0];
    setCreateParserSlug(defaultParser?.slug ?? '');
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreatedExternalToken(null);
    setCreateParserSlug('');
    setCreateIsEnabled(true);
    setCreateCustomName('');
    setCreateCronExpression('');
    setCreateParameterValues({});
    setCreateParserDetails(null);
    setCreateParserDetailsLoading(false);
    setCronPreset('');
    setIsCreatingConfig(false);
  };

  const handleCreateConfigTypeChange = (value: 'internal' | 'external') => {
    setCreateConfigType(value);
    const nextParser = value === 'internal' ? internalParsers[0] : null;
    setCreateParserSlug(nextParser?.slug ?? '');
    setCreatedExternalToken(null);
  };

  const handleCronPresetChange = (value: string) => {
    setCronPreset(value);
    if (value) {
      setCreateCronExpression(value);
    }
  };

  const handleCopyExternalToken = async () => {
    if (!createdExternalToken) {
      return;
    }

    await navigator.clipboard.writeText(createdExternalToken);
    setNotification({ message: 'Token copied to clipboard', severity: 'success' });
  };

  const buildDefaultParameters = (details: ParserDetailsResponse): Record<string, string> => {
    return details.parameters.reduce<Record<string, string>>((acc, parameter) => {
      const isConfigurable = parameter.allowCustomValues || parameter.options.length > 0;
      if (!isConfigurable) {
        return acc;
      }

      if (parameter.options.length > 0) {
        acc[parameter.name] = parameter.options[0].value;
        return acc;
      }

      acc[parameter.name] = '';
      return acc;
    }, {});
  };

  const buildParametersFromDefaultsAndTaskOptions = useCallback(
    (details: ParserDetailsResponse, options?: Record<string, string>): Record<string, string> => {
      const defaults = buildDefaultParameters(details);

      if (!options) {
        return defaults;
      }

      const merged = { ...defaults };

      details.parameters.forEach((parameter) => {
        const candidate = options[parameter.name];
        if (!candidate) {
          return;
        }

        const isOptionAllowed =
          parameter.allowCustomValues ||
          parameter.options.some((option) => option.value === candidate);

        if (isOptionAllowed) {
          merged[parameter.name] = candidate;
        }
      });

      return merged;
    },
    []
  );

  const formatOptionsPreview = useCallback((options?: Record<string, string>) => {
    if (!options) {
      return null;
    }

    const entries = Object.entries(options);
    if (entries.length === 0) {
      return null;
    }

    const preview = entries.slice(0, 3).map(([key, value]) => `${key}=${value}`);
    const extra = entries.length - preview.length;
    return `${preview.join(', ')}${extra > 0 ? ` +${extra}` : ''}`;
  }, []);

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  const runParserWithParams = async (slug: string, parameters: Record<string, string>) => {
    try {
      const response = await storageApi.runParserBySlug(slug, parameters);
      updateParser(slug, { status: 'Running' });
      addRunningTaskId(response.correlationId);
      setTaskSlugForCorrelationId(response.correlationId, slug);
      setNotification({
        message: `Parser ${slug} started. Task: ${response.correlationId}`,
        severity: 'success',
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run parser';
      setNotification({ message, severity: 'error' });
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

    try {
      const response = await storageApi.runConfig(config.configId);
      updateParser(config.slug, { status: 'Running' });
      updateParserConfigsBySlug(config.slug, { status: 'Running' });
      addRunningTaskId(response.correlationId);
      setTaskSlugForCorrelationId(response.correlationId, config.slug);
      setNotification({
        message: `Config ${config.customName || config.slug} started. Task: ${response.correlationId}`,
        severity: 'success',
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run saved config';
      setNotification({ message, severity: 'error' });
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
        setRunParameterValues(
          buildParametersFromDefaultsAndTaskOptions(details, latestTaskOptionsBySlug[slug])
        );
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

  const handleStopParser = async (_slug: string, event: React.MouseEvent) => {
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
      (parameter) =>
        parameter.isRequired &&
        (parameter.allowCustomValues || parameter.options.length > 0) &&
        !runParameterValues[parameter.name]?.trim()
    );

    if (missingRequired) {
      setNotification({ message: 'Fill all required parameters', severity: 'error' });
      return;
    }

    await runParserWithParams(parserDetails.slug, runParameterValues);
    handleRunDialogClose();
  };

  const handleCreateParameterChange = (parameterName: string, value: string) => {
    setCreateParameterValues((prev) => ({
      ...prev,
      [parameterName]: value,
    }));
  };

  const handleCreateConfig = async () => {
    if (!createParserSlug) {
      setNotification({ message: 'Select a parser slug', severity: 'error' });
      return;
    }

    setIsCreatingConfig(true);

    try {
      if (createConfigType === 'internal') {
        if (!createCronExpression.trim()) {
          setNotification({ message: 'Cron expression is required for internal configs', severity: 'error' });
          return;
        }

        if (createParserDetails) {
          const missingRequired = createParserDetails.parameters.some(
            (parameter) =>
              parameter.isRequired &&
              (parameter.allowCustomValues || parameter.options.length > 0) &&
              !createParameterValues[parameter.name]?.trim()
          );

          if (missingRequired) {
            setNotification({ message: 'Fill all required parser parameters', severity: 'error' });
            return;
          }
        }

        const options = Object.fromEntries(
          (createParserDetails?.parameters ?? [])
            .filter((parameter) => parameter.allowCustomValues || parameter.options.length > 0)
            .map((parameter) => [parameter.name, createParameterValues[parameter.name] ?? ''])
            .filter(([, value]) => value.trim().length > 0)
            .map(([key, value]) => [key, value.trim()])
        );

        await storageApi.createInternalConfig({
          parserSlug: createParserSlug,
          isEnabled: createIsEnabled,
          customName: createCustomName.trim() || undefined,
          cronExpression: createCronExpression.trim(),
          options: Object.keys(options).length > 0 ? options : undefined,
        });

        setNotification({
          message: `Internal config created for ${createParserSlug}`,
          severity: 'success',
        });
      } else {
        const response = await storageApi.createExternalConfig({
          parserSlug: createParserSlug,
          isEnabled: createIsEnabled,
        });

        setCreatedExternalToken(response.token);
        setNotification({
          message: `External config created for ${createParserSlug}`,
          severity: 'success',
        });
      }

      await fetchConfigs();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create config';
      setNotification({ message, severity: 'error' });
    } finally {
      setIsCreatingConfig(false);
    }
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
      <PageSectionHeader
        title="Parser management"
        description="Configure and manage your data collection parsers"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load configs: {error}
        </Alert>
      )}

      {/* Saved Configurations */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2,
        }}
      >
        <Typography variant="h6">Saved configs</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
          Add config
        </Button>
      </Box>
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
                <ParserConfigCard
                  config={config}
                  parserName={parserName}
                  parserDescription={parserDescription}
                  metricFieldsCount={metricFields.length}
                  selected={selectedParserSlug === config.slug}
                  isRunning={isSlugRunning(config.slug)}
                  isPreparingRun={isPreparingRun}
                  displayedStatus={getDisplayedConfigStatus(config)}
                  latestOptionsPreview={formatOptionsPreview(latestTaskOptionsBySlug[config.slug])}
                  onCardClick={handleCardClick}
                  onRun={handleRunSavedConfig}
                  onStop={handleStopParser}
                />
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Available parsers */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Available parsers
      </Typography>
      <Grid container spacing={3}>
        {displayedAvailableParsers.length === 0 ? (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No manageable parsers available from collector
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          displayedAvailableParsers.map((parser) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`available-${parser.slug}`}>
              <AvailableParserCard
                parser={parser}
                selected={selectedParserSlug === parser.slug}
                isRunning={isSlugRunning(parser.slug)}
                isPreparingRun={isPreparingRun}
                latestOptionsPreview={formatOptionsPreview(latestTaskOptionsBySlug[parser.slug])}
                onCardClick={handleCardClick}
                onRun={handleRunAvailableParser}
              />
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

      <RunParserDialog
        open={runDialogOpen}
        parserDetails={parserDetails}
        runParameterValues={runParameterValues}
        onClose={handleRunDialogClose}
        onParameterChange={handleParameterChange}
        onRun={handleRunWithParameters}
      />

      <CreateConfigDialog
        open={createDialogOpen}
        configType={createConfigType}
        internalParsers={internalParsers}
        parserSlug={createParserSlug}
        customName={createCustomName}
        cronExpression={createCronExpression}
        cronPreset={cronPreset}
        cronPresets={CRON_PRESETS}
        parameterValues={createParameterValues}
        parserDetails={createParserDetails}
        parserDetailsLoading={createParserDetailsLoading}
        isEnabled={createIsEnabled}
        createdExternalToken={createdExternalToken}
        isCreating={isCreatingConfig}
        onClose={handleCloseCreateDialog}
        onConfigTypeChange={handleCreateConfigTypeChange}
        onParserSlugChange={setCreateParserSlug}
        onCustomNameChange={setCreateCustomName}
        onCronExpressionChange={setCreateCronExpression}
        onCronPresetChange={handleCronPresetChange}
        onParameterChange={handleCreateParameterChange}
        onEnabledChange={setCreateIsEnabled}
        onCopyToken={handleCopyExternalToken}
        onCreate={handleCreateConfig}
      />
    </Box>
  );
};

export default ParserList;
