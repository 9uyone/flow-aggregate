import React from 'react';
import { Box } from '@mui/material';
import HealthCard from './HealthCard';
import { PageSectionHeader } from '../../components/layout';

export const HealthPage: React.FC = () => {
  return (
    <Box>
      <PageSectionHeader title="Services health" mb={2} />
      <HealthCard />
    </Box>
  );
};

export default HealthPage;
