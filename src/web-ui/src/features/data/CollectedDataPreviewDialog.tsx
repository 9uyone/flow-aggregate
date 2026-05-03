import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { storageApi } from '../../api';
import type { CollectedDataItem, ParserCatalogItem, ParserDetailsResponse } from '../../types/storage';
import { CollectedDataTable } from './CollectedDataTable';

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
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [items, setItems] = useState<CollectedDataItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [previewParserDetails, setPreviewParserDetails] = useState<ParserDetailsResponse | null>(null);
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

      const previewSlug = response.items[0]?.parserSlug;
      if (previewSlug) {
        const details = await storageApi.getParserDetails(previewSlug, false);
        setPreviewParserDetails(details);
      } else {
        setPreviewParserDetails(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview data';
      setError(message);
      setItems([]);
      setTotalCount(0);
      setPreviewParserDetails(null);
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

  const parserBySlug = useMemo(() => {
    const mapEntries = items.map((item) => {
      if (previewParserDetails && previewParserDetails.slug === item.parserSlug) {
        const parser: ParserCatalogItem = {
          slug: previewParserDetails.slug,
          displayName: previewParserDetails.displayName,
          description: previewParserDetails.description,
          sourceType: previewParserDetails.sourceType,
          metricFields: previewParserDetails.metricFields,
          dimensions: previewParserDetails.dimensions,
          supportsScheduledRun: previewParserDetails.supportsScheduledRun,
          supportsManualRun: previewParserDetails.supportsManualRun,
          supportsPushIngest: previewParserDetails.supportsPushIngest,
          supportsParameters: previewParserDetails.supportsParameters,
          isExternalOwnedByCurrentUser: false,
        };

        return [item.parserSlug, parser] as const;
      }

      const displayName = getParserDisplayName ? getParserDisplayName(item.parserSlug) : item.parserSlug;
      const parser: ParserCatalogItem = {
        slug: item.parserSlug,
        displayName,
        description: '',
        sourceType: 'internal',
        metricFields: [],
        dimensions: [],
        supportsScheduledRun: false,
        supportsManualRun: true,
        supportsPushIngest: false,
        supportsParameters: false,
        isExternalOwnedByCurrentUser: false,
      };

      return [item.parserSlug, parser] as const;
    });

    return new Map(mapEntries);
  }, [items, getParserDisplayName, previewParserDetails]);

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
        <CollectedDataTable
          displayedItems={items}
          parserBySlug={parserBySlug}
          isLoading={isLoading}
          error={error}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          onJumpPageChange={setPage}
          onCopyCorrelationId={(value) => void copyToClipboard(value)}
          onCopyConfigId={(value) => void copyToClipboard(value)}
          onOpenHistory={(value) => navigate(`/history?correlationId=${encodeURIComponent(value)}`)}
          variant="modal"
        />
      </DialogContent>
    </Dialog>
  );
};

export default CollectedDataPreviewDialog;
