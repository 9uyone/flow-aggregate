import type { MetricOption, ParserTrendResponse, TimeInterval, TimeRange } from '../../api';

export type PresetRange = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export const normalizeMetricOptions = (options: MetricOption[]): MetricOption[] => {
  const byMetric = new Map<string, Set<string>>();

  options.forEach((option) => {
    const metric = option.metric?.trim();
    if (!metric) {
      return;
    }

    const current = byMetric.get(metric) ?? new Set<string>();
    option.dimensions
      .map((dimension) => dimension.trim())
      .filter(Boolean)
      .forEach((dimension) => current.add(dimension));

    byMetric.set(metric, current);
  });

  return Array.from(byMetric.entries()).map(([metric, dimensions]) => ({
    metric,
    dimensions: Array.from(dimensions),
  }));
};

export const areStringArraysEqual = (first: string[], second: string[]) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
};

export const areDimensionOptionsEqual = (
  first: Record<string, string[]>,
  second: Record<string, string[]>
) => {
  const firstKeys = Object.keys(first).sort();
  const secondKeys = Object.keys(second).sort();

  if (!areStringArraysEqual(firstKeys, secondKeys)) {
    return false;
  }

  return firstKeys.every((key) => areStringArraysEqual(first[key] ?? [], second[key] ?? []));
};

export const toIsoStringOrNull = (value: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const getAutoIntervalForPreset = (range: PresetRange): TimeInterval | undefined => {
  switch (range) {
    case 'quarter':
      return 'week';
    case 'year':
      return 'month';
    default:
      return undefined;
  }
};

export const toRangeParam = (range: PresetRange): TimeRange => {
  switch (range) {
    case 'quarter':
      return 'quarter';
    case 'year':
      return 'year';
    case 'all':
      return 'all';
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'week';
  }
};

export const shouldOmitStatsIntervalForPreset = (range: PresetRange): boolean => (
  range === 'quarter' || range === 'year'
);

export const formatNumber = (value: number, fractionDigits: number = 2) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(fractionDigits);
};

export const normalizePercent = (value: number) => (Math.abs(value) <= 1 ? value * 100 : value);

export const getTrendMeta = (direction: ParserTrendResponse['direction']) => {
  switch (direction) {
    case 'up':
      return {
        label: 'up',
        text: 'Positive trend',
        color: 'success' as const,
      };
    case 'down':
      return {
        label: 'down',
        text: 'Negative trend',
        color: 'error' as const,
      };
    default:
      return {
        label: 'flat',
        text: 'Stable trend',
        color: 'default' as const,
      };
  }
};

export const getVolatilityMeta = (cvPercent: number) => {
  if (cvPercent < 10) {
    return { label: 'stable', text: 'Series stability: stable', color: 'success' as const };
  }

  if (cvPercent <= 25) {
    return { label: 'moderate', text: 'Series stability: moderate', color: 'warning' as const };
  }

  return { label: 'high volatility', text: 'Series stability: high volatility', color: 'error' as const };
};
