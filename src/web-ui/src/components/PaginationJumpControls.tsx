import { useEffect, useMemo, useState } from 'react';
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
  const [pageInput, setPageInput] = useState(String(page + 1));

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const jumpToPage = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages) - 1;
    onPageChange(nextPage);
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="flex-end"
      sx={{ px: 2, pb: bottomPadding }}
    >
      <Typography variant="caption" color="text.secondary">
        Page {page + 1} of {totalPages}
      </Typography>
      <TextField
        size="small"
        label="Go to page"
        type="number"
        value={pageInput}
        onChange={(event) => setPageInput(event.target.value)}
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
        sx={{ width: { xs: '100%', sm: 140 } }}
      />
      <Button variant="outlined" size="small" onClick={jumpToPage}>
        Go
      </Button>
    </Stack>
  );
};

export default PaginationJumpControls;
