import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { useParserStore, type ParserConfig } from '../../store/parserStore';
import { storageApi } from '../../api';
import type { ParserDetailsResponse } from '../../types/storage';
import { PageSectionHeader } from '../../components/layout';
import { RunParserDialog } from './RunParserDialog';
import { CreateConfigDialog } from './CreateConfigDialog';
import { ConfiguredParsersSection } from './ConfiguredParsersSection';
import { AvailableParsersSection } from './AvailableParsersSection';
import { ConfirmDeleteConfigDialog } from './ConfirmDeleteConfigDialog';
import { useLatestTaskOptions } from './useLatestTaskOptions';
import { useConfigDialog } from './useConfigDialog';

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<ParserConfig | null>(null);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);

  const configuredParsers = parserConfigs;
  const availableParsers = parsers;
  const parsersWithRunnableOptions = useMemo(
    () => availableParsers.filter((parser) => parser.sourceType !== 'external'),
    [availableParsers]
  );
  const displayedAvailableParsers = availableParsers.filter((parser) => parser.sourceType !== 'external');
  const parserBySlug = new Map(parsers.map((parser) => [parser.slug, parser]));
  const { latestTaskOptionsBySlug } = useLatestTaskOptions(parsersWithRunnableOptions, taskCompletionVersion);


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

  const notify = useCallback((message: string, severity: 'success' | 'error') => {
    setNotification({ message, severity });
  }, []);

  const handleOpenDeleteConfirm = (config: ParserConfig, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingConfig(config);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeletingConfig) {
      return;
    }

    setDeleteConfirmOpen(false);
    setDeletingConfig(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingConfig) {
      return;
    }

    setIsDeletingConfig(true);
    try {
      await storageApi.deleteConfig(deletingConfig.configId);
      await fetchConfigs();
      setNotification({
        message: `Config ${deletingConfig.customName || deletingConfig.slug} deleted`,
        severity: 'success',
      });
      setDeleteConfirmOpen(false);
      setDeletingConfig(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete config';
      setNotification({ message, severity: 'error' });
    } finally {
      setIsDeletingConfig(false);
    }
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

  const configDialog = useConfigDialog({
    availableParsers,
    latestTaskOptionsBySlug,
    fetchConfigs,
    notify,
    buildParametersFromDefaultsAndTaskOptions,
  });

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

  const handleCreateConfigForParser = (slug: string, event: React.MouseEvent) => {
    event.stopPropagation();
    configDialog.openCreate(slug);
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

      <ConfiguredParsersSection
        configuredParsers={configuredParsers}
        parserBySlug={parserBySlug}
        selectedParserSlug={selectedParserSlug}
        isPreparingRun={isPreparingRun}
        latestTaskOptionsBySlug={latestTaskOptionsBySlug}
        formatOptionsPreview={formatOptionsPreview}
        isSlugRunning={isSlugRunning}
        getDisplayedConfigStatus={getDisplayedConfigStatus}
        onCardClick={handleCardClick}
        onEdit={configDialog.openEdit}
        onDelete={handleOpenDeleteConfirm}
        onRun={handleRunSavedConfig}
        onStop={handleStopParser}
        onAddConfig={configDialog.openCreate}
        onRefresh={fetchConfigs}
      />

      <AvailableParsersSection
        parsers={displayedAvailableParsers}
        selectedParserSlug={selectedParserSlug}
        isPreparingRun={isPreparingRun}
        latestTaskOptionsBySlug={latestTaskOptionsBySlug}
        formatOptionsPreview={formatOptionsPreview}
        isSlugRunning={isSlugRunning}
        onCardClick={handleCardClick}
        onRun={handleRunAvailableParser}
        onCreateConfig={handleCreateConfigForParser}
      />

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

      <ConfirmDeleteConfigDialog
        open={deleteConfirmOpen}
        config={deletingConfig}
        isDeleting={isDeletingConfig}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
      />

      <CreateConfigDialog dialog={configDialog} />
    </Box>
  );
};

export default ParserList;
