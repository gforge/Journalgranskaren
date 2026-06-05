import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PatientReviewStatus } from 'src/types/chart';

interface CompletionDialogProps {
  open: boolean;
  patientId: string;
  initialStatus: PatientReviewStatus | null;
  reviewerName: string;
  onSave: (done: boolean, comment: string) => void;
  onCancel: () => void;
}

export const CompletionDialog = ({
  open,
  patientId,
  initialStatus,
  reviewerName,
  onSave,
  onCancel,
}: CompletionDialogProps) => {
  const [done, setDone] = useState(false);
  const [comment, setComment] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      setDone(initialStatus?.done || false);
      setComment(initialStatus?.comment || '');
    }
  }, [open, initialStatus]);

  const handleSave = () => {
    onSave(done, comment);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {t('appName')} - Statusförändring
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Patient-ID: <strong>{patientId}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Granskare: <strong>{reviewerName}</strong>
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              color="primary"
            />
          }
          label="Markera journalen som KLAR (Done)"
          sx={{ mb: 2, display: 'block' }}
        />

        <TextField
          label="Kommentar (valfri) / Optional Comment"
          multiline
          rows={3}
          fullWidth
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          variant="outlined"
          placeholder="T.ex. Granskning klar, inga avvikelser funna."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="secondary">
          Avbryt
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Spara status
        </Button>
      </DialogActions>
    </Dialog>
  );
};
