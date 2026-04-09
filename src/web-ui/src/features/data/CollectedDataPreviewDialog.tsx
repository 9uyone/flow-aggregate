import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  IconButton,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { storageApi } from '../../api';
import { PaginationJumpControls } from '../../components';
import type { CollectedDataItem } from '../../types/storage';
import { MetricsSummary, ParserLabel } from './CollectedDataViewParts';

interface CollectedDataPreviewDialogProps {
  open: boolean;
  correlationId: string | null;
  onClose: () => void;
  getParserDisplayName?: (slug: string) => string;
}

export const CollectedDataPreviewDialog: React.FC<CollectedDataPreviewDialogProps> = ({
  open,
  correlationId,
  onClose,
  getParserDisplayName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [items, setItems] = useState<CollectedDataItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [correlationId]);

  const copyToClipboard = useCallback(async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard failures.
    }
  }, []);

  const fetchPreviewData = useCallback(async () => {
    if (!open || !correlationId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await storageApi.getCollectedData(page + 1, rowsPerPage, {
        oldFirst: false,
        correlationId,
      });

      setItems(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview data';
      setError(message);
      setItems([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [open, correlationId, page, rowsPerPage]);

  useEffect(() => {
    void fetchPreviewData();
  }, [fetchPreviewData]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const title = useMemo(() => {
    if (!correlationId) {
      return 'Run preview';
    }

    return `Run preview · ${correlationId}`;
  }, [correlationId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
        sx: isMobile
          ? {
              width: '96vw',
              //minHeight: '40vh',
              maxHeight: '90vh',
              height: 'auto',
              m: 1,
            }
          : undefined,
        }
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          aria-label="Close preview"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 10 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!isLoading && (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
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
                  {items.map((item) => {
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <ParserLabel
                            slug={item.parserSlug}
                            displayName={getParserDisplayName ? getParserDisplayName(item.parserSlug) : item.parserSlug}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.capturedAt ? new Date(item.capturedAt).toLocaleString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <MetricsSummary metrics={item.metrics} compact />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Copy correlation ID">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => void copyToClipboard(item.correlationId ?? '')}
                                  disabled={!item.correlationId}
                                >
                                  <ContentCopyIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Copy config ID">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => void copyToClipboard(item.configId ?? '')}
                                  disabled={!item.configId}
                                >
                                  <ContentCopyIcon fontSize="inherit" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No collected records found for this run
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
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <PaginationJumpControls
              page={page}
              totalCount={totalCount}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              bottomPadding={1}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CollectedDataPreviewDialog;
