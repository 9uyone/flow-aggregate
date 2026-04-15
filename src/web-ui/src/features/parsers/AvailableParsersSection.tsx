import { Card, CardContent, Grid, Typography } from '@mui/material';
import type { Parser } from '../../store/parserStore';
import { AvailableParserCard } from './AvailableParserCard';

interface AvailableParsersSectionProps {
  parsers: Parser[];
  selectedParserSlug: string | null;
  isPreparingRun: boolean;
  latestTaskOptionsBySlug: Record<string, Record<string, string> | undefined>;
  formatOptionsPreview: (options?: Record<string, string>) => string | null;
  isSlugRunning: (slug: string) => boolean;
  onCardClick: (slug: string) => void;
  onRun: (slug: string, event: React.MouseEvent) => void;
  onCreateConfig: (slug: string, event: React.MouseEvent) => void;
}

export const AvailableParsersSection: React.FC<AvailableParsersSectionProps> = ({
  parsers,
  selectedParserSlug,
  isPreparingRun,
  latestTaskOptionsBySlug,
  formatOptionsPreview,
  isSlugRunning,
  onCardClick,
  onRun,
  onCreateConfig,
}) => {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Available parsers
      </Typography>
      <Grid container spacing={3}>
        {parsers.length === 0 ? (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No manageable parsers available from collector
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          parsers.map((parser) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`available-${parser.slug}`}>
              <AvailableParserCard
                parser={parser}
                selected={selectedParserSlug === parser.slug}
                isRunning={isSlugRunning(parser.slug)}
                isPreparingRun={isPreparingRun}
                latestOptionsPreview={formatOptionsPreview(latestTaskOptionsBySlug[parser.slug])}
                onCardClick={onCardClick}
                onRun={onRun}
                onCreateConfig={(e) => onCreateConfig(parser.slug, e)}
              />
            </Grid>
          ))
        )}
      </Grid>
    </>
  );
};
