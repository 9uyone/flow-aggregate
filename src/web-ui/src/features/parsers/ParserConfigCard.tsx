import { Box, Card, CardActionArea, CardContent, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { ParserConfig } from '../../store/parserStore';
import {
  getConfigStatusColor,
  getConfigStatusLabel,
  getParserTypeChipProps,
  getParserTypeLabel,
  getScheduleModeChipProps,
  getScheduleModeLabel,
} from './parserUiHelpers';

interface ParserConfigCardProps {
  config: ParserConfig;
  parserName: string;
  parserDescription: string;
  metricOptionsCount: number;
  dimensionCount: number;
  supportsManualRun: boolean;
  selected: boolean;
  isRunning: boolean;
  isPreparingRun: boolean;
  displayedStatus: ParserConfig['status'];
  latestOptionsPreview?: string | null;
  onCardClick: (slug: string) => void;
  onEdit: (config: ParserConfig, event: React.MouseEvent) => void;
  onDelete: (config: ParserConfig, event: React.MouseEvent) => void;
  onRun: (config: ParserConfig, event: React.MouseEvent) => void;
  onStop: (slug: string, event: React.MouseEvent) => void;
}

export const ParserConfigCard: React.FC<ParserConfigCardProps> = ({
  config,
  parserName,
  parserDescription,
  metricOptionsCount,
  dimensionCount,
  supportsManualRun,
  selected,
  isRunning,
  isPreparingRun,
  displayedStatus,
  latestOptionsPreview,
  onCardClick,
  onEdit,
  onDelete,
  onRun,
  onStop,
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        border: selected ? 2 : 0,
        borderColor: 'primary.main',
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        onClick={() => onCardClick(config.slug)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flex: 1, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600}>
                {parserName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip
                  label={getParserTypeLabel(config.sourceType)}
                  size="small"
                  variant="outlined"
                  {...getParserTypeChipProps(config.sourceType)}
                />
                <Chip
                  label={getConfigStatusLabel(displayedStatus)}
                  color={getConfigStatusColor(displayedStatus)}
                  size="small"
                />
                <Chip
                  label={getScheduleModeLabel(config.cronExpression)}
                  size="small"
                  {...getScheduleModeChipProps(config.cronExpression)}
                />
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {parserDescription || 'No description'}
          </Typography>

          {config.configOptions && Object.keys(config.configOptions).length > 0 && (
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Params: {Object.entries(config.configOptions)
                .map(([key, value]) => `${key}=${value}`)
                .join(', ')}
            </Typography>
          )}

          {latestOptionsPreview && (
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Last task options: {latestOptionsPreview}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip size="small" label={`Metrics: ${metricOptionsCount}`} variant="outlined" />
            <Chip size="small" label={`Dimensions: ${dimensionCount}`} variant="outlined" />
          </Box>

          {config.cronExpression && (
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Cron: {config.cronExpression}
            </Typography>
          )}

          {config.lastRunAt && (
            <Typography variant="caption" display="block" color="text.secondary" mt={1}>
              Last run: {new Date(config.lastRunAt).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          p: 2,
          pt: 0,
        }}
      >
        <Tooltip title="Edit">
          <IconButton size="small" onClick={(e) => onEdit(config, e)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={(e) => onDelete(config, e)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isRunning || displayedStatus === 'Running' ? (
          <Tooltip title="Stop">
            <span>
              <IconButton
                size="small"
                color="warning"
                onClick={(e) => onStop(config.slug, e)}
                disabled={isRunning}
              >
                {isRunning ? <CircularProgress size={20} /> : <StopIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="Run">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => onRun(config, e)}
                disabled={isRunning || isPreparingRun || !supportsManualRun}
              >
                {isRunning || isPreparingRun ? <CircularProgress size={20} /> : <PlayIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Card>
  );
};
