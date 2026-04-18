import { Box, Card, CardActionArea, CardContent, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { PlayArrow as PlayIcon, Add as AddIcon } from '@mui/icons-material';
import type { Parser } from '../../store/parserStore';
import { getParserTypeChipProps, getParserTypeLabel } from './parserUiHelpers';

interface AvailableParserCardProps {
  parser: Parser;
  selected: boolean;
  isRunning: boolean;
  isPreparingRun: boolean;
  latestOptionsPreview?: string | null;
  onCardClick: (slug: string) => void;
  onRun: (slug: string, event: React.MouseEvent) => void;
  onCreateConfig: (event: React.MouseEvent) => void;
}

export const AvailableParserCard: React.FC<AvailableParserCardProps> = ({
  parser,
  selected,
  isRunning,
  isPreparingRun,
  latestOptionsPreview,
  onCardClick,
  onRun,
  onCreateConfig,
}) => {
  const dimensionCount = Array.from(new Set(parser.metricOptions.flatMap((option) => option.dimensions))).length;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: selected ? 2 : 0,
        borderColor: 'primary.main',
      }}
    >
      <CardActionArea
        onClick={() => onCardClick(parser.slug)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600}>
                {parser.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip
                  label={getParserTypeLabel(parser.sourceType)}
                  size="small"
                  variant="outlined"
                  {...getParserTypeChipProps(parser.sourceType)}
                />
                <Chip label={parser.hasConfig ? 'Has saved configs' : 'No saved config'} size="small" />
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {parser.description || 'No description'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip size="small" label={`Metrics: ${parser.metricOptions.length}`} variant="outlined" />
            <Chip size="small" label={`Dimensions: ${dimensionCount}`} variant="outlined" />
          </Box>
          {latestOptionsPreview && (
            <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
              Last task options: {latestOptionsPreview}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2, pt: 0 }}>
        <Tooltip title="Create config">
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={onCreateConfig}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Run">
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => onRun(parser.slug, e)}
              disabled={isRunning || isPreparingRun || parser.sourceType === 'external'}
            >
              {isRunning || isPreparingRun ? <CircularProgress size={20} /> : <PlayIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Card>
  );
};
