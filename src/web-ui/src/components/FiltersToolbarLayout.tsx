import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface FiltersToolbarLayoutProps {
  topRowLeft: ReactNode;
  topRowRight?: ReactNode;
  secondRowLeft: ReactNode;
  secondRowRight?: ReactNode;
  helperText?: ReactNode;
  advancedSection?: ReactNode;
}

export const FiltersToolbarLayout: React.FC<FiltersToolbarLayoutProps> = ({
  topRowLeft,
  topRowRight,
  secondRowLeft,
  secondRowRight,
  helperText,
  advancedSection,
}) => {
  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {topRowLeft}
        </Box>

        {topRowRight && (
          <Box sx={{ ml: { xs: 0, md: 2 }, width: { xs: '100%', md: 'auto' } }}>
            {topRowRight}
          </Box>
        )}
      </Stack>

      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {secondRowLeft}
        {secondRowRight && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: { md: 'auto' } }}>
            {secondRowRight}
          </Box>
        )}
      </Box>

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -2, mb: 2 }}>
          {helperText}
        </Typography>
      )}

      {advancedSection}
    </>
  );
};
