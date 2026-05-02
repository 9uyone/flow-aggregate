import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  ContentCopy as ContentCopyIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { PaginationJumpControls } from '../../components';
import type { CollectedDataItem, ParserCatalogItem } from '../../types/storage';
import { DateValueCell, ParserLabel } from './CollectedDataViewParts';

interface CollectedDataTableProps {
  displayedItems: CollectedDataItem[];
  parserBySlug: Map<string, ParserCatalogItem>;
  isLoading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (_: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onJumpPageChange: (page: number) => void;
  onCopyCorrelationId: (correlationId: string) => void;
  onCopyConfigId: (configId: string) => void;
  onOpenHistory: (correlationId: string) => void;
  variant?: 'full' | 'modal';
}

interface MetricBadge {
  key: string;
  label: string;
  value: string;
  kind: 'metric' | 'metadata';
}

interface DimensionEntry {
  key: string;
  value: string;
}

interface RowMetricInfo {
  primaryMetric: { key: string; value: number } | null;
  dimensionSignature: string;
  badges: MetricBadge[];
  metadata: Record<string, string>;
}




const getPrimaryMetric = (metrics: CollectedDataItem['metrics']): { key: string; value: number } | null => {
  for (const [key, value] of Object.entries(metrics)) {
    if (key.startsWith('metadata.')) {
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return { key, value };
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return { key, value: parsed };
      }
    }
  }

  return null;
};

const getDimensionEntries = (metrics: CollectedDataItem['metrics']): DimensionEntry[] => {
  return Object.entries(metrics)
    .filter(([key, value]) => key.startsWith('metadata.') && value !== null && String(value).trim() !== '')
    .map(([key, value]) => ({ key: key.replace('metadata.', ''), value: String(value) }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

const getPrimaryDimension = (dimensions: DimensionEntry[]): DimensionEntry | null => {
  if (dimensions.length === 0) {
    return null;
  }

  const priorityKeys = ['city', 'station', 'location'];
  const priorityMatch = priorityKeys
    .map((key) => dimensions.find((dimension) => dimension.key === key))
    .find(Boolean);

  return priorityMatch ?? dimensions[0];
};

const getDimensionSignature = (dimensions: DimensionEntry[]): string => {
  if (dimensions.length === 0) {
    return '';
  }

  return dimensions.map((dimension) => `${dimension.key}=${dimension.value}`).join('|');
};

const getMetricBadges = (metrics: CollectedDataItem['metrics'], excludedKeys: string[]): MetricBadge[] => {
  const excluded = new Set(excludedKeys);

  return Object.entries(metrics)
    .filter(([key]) => !excluded.has(key))
        .map(([key, value]) => ({
      key,
      label: key.startsWith('metadata.') ? key.replace('metadata.', '') : key,
      value: value === null ? 'null' : String(value),
      kind: key.startsWith('metadata.') ? 'metadata' : 'metric',
    }));
};


const formatMainValue = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
};

const formatCodeJson = (value: unknown): string => {
  const escaped = JSON.stringify(value, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (match.startsWith('"')) {
        cls = match.endsWith(':') ? 'json-key' : 'json-string';
      } else if (match === 'true' || match === 'false') {
        cls = 'json-boolean';
      } else if (match === 'null') {
        cls = 'json-null';
      }

      return `<span class="${cls}">${match}</span>`;
    }
  );
};

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length < 2) {
    return null;
  }

  const width = 54;
  const height = 18;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - minValue) / span) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const trendIsUp = values[values.length - 1] >= values[0];

  return (
    <Box component="svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} sx={{ flexShrink: 0 }}>
      <polyline
        fill="none"
        stroke={trendIsUp ? '#2e7d32' : '#d32f2f'}
        strokeWidth="1.75"
        points={points}
      />
    </Box>
  );
};

export const CollectedDataTable: React.FC<CollectedDataTableProps> = ({
  displayedItems,
  parserBySlug,
  isLoading,
  error,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onJumpPageChange,
  onCopyCorrelationId,
  onCopyConfigId,
  onOpenHistory,
  variant = 'full',
}) => {
  const [rawJsonItem, setRawJsonItem] = useState<CollectedDataItem | null>(null);
  const showRawJsonButton = variant === 'full';

  const metricInfoById = useMemo(() => {
    const map = new Map<string, RowMetricInfo>();

    displayedItems.forEach((item) => {
      const primaryMetric = getPrimaryMetric(item.metrics);
      const dimensions = getDimensionEntries(item.metrics);
      const primaryDimension = getPrimaryDimension(dimensions);

      const metadataEntries = Object.entries(item.metrics)
        .filter(([k]) => k === 'unit' || k === 'source' || k === 'category' || k === 'metadata.unit' || k === 'metadata.source' || k === 'metadata.category' || k.startsWith('metadata.'))
        .map(([k, v]) => {
          const raw = k.replace(/^metadata\./, '');
          const key = raw === 'type' ? 'category' : raw;
          return [key, String(v ?? '')] as const;
        });
      const metadataMap: Record<string, string> = Object.fromEntries(metadataEntries);

      map.set(item.id, {
        primaryMetric,
        dimensionSignature: getDimensionSignature(dimensions),
        badges: getMetricBadges(item.metrics, [
          ...(primaryMetric ? [primaryMetric.key] : []),
          ...(primaryDimension ? [`metadata.${primaryDimension.key}`] : []),
          'metadata.unit',
          'unit',
          'metadata.source',
          'source',
          'metadata.category',
          'metadata.type',
          'type',
          'metadata.provider',
        ]),
        metadata: metadataMap,
      });
    });

    return map;
  }, [displayedItems]);

  const trendByItemId = useMemo(() => {
    const result = new Map<string, number[]>();
    const seriesState = new Map<string, number[]>();

    const sortedItems = [...displayedItems].sort((a, b) => {
      const aTime = new Date(a.timestamp ?? a.capturedAt ?? 0).getTime();
      const bTime = new Date(b.timestamp ?? b.capturedAt ?? 0).getTime();
      return aTime - bTime;
    });

    sortedItems.forEach((item) => {
      const metricInfo = metricInfoById.get(item.id);
      if (!metricInfo?.primaryMetric) {
        return;
      }

      const seriesKey = metricInfo.dimensionSignature
        ? `${metricInfo.primaryMetric.key}::${metricInfo.dimensionSignature}`
        : `${metricInfo.primaryMetric.key}::no-dim`;
      const prev = seriesState.get(seriesKey) ?? [];
      const next = [...prev, metricInfo.primaryMetric.value].slice(-8);

      seriesState.set(seriesKey, next);
      result.set(item.id, next);
    });

    return result;
  }, [displayedItems, metricInfoById]);

  const showSourceColumn = true;

  const emptyColSpan = 6 + (showSourceColumn ? 0 : -1);
  const highlightedRawJson = useMemo(
    () => (rawJsonItem ? formatCodeJson(rawJsonItem) : ''),
    [rawJsonItem]
  );

    return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      <TableContainer
                sx={{
          maxHeight: { xs: '60vh', sm: 'none' },
          overflowY: { xs: 'auto', sm: 'visible' },
          overflowX: { xs: 'auto', md: 'hidden' },
        }}
      >
        <Table
          stickyHeader
                    sx={{
            minWidth: '100%',
            '& .MuiTableCell-stickyHeader': {
              backgroundColor: 'background.paper',
              zIndex: 2,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Parser</TableCell>
              <TableCell>Category</TableCell>
              {showSourceColumn && <TableCell>Source</TableCell>}
              <TableCell>Timestamp</TableCell>
              <TableCell>Captured at</TableCell>
              <TableCell>Metrics</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
                        {displayedItems.map((item) => {
              const parser = parserBySlug.get(item.parserSlug);
              const metricFields = parser?.metricFields ?? [];
              const metricInfo = metricInfoById.get(item.id);
              const badges = metricInfo?.badges ?? [];
              const sortedBadges = [...badges].sort((a, b) => {
                const aIsMetricField = metricFields.includes(a.key) || metricFields.includes(a.label);
                const bIsMetricField = metricFields.includes(b.key) || metricFields.includes(b.label);

                if (aIsMetricField === bIsMetricField) {
                  return 0;
                }

                return aIsMetricField ? -1 : 1;
              });
              const sparklineValues = trendByItemId.get(item.id) ?? [];

              return (
                <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Box>
                      <ParserLabel
                        slug={item.parserSlug}
                        displayName={parser?.displayName}
                      />
                    </Box>
                  </TableCell>

                  <TableCell>
                    {metricInfo?.metadata?.category ? (
                      <Chip label={metricInfo.metadata.category} size="small" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>

                  {showSourceColumn && (
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2">
                            {metricInfo?.metadata?.provider || metricInfo?.metadata?.source || '—'}
                          </Typography>

                          {metricInfo?.metadata?.source && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                const toCopy = metricInfo.metadata.source;
                                try {
                                  void navigator.clipboard.writeText(toCopy || '');
                                } catch {
                                  // ignore
                                }
                              }}
                              aria-label="Copy source"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          )}
                        </Box>

                        {metricInfo?.metadata?.source && metricInfo?.metadata?.provider && metricInfo.metadata.source !== metricInfo.metadata.provider && (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {/^https?:\/\//i.test(metricInfo.metadata.source) ? (
                              <a
                                href={metricInfo.metadata.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'inherit', textDecoration: 'underline' }}
                              >
                                {metricInfo.metadata.source}
                              </a>
                            ) : (
                              metricInfo.metadata.source
                            )}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  )}

                  <TableCell>
                    <DateValueCell value={item.timestamp} />
                  </TableCell>

                  <TableCell>
                    <DateValueCell value={item.capturedAt} />
                  </TableCell>

                  <TableCell sx={{ minWidth: 300, width: '42%' }}>
                    <Stack spacing={0.75}>
                      {metricInfo?.primaryMetric ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                                {formatMainValue(metricInfo.primaryMetric.value)}
                              </Typography>
                              {metricInfo.metadata?.unit && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                  {metricInfo.metadata.unit}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {metricInfo.primaryMetric.key}
                            </Typography>
                          </Box>
                          {sparklineValues.length > 1 && (
                            <Box sx={{ ml: '6px' }}>
                              <Sparkline values={sparklineValues} />
                            </Box>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No numeric value
                        </Typography>
                      )}

                      {badges.length > 0 && (
                        <>
                          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 0.5 }} />
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ pt: 0.5 }}>
                            {sortedBadges.slice(0, 8).map((badge) => {
                              const isMetricField = metricFields.includes(badge.key) || metricFields.includes(badge.label);

                              return (
                                <Tooltip key={`${item.id}-${badge.key}`} title={`${badge.label}: ${badge.value}`}>
                                  <Chip
                                    size="small"
                                    label={`${badge.label}: ${badge.value}`}
                                    variant={isMetricField ? 'outlined' : 'filled'}
                                    color={isMetricField ? 'primary' : 'default'}
                                    sx={{
                                      borderRadius: 5,
                                      flex: '0 1 auto',
                                      maxWidth: '100%',
                                      ...(isMetricField
                                        ? {
                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            fontWeight: 500,
                                          }
                                        : {
                                            backgroundColor: 'action.hover',
                                            color: 'text.secondary',
                                          }),
                                      '& .MuiChip-label': {
                                        maxWidth: { xs: 220, sm: 320, md: 420 },
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      },
                                    }}
                                  />
                                </Tooltip>
                              );
                            })}
                            {sortedBadges.length > 8 && <Chip size="small" label={`+${sortedBadges.length - 8}`} />}
                          </Stack>
                        </>
                      )}
                    </Stack>
                  </TableCell>

                                    <TableCell align="right">
                    <Stack spacing={0.25} alignItems="flex-end">
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Copy correlation ID">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onCopyCorrelationId(item.correlationId ?? '')}
                              disabled={!item.correlationId}
                              aria-label="Copy correlation ID"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Copy config ID">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onCopyConfigId(item.configId ?? '')}
                              disabled={!item.configId}
                              aria-label="Copy config ID"
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        {showRawJsonButton && (
                          <>
                          <Tooltip title="Open history">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => onOpenHistory(item.correlationId ?? '')}
                                disabled={!item.correlationId}
                                aria-label="Open history"
                              >
                                <HistoryIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>

                            <Tooltip title="View raw JSON">
                              <IconButton
                                size="small"
                                onClick={() => setRawJsonItem(item)}
                                aria-label="View raw JSON"
                              >
                                <CodeIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </>)}
                      </Stack>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {displayedItems.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={emptyColSpan} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No collected data found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />

      <PaginationJumpControls
        page={page}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={onJumpPageChange}
      />

      {showRawJsonButton && (
        <Drawer anchor="right" open={rawJsonItem !== null} onClose={() => setRawJsonItem(null)}>
          <Box sx={{ width: { xs: '100vw', sm: 560 }, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="h6">Raw JSON</Typography>
                <Typography variant="caption" color="text.secondary">
                  {rawJsonItem?.id ?? '—'}
                </Typography>
              </Box>
              <IconButton onClick={() => setRawJsonItem(null)} aria-label="Close raw JSON panel">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                fontSize: '0.78rem',
                lineHeight: 1.45,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                overflowX: 'auto',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.default',
                '& .json-key': { color: 'primary.main' },
                '& .json-string': { color: 'success.dark' },
                '& .json-number': { color: 'warning.dark' },
                '& .json-boolean': { color: 'secondary.main' },
                '& .json-null': { color: 'text.secondary', fontStyle: 'italic' },
              }}
              dangerouslySetInnerHTML={{ __html: highlightedRawJson }}
            />
          </Box>
        </Drawer>
      )}
    </Paper>
  );
};
