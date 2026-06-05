import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ReviewerDialogProps {
  open: boolean;
  onSave: (name: string) => void;
  initialValue?: string;
  forcePrompt?: boolean;
}

export const ReviewerDialog = ({ open, onSave, initialValue = '', forcePrompt = false }: ReviewerDialogProps) => {
  const [name, setName] = useState(initialValue);
  const { t } = useTranslation();

  useEffect(() => {
    setName(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={forcePrompt ? () => {
        // Ignore close requests when forced
      } : () => onSave(initialValue)}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {forcePrompt ? t('securityNoticeTitle') : t('appName')}
        </DialogTitle>
        <DialogContent sx={{ minWidth: { xs: '280px', sm: '400px' } }}>
          <DialogContentText sx={{ mb: 2 }}>
            {forcePrompt
              ? 'Ange ditt namn för att påbörja granskningen (sparas lokalt på denna dator):'
              : 'Ändra granskarnamn:'}
          </DialogContentText>
          <TextField
            autoFocus
            required
            fullWidth
            label="Granskarnamn / Reviewer Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!forcePrompt && (
            <Button color="secondary" onClick={() => onSave(initialValue)}>
              Avbryt
            </Button>
          )}
          <Button type="submit" variant="contained" color="primary" disabled={!name.trim()}>
            Spara
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
