import { useCallback, useEffect, useMemo, useState } from 'react';
import { storageApi } from '../../api';
import type { Parser, ParserConfig } from '../../store/parserStore';
import type { ParserDetailsResponse } from '../../types/storage';
import { CRON_PRESETS } from './parserUiHelpers';

type NotifyFn = (message: string, severity: 'success' | 'error') => void;

interface UseConfigDialogArgs {
  availableParsers: Parser[];
  latestTaskOptionsBySlug: Record<string, Record<string, string> | undefined>;
  fetchConfigs: () => Promise<void>;
  notify: NotifyFn;
  buildParametersFromDefaultsAndTaskOptions: (
    details: ParserDetailsResponse,
    options?: Record<string, string>
  ) => Record<string, string>;
}

export interface ConfigDialogController {
  internalParsers: Parser[];
  selectedParser: Parser | null;
  open: boolean;
  mode: 'create' | 'edit';
  supportsScheduledRun: boolean;
  supportsManualRun: boolean;
  supportsPushIngest: boolean;
  supportsParameters: boolean;
  parserSlug: string;
  customName: string;
  cronExpression: string;
  cronPreset: string;
  parameterValues: Record<string, string>;
  parserDetails: ParserDetailsResponse | null;
  parserDetailsLoading: boolean;
  isEnabled: boolean;
  createdExternalToken: string | null;
  isSubmitting: boolean;
  openCreate: (parserSlugOverride?: string) => void;
  openEdit: (config: ParserConfig, event: React.MouseEvent) => void;
  close: () => void;
  setParserSlug: (value: string) => void;
  setCustomName: (value: string) => void;
  setCronExpression: (value: string) => void;
  clearCronExpression: () => void;
  changeCronPreset: (value: string) => void;
  changeParameter: (name: string, value: string) => void;
  setIsEnabled: (value: boolean) => void;
  copyExternalToken: () => Promise<void>;
  submit: () => Promise<void>;
}

export const useConfigDialog = ({
  availableParsers,
  latestTaskOptionsBySlug,
  fetchConfigs,
  notify,
  buildParametersFromDefaultsAndTaskOptions,
}: UseConfigDialogArgs): ConfigDialogController => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingConfig, setEditingConfig] = useState<ParserConfig | null>(null);
  const [parserSlug, setParserSlug] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [customName, setCustomName] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [parserDetails, setParserDetails] = useState<ParserDetailsResponse | null>(null);
  const [parserDetailsLoading, setParserDetailsLoading] = useState(false);
  const [cronPreset, setCronPreset] = useState('');
  const [createdExternalToken, setCreatedExternalToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const internalParsers = useMemo(() => availableParsers, [availableParsers]);

  const selectedParser = useMemo(
    () => availableParsers.find((parser) => parser.slug === parserSlug) ?? null,
    [availableParsers, parserSlug]
  );

  const supportsScheduledRun = selectedParser?.supportsScheduledRun ?? false;
  const supportsManualRun = selectedParser?.supportsManualRun ?? false;
  const supportsPushIngest = selectedParser?.supportsPushIngest ?? false;
  const supportsParameters = selectedParser?.supportsParameters ?? false;

  const close = useCallback(() => {
    setOpen(false);
    setMode('create');
    setEditingConfig(null);
    setCreatedExternalToken(null);
    setParserSlug('');
    setIsEnabled(true);
    setCustomName('');
    setCronExpression('');
    setParameterValues({});
    setParserDetails(null);
    setParserDetailsLoading(false);
    setCronPreset('');
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextParser = internalParsers[0];
    if (nextParser && !internalParsers.some((parser) => parser.slug === parserSlug)) {
      setParserSlug(nextParser.slug);
    }
  }, [open, internalParsers, parserSlug]);

  useEffect(() => {
    if (!open || !parserSlug || !supportsParameters || supportsPushIngest) {
      setParserDetails((prev) => (prev === null ? prev : null));
      setParameterValues((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const loadParserDetails = async () => {
      setParserDetailsLoading(true);
      try {
        const details = await storageApi.getParserDetails(parserSlug);
        setParserDetails(details);

        const initialValues = mode === 'edit' && editingConfig?.slug === parserSlug
          ? buildParametersFromDefaultsAndTaskOptions(details, editingConfig.configOptions)
          : buildParametersFromDefaultsAndTaskOptions(details, latestTaskOptionsBySlug[parserSlug]);
        setParameterValues(initialValues);
      } catch (detailsError) {
        const message = detailsError instanceof Error ? detailsError.message : 'Failed to load parser parameters';
        notify(message, 'error');
        setParserDetails(null);
        setParameterValues({});
      } finally {
        setParserDetailsLoading(false);
      }
    };

    void loadParserDetails();
  }, [
    open,
    mode,
    editingConfig,
    parserSlug,
    supportsParameters,
    supportsPushIngest,
    latestTaskOptionsBySlug,
    notify,
    buildParametersFromDefaultsAndTaskOptions,
  ]);

  const openCreate = useCallback((parserSlugOverride?: string) => {
    setMode('create');
    setEditingConfig(null);
    setOpen(true);
    setCreatedExternalToken(null);

    if (parserSlugOverride) {
      setParserSlug(parserSlugOverride);
    } else {
      const defaultParser = internalParsers[0];
      setParserSlug(defaultParser?.slug ?? '');
    }
  }, [internalParsers]);

  const openEdit = useCallback((config: ParserConfig, event: React.MouseEvent) => {
    event.stopPropagation();

    setMode('edit');
    setEditingConfig(config);
    setOpen(true);
    setParserSlug(config.slug);
    setIsEnabled(config.isActive);
    setCustomName(config.customName ?? '');
    setCronExpression(config.cronExpression ?? '');
    setCronPreset(
      config.cronExpression && CRON_PRESETS.some((preset) => preset.value === config.cronExpression)
        ? config.cronExpression
        : ''
    );
    setParameterValues(config.configOptions ?? {});
    setCreatedExternalToken(null);
  }, []);

  const changeCronPreset = useCallback((value: string) => {
    setCronPreset(value);
    setCronExpression(value);
  }, []);

  const clearCronExpression = useCallback(() => {
    setCronPreset('');
    setCronExpression('');
  }, []);

  const changeParameter = useCallback((parameterName: string, value: string) => {
    setParameterValues((prev) => ({
      ...prev,
      [parameterName]: value,
    }));
  }, []);

  const copyExternalToken = useCallback(async () => {
    if (!createdExternalToken) {
      return;
    }

    await navigator.clipboard.writeText(createdExternalToken);
    notify('Token copied to clipboard', 'success');
  }, [createdExternalToken, notify]);

  const submit = useCallback(async () => {
    if (!parserSlug) {
      notify('Select a parser slug', 'error');
      return;
    }

    if (!selectedParser) {
      notify('Selected parser was not found in unified catalog', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (supportsParameters && parserDetails) {
        const missingRequired = parserDetails.parameters.some(
          (parameter) =>
            parameter.isRequired &&
            (parameter.allowCustomValues || parameter.options.length > 0) &&
            !parameterValues[parameter.name]?.trim()
        );

        if (missingRequired) {
          notify('Fill all required parser parameters', 'error');
          return;
        }
      }

      const options = Object.fromEntries(
        (supportsParameters ? (parserDetails?.parameters ?? []) : [])
          .filter((parameter) => parameter.allowCustomValues || parameter.options.length > 0)
          .map((parameter) => [parameter.name, parameterValues[parameter.name] ?? ''])
          .filter(([, value]) => value.trim().length > 0)
          .map(([key, value]) => [key, value.trim()])
      );

      if (mode === 'edit') {
        if (!editingConfig) {
          notify('No config selected for edit', 'error');
          return;
        }

        await storageApi.updateConfig(editingConfig.configId, {
          isEnabled,
          customName: !supportsPushIngest ? customName.trim() || undefined : undefined,
          cronExpression: supportsScheduledRun ? cronExpression.trim() || undefined : undefined,
          options:
            supportsParameters
              ? Object.keys(options).length > 0
                ? options
                : {}
              : undefined,
        });

        notify(`Config ${editingConfig.customName || editingConfig.slug} updated`, 'success');
        await fetchConfigs();
        close();
        return;
      }

      if (!supportsPushIngest) {
        await storageApi.createInternalConfig({
          parserSlug,
          isEnabled,
          customName: customName.trim() || undefined,
          cronExpression: supportsScheduledRun ? cronExpression.trim() || undefined : undefined,
          options: supportsParameters && Object.keys(options).length > 0 ? options : undefined,
        });

        notify(`Internal config created for ${parserSlug}`, 'success');
        await fetchConfigs();
        close();
        return;
      }

      const response = await storageApi.createExternalConfig({
        parserSlug,
        isEnabled,
      });

      setCreatedExternalToken(response.token);
      notify(`External config created for ${parserSlug}`, 'success');
      await fetchConfigs();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create config';
      notify(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    parserSlug,
    selectedParser,
    supportsScheduledRun,
    supportsPushIngest,
    supportsParameters,
    parserDetails,
    parameterValues,
    mode,
    editingConfig,
    isEnabled,
    cronExpression,
    customName,
    fetchConfigs,
    close,
    notify,
  ]);

  return {
    internalParsers,
    selectedParser,
    open,
    mode,
    supportsScheduledRun,
    supportsManualRun,
    supportsPushIngest,
    supportsParameters,
    parserSlug,
    customName,
    cronExpression,
    cronPreset,
    parameterValues,
    parserDetails,
    parserDetailsLoading,
    isEnabled,
    createdExternalToken,
    isSubmitting,
    openCreate,
    openEdit,
    close,
    setParserSlug,
    setCustomName,
    setCronExpression,
    clearCronExpression,
    changeCronPreset,
    changeParameter,
    setIsEnabled,
    copyExternalToken,
    submit,
  };
};
