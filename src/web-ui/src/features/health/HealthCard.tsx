import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmptyRounded';
import { useHealthStore } from '../../store/healthStore';
import type { ServiceName } from '../../api/healthApi';

const prettyName = (s: ServiceName) => {
  switch (s) {
    case 'analyze':
      return 'Analyze';
    case 'auth':
      return 'Auth';
    case 'collector':
      return 'Collector';
    case 'scheduler':
      return 'Scheduler';
    case 'storage':
      return 'Storage';
    default:
      return s;
  }
};

type OverallStatus = 'healthy' | 'degraded' | 'offline';

const getOverallStatus = (statuses: Array<{ ok: boolean; status: number | null } | null>): OverallStatus => {
  const nonNullStatuses = statuses.filter(Boolean) as Array<{ ok: boolean; status: number | null }>;

  if (nonNullStatuses.length === 0) {
    return 'degraded';
  }

  const allHealthy = nonNullStatuses.every((status) => status.ok === true);
  if (allHealthy) {
    return 'healthy';
  }

  const allOffline = nonNullStatuses.every(
    (status) => status.ok === false && (status.status === null || status.status >= 500),
  );

  if (allOffline) {
    return 'offline';
  }

  return 'degraded';
};

type RowStatus = 'healthy' | 'degraded' | 'offline';

const getRowStatus = (status: { ok: boolean; status: number | null } | null): RowStatus => {
  if (!status) {
    return 'degraded';
  }

  if (status.ok) {
    return 'healthy';
  }

  if (status.status === null || status.status >= 500) {
    return 'offline';
  }

  return 'degraded';
};

export const HealthCard: React.FC = () => {
  const theme = useTheme();
  const { statuses, isLoading, lastChecked, fetchHealth, startAutoRefresh, stopAutoRefresh } = useHealthStore();

  useEffect(() => {
    startAutoRefresh();
    return () => stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serviceEntries = Object.entries(statuses) as [ServiceName, any][];
  const overallStatus = getOverallStatus(serviceEntries.map(([, status]) => status));

  const overallMeta = {
    healthy: {
      label: 'Healthy',
      color: theme.palette.success.main,
      glow: `${theme.palette.success.main}20`,
    },
    degraded: {
      label: 'Degraded',
      color: theme.palette.warning.main,
      glow: `${theme.palette.warning.main}20`,
    },
    offline: {
      label: 'Offline',
      color: theme.palette.error.main,
      glow: `${theme.palette.error.main}20`,
    },
  }[overallStatus];

  const rowMeta = {
    healthy: {
      label: 'Healthy',
      color: theme.palette.success.main,
      icon: <CheckCircleIcon fontSize="small" />,
    },
    degraded: {
      label: 'Degraded',
      color: theme.palette.warning.main,
      icon: <ReportProblemOutlinedIcon fontSize="small" />,
    },
    offline: {
      label: 'Offline',
      color: theme.palette.error.main,
      icon: <ErrorOutlineIcon fontSize="small" />,
    },
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Service monitoring
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              pl: 1.5,
              pr: 1,
              py: 0.5,
              borderRadius: 999,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                  bgcolor: overallMeta.color,
                  boxShadow: `0 0 0 4px ${overallMeta.glow}`,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {overallMeta.label} · {lastChecked ? new Date(lastChecked).toLocaleTimeString() : '—'}
            </Typography>
            <Tooltip title="Refresh now">
              <span>
                <IconButton
                  size="small"
                  onClick={() => void fetchHealth()}
                  disabled={isLoading}
                  sx={{
                    ml: 0.5,
                    width: 28,
                    height: 28,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.default,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />

        <Stack direction="column" spacing={1}>
          {serviceEntries.map(([service, status]) => {
            const ok = status?.ok;
            return (
              <Box
                key={service}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.25,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                  {ok ? (
                    <CheckCircleIcon color="success" />
                  ) : status && status.status ? (
                    <ErrorOutlineIcon color="error" />
                  ) : (
                    <HourglassEmptyIcon color="disabled" />
                  )}

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {prettyName(service)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {status?.message ?? (status ? `HTTP ${status?.status ?? '—'}` : 'Unknown')}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    ml: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 999,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.default,
                    color: rowMeta[getRowStatus(status)].color,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rowMeta[getRowStatus(status)].icon}
                  <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1 }}>
                    {rowMeta[getRowStatus(status)].label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default HealthCard;
