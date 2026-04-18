import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Parser, ParserConfig } from '../../store/parserStore';
import { ParserConfigCard } from './ParserConfigCard';

interface ConfiguredParsersSectionProps {
  configuredParsers: ParserConfig[];
  parserBySlug: Map<string, Parser>;
  selectedParserSlug: string | null;
  isPreparingRun: boolean;
  latestTaskOptionsBySlug: Record<string, Record<string, string> | undefined>;
  formatOptionsPreview: (options?: Record<string, string>) => string | null;
  isSlugRunning: (slug: string) => boolean;
  getDisplayedConfigStatus: (config: ParserConfig) => ParserConfig['status'];
  onCardClick: (slug: string) => void;
  onEdit: (config: ParserConfig, event: React.MouseEvent) => void;
  onDelete: (config: ParserConfig, event: React.MouseEvent) => void;
  onRun: (config: ParserConfig, event: React.MouseEvent) => void;
  onStop: (slug: string, event: React.MouseEvent) => void;
  onAddConfig: () => void;
  onRefresh: () => void | Promise<void>;
}

export const ConfiguredParsersSection: React.FC<ConfiguredParsersSectionProps> = ({
  configuredParsers,
  parserBySlug,
  selectedParserSlug,
  isPreparingRun,
  latestTaskOptionsBySlug,
  formatOptionsPreview,
  isSlugRunning,
  getDisplayedConfigStatus,
  onCardClick,
  onEdit,
  onDelete,
  onRun,
  onStop,
  onAddConfig,
  onRefresh,
}) => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2,
        }}
      >
        <Typography variant="h6">Saved configs</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddConfig}>
          Add config
        </Button>
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {configuredParsers.length === 0 ? (
          <Grid size={12}>
            <Card>
              <CardContent
                sx={{
                  textAlign: 'center',
                  py: 6,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No saved configurations
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Create a configuration with parameters and optional schedule for recurring runs
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={onRefresh}>
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          configuredParsers.map((config) => {
            const parserDefinition = parserBySlug.get(config.slug);
            const parserName = config.customName || parserDefinition?.name || config.slug;
            const parserDescription =
              parserDefinition?.description ||
              (config.sourceType === 'internal'
                ? 'Internal parser configuration'
                : 'External parser configuration');
            const metricOptionsCount = parserDefinition?.metricOptions.length ?? 0;
            const dimensionCount = Array.from(new Set(parserDefinition?.metricOptions.flatMap((option) => option.dimensions) ?? [])).length;

            return (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={config.configId}>
                <ParserConfigCard
                  config={config}
                  parserName={parserName}
                  parserDescription={parserDescription}
                  metricOptionsCount={metricOptionsCount}
                  dimensionCount={dimensionCount}
                  selected={selectedParserSlug === config.slug}
                  isRunning={isSlugRunning(config.slug)}
                  isPreparingRun={isPreparingRun}
                  displayedStatus={getDisplayedConfigStatus(config)}
                  latestOptionsPreview={formatOptionsPreview(latestTaskOptionsBySlug[config.slug])}
                  onCardClick={onCardClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRun={onRun}
                  onStop={onStop}
                />
              </Grid>
            );
          })
        )}
      </Grid>
    </>
  );
};
