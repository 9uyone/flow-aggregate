import { useMemo, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';

interface PaginationJumpControlsProps {
  page: number;
  totalCount: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  bottomPadding?: number;
}

export const PaginationJumpControls: React.FC<PaginationJumpControlsProps> = ({
  page,
  totalCount,
  rowsPerPage,
  onPageChange,
  bottomPadding = 2,
}) => {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / rowsPerPage)),
    [totalCount, rowsPerPage]
  );
  const [pageInputDraft, setPageInputDraft] = useState<string | null>(null);
  const pageInput = pageInputDraft ?? String(page + 1);

  const jumpToPage = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages) - 1;
    onPageChange(nextPage);
    setPageInputDraft(null);
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Stack
      sx={{
        px: 2,
        pb: bottomPadding,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'flex-end',
        gap: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        Page {page + 1} of {totalPages}
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        <TextField
          size="small"
          label="Go to page"
          type="number"
          value={pageInput}
          onChange={(event) => setPageInputDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              jumpToPage();
            }
          }}
          slotProps={{
            htmlInput: {
              min: 1,
              max: totalPages,
              step: 1,
            },
          }}
          sx={{
            width: { xs: 'auto', sm: 140 },
            flex: { xs: 1, sm: 'none' },
            '& input[type="number"]::-webkit-outer-spin-button': {
              WebkitAppearance: 'auto',
              margin: 0,
            },
            '& input[type="number"]::-webkit-inner-spin-button': {
              WebkitAppearance: 'auto',
              margin: 0,
            },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={jumpToPage}
          sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Go
        </Button>
      </Stack>
    </Stack>
  );
};

export default PaginationJumpControls;
