import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Dataset as DatasetIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { PaginationJumpControls } from '../../components';
import type { ParserRunStatus, ParserTaskItem } from '../../types/storage';

const getStatusColor = (status: ParserRunStatus) => {
  switch (status) {
    case 'Success':
      return 'success';
    case 'Failed':
      return 'error';
    case 'Running':
      return 'info';
    default:
      return 'default';
  }
};

interface HistoryTableProps {
  displayedTasks: ParserTaskItem[];
  parserBySlug: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (_: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onJumpPageChange: (page: number) => void;
  onPreviewCollectedData: (correlationId: string) => void;
  onCopyCorrelationId: (correlationId: string) => void;
  onOpenCollectedData: (correlationId: string) => void;
}

const formatDuration = (startedAt: string, finishedAt: string | null): string => {
  if (!finishedAt) {
    return '—';
  }

  const startedMs = new Date(startedAt).getTime();
  const finishedMs = new Date(finishedAt).getTime();

  if (!Number.isFinite(startedMs) || !Number.isFinite(finishedMs) || finishedMs < startedMs) {
    return '—';
  }

  const durationMs = finishedMs - startedMs;
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)} s`;
};

const formatOptionValue = (value: string | number | boolean | null): string => {
  if (value === null) {
    return 'null';
  }

  return String(value);
};

export const HistoryTable: React.FC<HistoryTableProps> = ({
  displayedTasks,
  parserBySlug,
  isLoading,
  error,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onJumpPageChange,
  onPreviewCollectedData,
    onCopyCorrelationId,
  onOpenCollectedData,
}) => {
  const [errorDialog, setErrorDialog] = useState<{ correlationId: string; message: string } | null>(null);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      <TableContainer
        sx={{
          maxHeight: { xs: '60vh', sm: 'none' },
          overflowY: { xs: 'auto', sm: 'visible' },
          overflowX: 'auto',
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: 980,
            '& .MuiTableCell-stickyHeader': {
              backgroundColor: 'background.paper',
              zIndex: 2,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Parser</TableCell>
              <TableCell>Options</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Records</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Finished</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Error</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedTasks.map((record) => (
              <TableRow
                key={record.correlationId}
                hover
                sx={{ '&:last-child td': { border: 0 } }}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={500}>
                      {parserBySlug.get(record.parserSlug) ?? record.parserSlug}
                    </Typography>
                    {parserBySlug.get(record.parserSlug) && parserBySlug.get(record.parserSlug) !== record.parserSlug && (
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        ({record.parserSlug})
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                                <TableCell sx={{ maxWidth: 260 }}>
                  {record.parserOptions && Object.entries(record.parserOptions).length > 0 ? (
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {Object.entries(record.parserOptions).slice(0, 4).map(([key, value]) => (
                        <Chip
                          key={`${record.correlationId}-${key}`}
                          size="small"
                          variant="outlined"
                          label={`${key}: ${formatOptionValue(value)}`}
                          sx={{ maxWidth: 230, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                        />
                      ))}
                      {Object.entries(record.parserOptions).length > 4 && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`+${Object.entries(record.parserOptions).length - 4}`}
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.status}
                    color={getStatusColor(record.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" fontWeight={600}>
                    {record.recordsCount.toLocaleString()}
                  </Typography>
                </TableCell>
                                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                    {new Date(record.startedAt).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                    {record.finishedAt ? new Date(record.finishedAt).toLocaleString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                    {formatDuration(record.startedAt, record.finishedAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {record.status === 'Failed' && record.errorMessage ? (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setErrorDialog({ correlationId: record.correlationId, message: record.errorMessage ?? '' })}
                    >
                      Show error
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {record.status === 'Success' && (
                      <Tooltip title="Preview collected data">
                        <IconButton
                          size="small"
                          onClick={() => onPreviewCollectedData(record.correlationId)}
                          aria-label="Preview collected data"
                        >
                        <VisibilityIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Copy correlation ID">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onCopyCorrelationId(record.correlationId)}
                          aria-label="Copy correlation ID"
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Open collected data">
                      <IconButton
                        size="small"
                        onClick={() => onOpenCollectedData(record.correlationId)}
                        aria-label="Open collected data"
                      >
                        <DatasetIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {displayedTasks.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No task logs found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />

            <PaginationJumpControls
        page={page}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={onJumpPageChange}
      />

      <Dialog
        open={errorDialog !== null}
        onClose={() => setErrorDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Task error details</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Correlation ID: {errorDialog?.correlationId}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {errorDialog?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
