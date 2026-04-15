/**
 * TypeScript interfaces matching C# DTOs from the backend
 */

import type { PagedResponse } from './common';

export type ParserRunStatus = 'Running' | 'Success' | 'Failed';

export interface BaseParserConfig {
  configId: string;
  parserSlug: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastStatus: ParserRunStatus | null;
  lastErrorMessage: string | null;
}

export interface InternalParserConfig extends BaseParserConfig {
  $type: 'internal';
  customName?: string;
  cronExpression?: string;
  options?: Record<string, string>;
}

export interface ExternalParserConfig extends BaseParserConfig {
  $type: 'external';
  tokenHash?: string;
}

export interface PluginParserConfig extends BaseParserConfig {
  $type: 'plugin';
  pluginId: string;
  customName?: string;
  cronExpression?: string;
  options?: Record<string, string>;
}

export type UserConfig = InternalParserConfig | ExternalParserConfig | PluginParserConfig;

export type PagedConfigsResponse = PagedResponse<UserConfig>;

export type ParserSourceType = 'internal' | 'plugin' | 'external';

export interface ParserCatalogItem {
  slug: string;
  displayName: string;
  description: string;
  sourceType: ParserSourceType;
  metricFields: string[];
}

export interface ParserParameterOption {
  value: string;
  label: string;
}

export interface ParserParameterDefinition {
  name: string;
  description: string;
  isRequired: boolean;
  allowCustomValues: boolean;
  options: ParserParameterOption[];
}

export interface ParserDetailsResponse {
  slug: string;
  displayName: string;
  description: string;
  sourceType: ParserSourceType;
  metricFields: string[];
  parameters: ParserParameterDefinition[];
}

// Analytics data point
export interface AnalyticsDataPoint {
  slug: string;
  value: number;
  capturedAt: string;
}

// Analytics response
export interface AnalyticsResponse {
  slug: string;
  dataPoints: AnalyticsDataPoint[];
  totalRecords: number;
  averageValue: number;
}

export interface OverallStatsResponse {
  totalRecords: number;
  activeParsers: number;
  successRate: number;
}

export interface RunParserBySlugResponse {
  correlationId: string;
}

// Create config DTOs
export interface CreateInternalConfigDto {
  parserSlug: string;
  isEnabled?: boolean;
  customName?: string;
  cronExpression?: string;
  options?: Record<string, string>;
}

export interface CreateExternalConfigDto {
  parserSlug: string;
  isEnabled?: boolean;
}

export interface CreateExternalConfigResponse {
  token: string;
}

// Update config DTO (partial)
export interface UpdateConfigDto {
  isEnabled?: boolean;
  customName?: string; // internal / plugin only
  cronExpression?: string; // internal / plugin only
  options?: Record<string, string>; // internal / plugin only
}

export interface ParserTaskItem {
  correlationId: string;
  parserSlug: string;
  status: ParserRunStatus;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  recordsCount: number;
  parserOptions?: Record<string, string | number | boolean | null>;
}

export interface TaskStatusResponse {
  correlationId: string;
  parserSlug: string;
  status: ParserRunStatus;
  errorMessage?: string;
  startedAt: string;
  finishedAt: string | null;
  recordsCount: number;
  parserOptions?: Record<string, string | number | boolean | null>;
}

export type PagedTasksResponse = PagedResponse<ParserTaskItem>;

export interface CollectedDataItem {
  id: string;
  parserSlug: string;
  correlationId: string | null;
  configId: string | null;
  timestamp: string | null;
  capturedAt: string | null;
  metrics: Record<string, string | number | boolean | null>;
}

export type PagedCollectedDataResponse = PagedResponse<CollectedDataItem>;
