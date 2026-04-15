import { create } from 'zustand';
import { storageApi } from '../api';
import type { ParserCatalogItem, ParserRunStatus, ParserSourceType, TaskStatusResponse, UserConfig } from '../types/storage';

export interface Parser {
  slug: string;
  name: string;
  description?: string;
  sourceType: ParserSourceType;
  metricFields: string[];
  hasConfig: boolean;
  url?: string;
  cronExpression?: string;
  configOptions?: Record<string, string>;
  isActive: boolean;
  lastRunAt?: string;
  status: ParserRunStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParserConfig {
  configId: string;
  slug: string;
  sourceType: ParserSourceType;
  isActive: boolean;
  status: ParserRunStatus | null;
  lastRunAt?: string;
  lastErrorMessage?: string;
  cronExpression?: string;
  configOptions?: Record<string, string>;
  customName?: string;
}

export interface ParserRun {
  id: string;
  parserId: string;
  status: 'Running' | 'Success' | 'Failed';
  startedAt: string;
  completedAt?: string;
  itemsCollected: number;
  errorMessage?: string;
}

interface ParserState {
  // State
  parsers: Parser[];
  parserConfigs: ParserConfig[];
  selectedParser: Parser | null;
  selectedParserSlug: string | null;
  parserRuns: ParserRun[];
  runningTaskIds: Set<string>;
  taskSlugByCorrelationId: Record<string, string>;
  taskStatusesByCorrelationId: Record<string, TaskStatusResponse>;
  taskCompletionVersion: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConfigs: () => Promise<void>;
  setParsers: (parsers: Parser[]) => void;
  addParser: (parser: Parser) => void;
  updateParser: (slug: string, updates: Partial<Parser>) => void;
  updateParserConfigsBySlug: (slug: string, updates: Partial<ParserConfig>) => void;
  removeParser: (slug: string) => void;
  setSelectedParser: (parser: Parser | null) => void;
  setSelectedParserSlug: (slug: string | null) => void;
  setParserRuns: (runs: ParserRun[]) => void;
  addParserRun: (run: ParserRun) => void;
  updateParserRun: (id: string, updates: Partial<ParserRun>) => void;
  addRunningTaskId: (correlationId: string) => void;
  removeRunningTaskId: (correlationId: string) => void;
  setRunningTaskIds: (ids: Set<string>) => void;
  setTaskSlugForCorrelationId: (correlationId: string, slug: string) => void;
  removeTaskSlugForCorrelationId: (correlationId: string) => void;
  setTaskStatus: (status: TaskStatusResponse) => void;
  removeTaskStatus: (correlationId: string) => void;
  bumpTaskCompletionVersion: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Maps backend UserConfig to frontend Parser interface
 */
const mapUserConfigToParser = (config: UserConfig): Parser => ({
  slug: config.parserSlug,
  name: config.parserSlug,
  description:
    config.$type === 'internal'
      ? config.cronExpression
        ? `Internal parser · cron: ${config.cronExpression}`
        : 'Internal parser · manual run'
      : config.$type === 'plugin'
        ? 'Plugin parser'
        : 'External parser · trigger via token',
  sourceType: config.$type,
  metricFields: [],
  hasConfig: true,
  url:
    config.$type === 'internal'
      ? config.cronExpression ?? 'Manual run'
      : 'External trigger',
  cronExpression: config.$type === 'internal' ? config.cronExpression : undefined,
  configOptions: config.$type === 'internal' ? config.options : undefined,
  isActive: config.isEnabled,
  status: config.lastStatus,
  createdAt: config.lastRunAt ?? new Date(0).toISOString(),
  updatedAt: config.lastRunAt ?? new Date(0).toISOString(),
  lastRunAt: config.lastRunAt ?? undefined,
});

const mapUserConfigToParserConfig = (config: UserConfig): ParserConfig => ({
  configId: config.configId,
  slug: config.parserSlug,
  sourceType: config.$type,
  isActive: config.isEnabled,
  status: config.lastStatus,
  lastRunAt: config.lastRunAt ?? undefined,
  lastErrorMessage: config.lastErrorMessage ?? undefined,
  cronExpression: config.$type === 'internal' || config.$type === 'plugin' ? config.cronExpression : undefined,
  configOptions: config.$type === 'internal' || config.$type === 'plugin' ? config.options : undefined,
  customName: config.$type === 'internal' || config.$type === 'plugin' ? config.customName : undefined,
});

const mapCatalogParser = (parser: ParserCatalogItem): Parser => {
  const nowIso = new Date().toISOString();
  return {
    slug: parser.slug,
    name: parser.displayName || parser.slug,
    description: parser.description || undefined,
    sourceType: parser.sourceType,
    metricFields: parser.metricFields,
    hasConfig: false,
    url: undefined,
    cronExpression: undefined,
    configOptions: undefined,
    isActive: false,
    status: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastRunAt: undefined,
  };
};

const mergeParsers = (catalogParsers: ParserCatalogItem[], configuredParsers: UserConfig[]): Parser[] => {
  const mergedMap = new Map<string, Parser>();

  catalogParsers.forEach((catalogItem) => {
    const parser = mapCatalogParser(catalogItem);
    mergedMap.set(parser.slug, parser);
  });

  configuredParsers.forEach((configuredItem) => {
    const configuredParser = mapUserConfigToParser(configuredItem);
    const existing = mergedMap.get(configuredParser.slug);

    if (existing) {
      mergedMap.set(configuredParser.slug, {
        ...existing,
        ...configuredParser,
        name: existing.name || configuredParser.name,
        description: existing.description || configuredParser.description,
        metricFields: existing.metricFields,
        sourceType: existing.sourceType,
        hasConfig: true,
        cronExpression: configuredParser.cronExpression,
        configOptions: configuredParser.configOptions,
      });
      return;
    }

    mergedMap.set(configuredParser.slug, {
      ...configuredParser,
      sourceType: configuredItem.$type,
      metricFields: [],
      hasConfig: true,
    });
  });

  return Array.from(mergedMap.values());
};

export const useParserStore = create<ParserState>()((set) => ({
  // Initial state
  parsers: [],
  parserConfigs: [],
  selectedParser: null,
  selectedParserSlug: null,
  parserRuns: [],
  runningTaskIds: new Set(),
  taskSlugByCorrelationId: {},
  taskStatusesByCorrelationId: {},
  taskCompletionVersion: 0,
  isLoading: false,
  error: null,

  // Actions
  fetchConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      const [configsResponse, availableParsers] = await Promise.all([
        storageApi.getConfigs(),
        storageApi.getAvailableParsers(),
      ]);

      const parsers = mergeParsers(availableParsers, configsResponse.items);
      const parserConfigs = configsResponse.items.map(mapUserConfigToParserConfig);
      set({ parsers, parserConfigs, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch configs';
      set({ error: message, isLoading: false });
      console.error('Error fetching configs:', error);
    }
  },

  setParsers: (parsers) =>
    set({
      parsers,
    }),

  addParser: (parser) =>
    set((state) => ({
      parsers: [...state.parsers, parser],
    })),

  updateParser: (slug, updates) =>
    set((state) => ({
      parsers: state.parsers.map((p) =>
        p.slug === slug ? { ...p, ...updates } : p
      ),
    })),

  updateParserConfigsBySlug: (slug, updates) =>
    set((state) => ({
      parserConfigs: state.parserConfigs.map((config) =>
        config.slug === slug ? { ...config, ...updates } : config
      ),
    })),

  removeParser: (slug) =>
    set((state) => ({
      parsers: state.parsers.filter((p) => p.slug !== slug),
    })),

  setSelectedParser: (parser) =>
    set({
      selectedParser: parser,
      selectedParserSlug: parser?.slug || null,
    }),

  setSelectedParserSlug: (slug) =>
    set((state) => ({
      selectedParserSlug: slug,
      selectedParser: state.parsers.find((p) => p.slug === slug) || null,
    })),

  setParserRuns: (runs) =>
    set({
      parserRuns: runs,
    }),

  addParserRun: (run) =>
    set((state) => ({
      parserRuns: [run, ...state.parserRuns],
    })),

  updateParserRun: (id, updates) =>
    set((state) => ({
      parserRuns: state.parserRuns.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  clearError: () =>
    set({
      error: null,
    }),

  addRunningTaskId: (correlationId) =>
    set((state) => {
      const newSet = new Set(state.runningTaskIds);
      newSet.add(correlationId);
      return { runningTaskIds: newSet };
    }),

  removeRunningTaskId: (correlationId) =>
    set((state) => {
      const newSet = new Set(state.runningTaskIds);
      newSet.delete(correlationId);
      return { runningTaskIds: newSet };
    }),

  setRunningTaskIds: (ids) =>
    set({
      runningTaskIds: ids,
    }),

  setTaskSlugForCorrelationId: (correlationId, slug) =>
    set((state) => ({
      taskSlugByCorrelationId: {
        ...state.taskSlugByCorrelationId,
        [correlationId]: slug,
      },
    })),

  removeTaskSlugForCorrelationId: (correlationId) =>
    set((state) => {
      if (!(correlationId in state.taskSlugByCorrelationId)) {
        return state;
      }

      const next = { ...state.taskSlugByCorrelationId };
      delete next[correlationId];
      return { taskSlugByCorrelationId: next };
    }),

  setTaskStatus: (status) =>
    set((state) => ({
      taskStatusesByCorrelationId: {
        ...state.taskStatusesByCorrelationId,
        [status.correlationId]: status,
      },
    })),

  removeTaskStatus: (correlationId) =>
    set((state) => {
      if (!(correlationId in state.taskStatusesByCorrelationId)) {
        return state;
      }

      const next = { ...state.taskStatusesByCorrelationId };
      delete next[correlationId];
      return { taskStatusesByCorrelationId: next };
    }),

  bumpTaskCompletionVersion: () =>
    set((state) => ({
      taskCompletionVersion: state.taskCompletionVersion + 1,
    })),
}));
