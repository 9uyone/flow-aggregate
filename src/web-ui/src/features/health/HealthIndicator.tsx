import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { useHealthStore } from '../../store/healthStore';
import { useNavigate } from 'react-router-dom';

type StatusColor = 'green' | 'yellow' | 'red';

const statusColorToHex: Record<StatusColor, string> = {
  green: '#16a34a',
  yellow: '#f59e0b',
  red: '#ef4444',
};

const computeOverall = (statuses: Record<string, any>): StatusColor => {
  const vals = Object.values(statuses);
  if (vals.length === 0) return 'yellow';

  const anyFailed = vals.some((s) => s && s.ok === false);
  if (anyFailed) return 'red';

  const allOk = vals.every((s) => s && s.ok === true);
  if (allOk) return 'green';

  return 'yellow';
};

export const HealthIndicator: React.FC = () => {
  const { statuses } = useHealthStore();
  const navigate = useNavigate();
  const overall = computeOverall(statuses);

  const title =
    overall === 'green'
      ? 'All services healthy'
      : overall === 'red'
      ? 'Some services unhealthy'
      : 'Services status degraded or unknown';

  return (
    <Tooltip title={title}>
      <Box
        onClick={() => navigate('/health')}
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: statusColorToHex[overall],
          cursor: 'pointer',
          border: '1px solid rgba(0,0,0,0.08)',
          mr: 1,
        }}
        aria-label="services-health-indicator"
      />
    </Tooltip>
  );
};

export default HealthIndicator;
