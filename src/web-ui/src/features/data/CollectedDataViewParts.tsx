import { Box, Chip, Stack, Typography } from '@mui/material';
import type { CollectedDataItem } from '../../types/storage';

const formatMetadataLabel = (key: string) => {
  if (key === 'unit') {
    return 'Unit';
  }
  if (key === 'location') {
    return 'Location';
  }
  if (key === 'provider') {
    return 'Provider';
  }
  return key;
};

interface ParserLabelProps {
  slug: string;
  displayName?: string;
  metricFields?: string[];
  showMetricFields?: boolean;
}

export const ParserLabel: React.FC<ParserLabelProps> = ({
  slug,
  displayName,
  metricFields = [],
  showMetricFields = false,
}) => {
  const resolvedName = displayName ?? slug;

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" fontWeight={500}>
        {resolvedName}
      </Typography>
      {resolvedName !== slug && (
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          ({slug})
        </Typography>
      )}
      {showMetricFields && metricFields.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Fields: {metricFields.slice(0, 3).join(', ')}{metricFields.length > 3 ? ` +${metricFields.length - 3}` : ''}
        </Typography>
      )}
    </Stack>
  );
};

interface MetricsSummaryProps {
  metrics: CollectedDataItem['metrics'];
  compact?: boolean;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ metrics, compact = false }) => {
  const entries = Object.entries(metrics);
  const preview = entries.slice(0, 3);
  const extraCount = Math.max(entries.length - preview.length, 0);
  const metadata = entries.filter(([key]) => key.startsWith('metadata.'));

  return (
    <Stack spacing={compact ? 0.5 : 0.75}>
      <Typography variant="caption" color="text.secondary">
        {preview.length === 0 && 'No metrics'}
        {preview.map(([key, value], index) => (
          <Box component="span" key={key} sx={{ mr: index < preview.length - 1 ? (compact ? 1.25 : 1.5) : 0 }}>
            <strong>{key}</strong>: {String(value ?? 'null')}
          </Box>
        ))}
        {extraCount > 0 && (
          <Box component="span" sx={{ ml: 1 }}>
            +{extraCount} more
          </Box>
        )}
      </Typography>

      {metadata.length > 0 && (
        <Stack direction="row" spacing={compact ? 0.5 : 0.75} flexWrap="wrap" useFlexGap>
          {metadata.map(([key, value]) => {
            const rawLabel = key.replace('metadata.', '');
            const label = formatMetadataLabel(rawLabel);

            return (
              <Chip
                key={key}
                label={`${label}: ${String(value ?? 'null')}`}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.72rem' }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
