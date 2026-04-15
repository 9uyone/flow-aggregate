import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { ParserConfig } from '../../store/parserStore';

interface ConfirmDeleteConfigDialogProps {
  open: boolean;
  config: ParserConfig | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmDeleteConfigDialog: React.FC<ConfirmDeleteConfigDialogProps> = ({
  open,
  config,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete config</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete{' '}
          <strong>{config?.customName || config?.slug}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
