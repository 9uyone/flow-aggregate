import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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
  formatParserOptions: (options?: ParserTaskItem['parserOptions']) => string | null;
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

export const HistoryTable: React.FC<HistoryTableProps> = ({
  displayedTasks,
  parserBySlug,
  formatParserOptions,
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
                <TableCell sx={{ maxWidth: '180px', wordBreak: 'break-word' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal' }}>
                    {formatParserOptions(record.parserOptions) ?? '—'}
                  </Typography>
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
                  <Typography variant="caption" color="text.secondary">
                    {new Date(record.startedAt).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {record.finishedAt ? new Date(record.finishedAt).toLocaleString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    color={record.errorMessage ? 'error.main' : 'text.secondary'}
                  >
                    {record.errorMessage || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Preview collected data">
                      <IconButton
                        size="small"
                        onClick={() => onPreviewCollectedData(record.correlationId)}
                        aria-label="Preview collected data"
                      >
                        <VisibilityIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
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
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
    </Paper>
  );
};
