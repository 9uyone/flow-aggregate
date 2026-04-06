import type { ChipProps } from '@mui/material';
import type { ParserConfig } from '../../store/parserStore';
import type { ParserSourceType } from '../../types/storage';

export interface CronPreset {
  label: string;
  value: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 09:00', value: '0 9 * * *' },
  { label: 'Every Monday at 09:00', value: '0 9 * * 1' },
];

export const getConfigStatusColor = (status: ParserConfig['status']): ChipProps['color'] => {
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

export const getConfigStatusLabel = (status: ParserConfig['status']) => {
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

export const getParserTypeLabel = (sourceType: ParserSourceType) => {
  switch (sourceType) {
    case 'internal':
      return 'Internal';
    case 'plugin':
      return 'Plugin';
    case 'external':
      return 'External';
    default:
      return sourceType;
  }
};

export const getParserTypeChipProps = (sourceType: ParserSourceType): Pick<ChipProps, 'color'> => {
  switch (sourceType) {
    case 'internal':
      return { color: 'primary' };
    case 'plugin':
      return { color: 'secondary' };
    case 'external':
      return { color: 'default' };
    default:
      return { color: 'default' };
  }
};
