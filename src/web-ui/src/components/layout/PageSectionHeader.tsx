import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type PageSectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  mb?: number;
};

export const PageSectionHeader: React.FC<PageSectionHeaderProps> = ({
  title,
  description,
  action,
  mb = 3,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5,
        mb,
      }}
    >
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>{action}</Box>}
    </Box>
  );
};

