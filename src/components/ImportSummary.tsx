import { useState } from 'react';
import { Box, Paper, Typography, Collapse, Button, Divider, Alert } from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  WarningAmberRounded as WarningAmberRoundedIcon,
  CheckCircleOutlined as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ParsedChartFile, ParseWarning } from 'src/types/chart';
import dayjs from 'dayjs';

interface ImportSummaryProps {
  parsedFile: ParsedChartFile;
  onClear: () => void;
}

export const ImportSummary = ({ parsedFile, onClear }: ImportSummaryProps) => {
  const { fileName, sheetName, columns, notes, warnings } = parsedFile;
  const [showWarnings, setShowWarnings] = useState(false);
  const { t } = useTranslation();

  // Extract unique patients
  const patientIds = Array.from(new Set(notes.map(n => n.note.patientId)));

  // Calculate date range
  const dates = notes
    .map(n => n.note.dateTime)
    .filter(d => d && !isNaN(new Date(d).getTime()))
    .map(d => new Date(d).getTime());

  let dateRangeStr = 'N/A';
  if (dates.length > 0) {
    const minDate = dayjs(Math.min(...dates));
    const maxDate = dayjs(Math.max(...dates));
    dateRangeStr = minDate.isSame(maxDate, 'day')
      ? minDate.format('YYYY-MM-DD')
      : `${minDate.format('YYYY-MM-DD')}${t('dateTo')}${maxDate.format('YYYY-MM-DD')}`;
  }

  // Count unique note types
  const noteTypes = Array.from(new Set(notes.map(n => n.note.noteType)));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        maxWidth: '680px',
        mx: 'auto',
        backgroundColor: 'background.paper',
        textAlign: 'left',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t('importSummaryTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('loaded')}: <strong>{fileName}</strong> {sheetName ? `(${sheetName})` : ''}
          </Typography>
        </Box>
        <Button variant="outlined" size="small" color="secondary" onClick={onClear}>
          {t('loadAnotherFile')}
        </Button>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('notesCount')}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>{notes.length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('patientsCount')}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{patientIds.length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('categoriesCount')}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{noteTypes.length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('dateSpan')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {dateRangeStr}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {t('matchedColumns')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {columns.map((col: string, idx: number) => (
            <Box
              key={idx}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              {col}
            </Box>
          ))}
        </Box>
      </Box>

      {warnings.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity="warning"
            icon={<WarningAmberRoundedIcon fontSize="small" />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowWarnings(!showWarnings)}
                endIcon={showWarnings ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              >
                {showWarnings ? t('hideDetails') : t('showDetails')} ({warnings.length})
              </Button>
            }
            sx={{ borderRadius: 1.5, py: 0.5, px: 2 }}
          >
            {t('importCompletedWarnings', { count: warnings.length })}
          </Alert>

          <Collapse in={showWarnings}>
            <Box
              sx={{
                mt: 1,
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'warning.light',
                borderRadius: 1.5,
                p: 1.5,
                backgroundColor: 'rgba(255, 152, 0, 0.04)',
              }}
            >
              {warnings.map((warn: ParseWarning, index: number) => (
                <Box key={index} sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'warning.dark' }}>
                    {warn.row > 0 ? `Row ${warn.row}: ` : ''}
                    {warn.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      ) : (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          sx={{ borderRadius: 1.5, py: 0.5, px: 2, mt: 2 }}
        >
          {t('fileParsedSuccess')}
        </Alert>
      )}
    </Paper>
  );
};
