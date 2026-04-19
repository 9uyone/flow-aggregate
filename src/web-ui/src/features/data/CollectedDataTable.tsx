import {
  Alert,
  Box,
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
  History as HistoryIcon,
} from '@mui/icons-material';
import { PaginationJumpControls } from '../../components';
import type { CollectedDataItem, ParserCatalogItem } from '../../types/storage';
import { MetricsSummary, ParserLabel } from './CollectedDataViewParts';

interface CollectedDataTableProps {
  displayedItems: CollectedDataItem[];
  parserBySlug: Map<string, ParserCatalogItem>;
  isLoading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (_: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onJumpPageChange: (page: number) => void;
  onCopyCorrelationId: (correlationId: string) => void;
  onCopyConfigId: (configId: string) => void;
  onOpenHistory: (correlationId: string) => void;
}

export const CollectedDataTable: React.FC<CollectedDataTableProps> = ({
  displayedItems,
  parserBySlug,
  isLoading,
  error,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onJumpPageChange,
  onCopyCorrelationId,
  onCopyConfigId,
  onOpenHistory,
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
            minWidth: 920,
            '& .MuiTableCell-stickyHeader': {
              backgroundColor: 'background.paper',
              zIndex: 2,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Parser</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Captured at</TableCell>
              <TableCell>Metrics</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedItems.map((item) => {
              const parser = parserBySlug.get(item.parserSlug);
              const metricFields = parser?.metricFields ?? [];

              return (
                <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <ParserLabel
                      slug={item.parserSlug}
                      displayName={parser?.displayName}
                      metricFields={metricFields}
                      showMetricFields
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {item.capturedAt ? new Date(item.capturedAt).toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <MetricsSummary metrics={item.metrics} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Copy correlation ID">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onCopyCorrelationId(item.correlationId ?? '')}
                            disabled={!item.correlationId}
                            aria-label="Copy correlation ID"
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Copy config ID">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onCopyConfigId(item.configId ?? '')}
                            disabled={!item.configId}
                            aria-label="Copy config ID"
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Open history">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onOpenHistory(item.correlationId ?? '')}
                            disabled={!item.correlationId}
                            aria-label="Open history"
                          >
                            <HistoryIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}

            {displayedItems.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No collected data found
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
