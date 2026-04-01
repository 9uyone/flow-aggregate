import axiosInstance from './axiosInstance';
import type {
  PagedConfigsResponse,
  PagedTasksResponse,
  AnalyticsResponse,
  OverallStatsResponse,
  ParserCatalogItem,
  ParserDetailsResponse,
  ParserParameterDefinition,
  ParserRunStatus,
  RunParserBySlugResponse,
  CreateInternalConfigDto,
  CreateExternalConfigDto,
  CreateExternalConfigResponse,
  UpdateConfigDto,
  TaskStatusResponse,
  UserConfig,
} from '../types/storage';

const validStatuses: ParserRunStatus[] = ['Running', 'Success', 'Failed'];

const toStatusOrNull = (value: unknown): ParserRunStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return validStatuses.includes(value as ParserRunStatus)
    ? (value as ParserRunStatus)
    : null;
};

const normalizeConfigItem = (item: unknown): UserConfig | null => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const typeRaw = raw.$type ?? raw.type ?? raw.Type;
  const type = typeof typeRaw === 'string' ? typeRaw.toLowerCase() : '';

  const configIdRaw = raw.id;
  const configId = typeof configIdRaw === 'string' ? configIdRaw : '';
  if (!configId) {
    return null;
  }

  const parserSlugRaw = raw.parserSlug ?? raw.ParserSlug ?? raw.slug ?? raw.Slug;
  const parserSlug = typeof parserSlugRaw === 'string' ? parserSlugRaw : null;
  if (!parserSlug) {
    return null;
  }

  const isEnabledRaw = raw.isEnabled ?? raw.IsEnabled;
  const isEnabled = typeof isEnabledRaw === 'boolean' ? isEnabledRaw : false;

  const lastRunAtRaw = raw.lastRunAt ?? raw.LastRunAt;
  const lastRunAt = typeof lastRunAtRaw === 'string' ? lastRunAtRaw : null;

  const lastStatusRaw = raw.lastStatus ?? raw.LastStatus;
  const lastStatus = toStatusOrNull(lastStatusRaw);

  const lastErrorRaw = raw.lastErrorMessage ?? raw.LastErrorMessage;
  const lastErrorMessage = typeof lastErrorRaw === 'string' ? lastErrorRaw : null;

  if (type === 'internal') {
    const cronRaw = raw.cronExpression ?? raw.CronExpression;
    const cronExpression = typeof cronRaw === 'string' ? cronRaw : '';
    const customNameRaw = raw.customName ?? raw.CustomName;
    const customName = typeof customNameRaw === 'string' ? customNameRaw : undefined;
    const optionsRaw = raw.options ?? raw.Options;
    const options = optionsRaw && typeof optionsRaw === 'object'
      ? (optionsRaw as Record<string, string>)
      : undefined;

    return {
      $type: 'internal',
      configId,
      parserSlug,
      isEnabled,
      lastRunAt,
      lastStatus,
      lastErrorMessage,
      customName,
      cronExpression,
      options,
    };
  }

  const tokenHashRaw = raw.tokenHash ?? raw.TokenHash;
  const tokenHash = typeof tokenHashRaw === 'string' ? tokenHashRaw : undefined;

  return {
    $type: 'external',
    configId,
    parserSlug,
    isEnabled,
    lastRunAt,
    lastStatus,
    lastErrorMessage,
    tokenHash,
  };
};

const normalizePagedConfigsResponse = (payload: unknown): PagedConfigsResponse => {
  const raw = (payload ?? {}) as Record<string, unknown>;

  const itemsRaw = Array.isArray(payload)
    ? payload
    : Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.Items)
        ? (raw.Items as unknown[])
        : [];

  const items = itemsRaw
    .map(normalizeConfigItem)
    .filter((item): item is UserConfig => item !== null);

  const totalCountRaw = raw.totalCount ?? raw.TotalCount;
  const pageRaw = raw.page ?? raw.Page;
  const totalPagesRaw = raw.totalPages ?? raw.TotalPages;
  const pageSizeRaw = raw.pageSize ?? raw.PageSize;

  const totalCount = typeof totalCountRaw === 'number' ? totalCountRaw : items.length;
  const page = typeof pageRaw === 'number' ? pageRaw : 1;
  const totalPages = typeof totalPagesRaw === 'number' ? totalPagesRaw : 1;
  const pageSize = typeof pageSizeRaw === 'number' ? pageSizeRaw : items.length;

  return {
    items,
    totalCount,
    page,
    totalPages,
    pageSize,
  };
};

const normalizeParserDetailsResponse = (payload: unknown): ParserDetailsResponse => {
  const raw = (payload ?? {}) as Record<string, unknown>;

  const parametersRaw = Array.isArray(raw.parameters)
    ? raw.parameters
    : Array.isArray(raw.Parameters)
      ? (raw.Parameters as unknown[])
      : [];

  const parameters: ParserParameterDefinition[] = parametersRaw
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as Record<string, unknown>;
      const optionsRaw = Array.isArray(row.options)
        ? row.options
        : Array.isArray(row.Options)
          ? (row.Options as unknown[])
          : [];

      return {
        name: String(row.name ?? row.Name ?? row.slug ?? row.Slug ?? ''),
        description: String(row.description ?? row.Description ?? ''),
        isRequired: Boolean(row.isRequired ?? row.IsRequired ?? false),
        options: optionsRaw
          .map((option) => {
            if (!option || typeof option !== 'object') {
              return null;
            }

            const opt = option as Record<string, unknown>;
            return {
              value: String(opt.value ?? opt.Value ?? ''),
              label: String(opt.label ?? opt.Label ?? ''),
            };
          })
          .filter((option): option is { value: string; label: string } => option !== null),
      };
    })
    .filter((parameter): parameter is ParserParameterDefinition => parameter !== null && parameter.name.length > 0);

  const sourceTypeRaw = raw.sourceType ?? raw.SourceType;
  const sourceTypeNormalized = typeof sourceTypeRaw === 'string' ? sourceTypeRaw.toLowerCase() : 'internal';
  const sourceType = sourceTypeNormalized === 'external'
    ? 'external'
    : sourceTypeNormalized === 'plugin'
      ? 'plugin'
      : 'internal';

  const metricFieldsRaw = Array.isArray(raw.metricFields)
    ? raw.metricFields
    : Array.isArray(raw.MetricFields)
      ? (raw.MetricFields as unknown[])
      : [];

  return {
    slug: String(raw.slug ?? raw.Slug ?? ''),
    displayName: String(raw.displayName ?? raw.DisplayName ?? raw.slug ?? raw.Slug ?? ''),
    description: String(raw.description ?? raw.Description ?? ''),
    sourceType,
    metricFields: metricFieldsRaw.map((metric) => String(metric)),
    parameters,
  };
};

const normalizePagedTasksResponse = (payload: unknown): PagedTasksResponse => {
  const raw = (payload ?? {}) as Record<string, unknown>;

  const itemsRaw = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.Items)
      ? (raw.Items as unknown[])
      : [];

  const items = itemsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as Record<string, unknown>;
      const status = toStatusOrNull(row.status ?? row.Status);
      const correlationId = row.correlationId ?? row.CorrelationId;
      const parserSlug = row.parserSlug ?? row.ParserSlug;
      const startedAt = row.startedAt ?? row.StartedAt;
      const finishedAtRaw = row.finishedAt ?? row.FinishedAt;

      if (
        !status ||
        typeof correlationId !== 'string' ||
        typeof parserSlug !== 'string' ||
        typeof startedAt !== 'string'
      ) {
        return null;
      }

      const errorMessageRaw = row.errorMessage ?? row.ErrorMessage;
      return {
        correlationId,
        parserSlug,
        status,
        errorMessage: typeof errorMessageRaw === 'string' ? errorMessageRaw : null,
        startedAt,
        finishedAt: typeof finishedAtRaw === 'string' ? finishedAtRaw : null,
      };
    })
    .filter((task): task is PagedTasksResponse['items'][number] => task !== null);

  const totalCountRaw = raw.totalCount ?? raw.TotalCount;
  const pageRaw = raw.page ?? raw.Page;
  const totalPagesRaw = raw.totalPages ?? raw.TotalPages;
  const pageSizeRaw = raw.pageSize ?? raw.PageSize;

  return {
    items,
    totalCount: typeof totalCountRaw === 'number' ? totalCountRaw : items.length,
    page: typeof pageRaw === 'number' ? pageRaw : 1,
    totalPages: typeof totalPagesRaw === 'number' ? totalPagesRaw : 1,
    pageSize: typeof pageSizeRaw === 'number' ? pageSizeRaw : items.length,
  };
};

const normalizeTaskStatusResponse = (payload: unknown): TaskStatusResponse | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const status = toStatusOrNull(raw.status ?? raw.Status);
  if (!status) {
    return null;
  }

  const errorMessageRaw = raw.errorMessage ?? raw.ErrorMessage;
  return {
    status,
    errorMessage: typeof errorMessageRaw === 'string' ? errorMessageRaw : undefined,
  };
};

/**
 * Storage API service for parser configs and analytics
 */
export const storageApi = {
  /**
   * Fetch all user configurations
   */
  getConfigs: async (): Promise<PagedConfigsResponse> => {
    const { data } = await axiosInstance.get('/storage/configs');
    return normalizePagedConfigsResponse(data);
  },

  /**
   * Fetch analytics data for a specific parser
   * @param slug - Parser slug identifier
   * @param days - Number of days of historical data (default: 7)
   */
  getAnalytics: async (slug: string, days: number = 7): Promise<AnalyticsResponse> => {
    const { data } = await axiosInstance.get<AnalyticsResponse>(
      `/storage/analytics/${slug}`,
      { params: { days } }
    );
    return data;
  },

  /**
   * Fetch available parser definitions from collector
   */
  getAvailableParsers: async (): Promise<ParserCatalogItem[]> => {
    const { data } = await axiosInstance.get<ParserCatalogItem[]>('/collector/parsers');
    return data;
  },

  /**
   * Fetch full parser details with parameter definitions
   */
  getParserDetails: async (slug: string): Promise<ParserDetailsResponse> => {
    const { data } = await axiosInstance.get(`/collector/parsers/${slug}`);
    return normalizeParserDetailsResponse(data);
  },

  /**
   * Run parser directly by slug with optional params without creating config
   */
  runParserBySlug: async (
    slug: string,
    options?: Record<string, string>
  ): Promise<RunParserBySlugResponse> => {
    const { data } = await axiosInstance.post<RunParserBySlugResponse>(
      `/collector/run/${slug}`,
      options && Object.keys(options).length > 0 ? options : undefined
    );
    return data;
  },

  /**
   * Create internal parser config
   */
  createInternalConfig: async (dto: CreateInternalConfigDto): Promise<void> => {
    await axiosInstance.post('/storage/configs/internal', dto);
  },

  /**
   * Create external parser config and get API token
   */
  createExternalConfig: async (dto: CreateExternalConfigDto): Promise<CreateExternalConfigResponse> => {
    const { data } = await axiosInstance.post<CreateExternalConfigResponse>(
      '/storage/configs/external',
      dto
    );
    return data;
  },

  /**
   * Update parser config (partial update)
   */
  updateConfig: async (configId: string, dto: UpdateConfigDto): Promise<void> => {
    await axiosInstance.patch(`/storage/configs/${configId}`, dto);
  },

  /**
   * Delete parser config
   */
  deleteConfig: async (configId: string): Promise<void> => {
    await axiosInstance.delete(`/storage/configs/${configId}`);
  },

  /**
   * Run saved parser config
   */
  runConfig: async (configId: string): Promise<RunParserBySlugResponse> => {
    const { data } = await axiosInstance.post<RunParserBySlugResponse>(
      `/storage/configs/${configId}/run`
    );
    return data;
  },

  /**
   * Stop a running parser (TODO: not yet implemented on backend)
   * @deprecated - endpoint not available yet
   */
  stopParser: async (_slug: string): Promise<void> => {
    // TODO: implement when backend endpoint is ready
    // Will use correlationId instead of slug
    throw new Error('Stop parser endpoint not yet implemented');
  },

  /**
   * Get overall statistics across all parsers
   */
  getOverallStats: async (): Promise<OverallStatsResponse> => {
    const { data } = await axiosInstance.get<OverallStatsResponse>('/storage/stats');
    return data;
  },

  /**
   * Get parser task list with execution status
   */
  getTasks: async (
    page: number = 1,
    pageSize: number = 50,
    oldFirst?: boolean
  ): Promise<PagedTasksResponse> => {
    const { data } = await axiosInstance.get('/storage/tasks', {
      params: { page, pageSize, oldFirst },
    });
    return normalizePagedTasksResponse(data);
  },

  /**
   * Get status for a specific task by correlation ID
   */
  getTaskStatus: async (correlationId: string): Promise<TaskStatusResponse> => {
    const { data } = await axiosInstance.get(`/storage/tasks/status/${correlationId}`);
    const normalized = normalizeTaskStatusResponse(data);
    if (!normalized) {
      throw new Error('Invalid task status response');
    }
    return normalized;
  },
};
