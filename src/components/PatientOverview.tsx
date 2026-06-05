import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  HelpOutlined as HelpOutlineIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ParsedChartNote, PatientReviewStatus } from 'src/types/chart';
import { downloadAuditLogsCSV } from 'src/db';
import dayjs from 'dayjs';

interface PatientOverviewProps {
  notes: ParsedChartNote[];
  reviewStatuses: Record<string, PatientReviewStatus>;
  onOpenChart: (patientId: string) => void;
  onOpenStatusDialog: (patientId: string) => void;
}

interface PatientRowData {
  id: string;
  name: string;
  age: number | string;
  notesCount: number;
  minDateTimestamp: number;
  maxDateTimestamp: number;
  dateRangeStr: string;
  isDone: boolean;
  statusComment: string;
}

type SortField = 'id' | 'name' | 'age' | 'notesCount' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

export const PatientOverview = ({
  notes,
  reviewStatuses,
  onOpenChart,
  onOpenStatusDialog,
}: PatientOverviewProps) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Group notes by patientId
  const patientData = useMemo(() => {
    const groups: Record<string, ParsedChartNote[]> = {};
    notes.forEach((n) => {
      const pid = n.note.patientId;
      if (!groups[pid]) groups[pid] = [];
      groups[pid].push(n);
    });

    const rows: PatientRowData[] = Object.keys(groups).map((pid) => {
      const pNotes = groups[pid];
      
      // Determine patient name
      const name = pNotes.find((n) => n.note.patientName)?.note.patientName || t('unknownPatient');
      
      // Determine patient age
      const ageVal = pNotes.find((n) => n.note.patientAge !== undefined)?.note.patientAge;
      const age = ageVal !== undefined ? ageVal : 'N/A';

      // Determine date range
      const dates = pNotes
        .map((n) => n.note.dateTime)
        .filter((d) => d && !isNaN(new Date(d).getTime()))
        .map((d) => new Date(d).getTime());

      const minDateTimestamp = dates.length > 0 ? Math.min(...dates) : 0;
      const maxDateTimestamp = dates.length > 0 ? Math.max(...dates) : 0;

      let dateRangeStr = 'N/A';
      if (dates.length > 0) {
        const minD = dayjs(minDateTimestamp);
        const maxD = dayjs(maxDateTimestamp);
        dateRangeStr = minD.isSame(maxD, 'day')
          ? minD.format('YYYY-MM-DD')
          : `${minD.format('YYYY-MM-DD')}${t('dateTo')}${maxD.format('YYYY-MM-DD')}`;
      }

      const status = reviewStatuses[pid];
      const isDone = status?.done || false;
      const statusComment = status?.comment || '';

      return {
        id: pid,
        name,
        age,
        notesCount: pNotes.length,
        minDateTimestamp,
        maxDateTimestamp,
        dateRangeStr,
        isDone,
        statusComment,
      };
    });

    return rows;
  }, [notes, reviewStatuses, t]);

  const handleRequestSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Sort patient list
  const sortedPatients = useMemo(() => {
    return [...patientData].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'age') {
        const ageA = typeof a.age === 'number' ? a.age : -1;
        const ageB = typeof b.age === 'number' ? b.age : -1;
        comparison = ageA - ageB;
      } else if (sortField === 'notesCount') {
        comparison = a.notesCount - b.notesCount;
      } else if (sortField === 'date') {
        comparison = a.minDateTimestamp - b.minDateTimestamp;
      } else if (sortField === 'status') {
        comparison = (a.isDone ? 1 : 0) - (b.isDone ? 1 : 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [patientData, sortField, sortOrder]);

  return (
    <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%', mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {t('overviewHeader')}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={downloadAuditLogsCSV}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {t('exportLogsBtn')}
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table aria-label="patient table">
          <TableHead sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'id'}
                  direction={sortField === 'id' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('id')}
                  sx={{ fontWeight: 600 }}
                >
                  Patient ID (Personnummer)
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('name')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('patientName')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'age'}
                  direction={sortField === 'age' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('age')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('patientAge')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'notesCount'}
                  direction={sortField === 'notesCount' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('notesCount')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('notesCount')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'date'}
                  direction={sortField === 'date' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('date')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('dateSpan')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('status')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('status')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPatients.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                  {row.id}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell align="center">{row.age}</TableCell>
                <TableCell align="center">{row.notesCount}</TableCell>
                <TableCell>{row.dateRangeStr}</TableCell>
                <TableCell align="center">
                  <Tooltip
                    title={row.statusComment ? `${t('comment')}: ${row.statusComment}` : ''}
                    arrow
                    placement="top"
                  >
                    <Chip
                      label={row.isDone ? t('done') : t('pending')}
                      color={row.isDone ? 'success' : 'default'}
                      size="small"
                      icon={row.isDone ? <CheckCircleIcon /> : undefined}
                      onClick={() => onOpenStatusDialog(row.id)}
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          filter: 'brightness(0.95)',
                        },
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title={t('openChart')}>
                      <IconButton size="small" color="primary" onClick={() => onOpenChart(row.id)}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Status">
                      <IconButton size="small" onClick={() => onOpenStatusDialog(row.id)}>
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
