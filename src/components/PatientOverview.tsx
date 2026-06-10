import { useState, useMemo, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  HelpOutlined as HelpOutlineIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ParsedChartNote, PatientReviewStatus } from 'src/types/chart';
import { downloadAuditLogsCSV, verifyAuditLogChain } from 'src/db';
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

  const [integrityStatus, setIntegrityStatus] = useState<{ isValid: boolean; errorMsg?: string } | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(true);

  useEffect(() => {
    let active = true;
    async function check() {
      setCheckingIntegrity(true);
      try {
        const result = await verifyAuditLogChain();
        if (active) {
          setIntegrityStatus(result);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setIntegrityStatus({ isValid: false, errorMsg: String(err) });
        }
      } finally {
        if (active) {
          setCheckingIntegrity(false);
        }
      }
    }
    check();
    return () => {
      active = false;
    };
  }, [notes]);

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

  const hasPatientNames = useMemo(
    () => patientData.some((row) => row.name !== t('unknownPatient')),
    [patientData, t]
  );

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
    <Box sx={{ maxWidth: '1000px', mx: 'auto', width: '100%', mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {t('overviewHeader')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
          {checkingIntegrity ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} color="inherit" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t('verifyingIntegrity')}
              </Typography>
            </Box>
          ) : integrityStatus ? (
            integrityStatus.isValid ? (
              <Chip
                icon={<VerifiedIcon style={{ color: '#2e7d32' }} />}
                label={t('integrityVerified')}
                variant="outlined"
                color="success"
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 600, 
                  bgcolor: 'rgba(46, 125, 50, 0.04)',
                  borderColor: 'rgba(46, 125, 50, 0.3)'
                }}
              />
            ) : (
              <Tooltip title={integrityStatus.errorMsg || t('integrityFailed')} arrow>
                <Chip
                  icon={<WarningIcon style={{ color: '#d32f2f' }} />}
                  label={t('integrityFailed')}
                  variant="outlined"
                  color="error"
                  sx={{ 
                    borderRadius: 2, 
                    fontWeight: 600, 
                    bgcolor: 'rgba(211, 47, 47, 0.04)',
                    borderColor: 'rgba(211, 47, 47, 0.3)',
                    cursor: 'help'
                  }}
                />
              </Tooltip>
            )
          ) : null}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={downloadAuditLogsCSV}
            sx={{ borderRadius: 2, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {t('exportLogsBtn')}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table aria-label="patient table" size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
            <TableRow>
              <TableCell sx={{ width: '34%' }}>
                <TableSortLabel
                  active={sortField === (hasPatientNames ? 'name' : 'id')}
                  direction={sortField === (hasPatientNames ? 'name' : 'id') ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort(hasPatientNames ? 'name' : 'id')}
                  sx={{ fontWeight: 600 }}
                >
                  {hasPatientNames ? t('patientName') : 'Patient ID'}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 72 }}>
                <TableSortLabel
                  active={sortField === 'age'}
                  direction={sortField === 'age' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('age')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('patientAge')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 118 }}>
                <TableSortLabel
                  active={sortField === 'notesCount'}
                  direction={sortField === 'notesCount' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('notesCount')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('notesCount')}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 138 }}>
                <TableSortLabel
                  active={sortField === 'date'}
                  direction={sortField === 'date' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('date')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('dateSpan')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 104 }}>
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleRequestSort('status')}
                  sx={{ fontWeight: 600 }}
                >
                  {t('status')}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ width: 76, fontWeight: 600 }}>{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPatients.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" sx={{ overflow: 'hidden' }}>
                  {hasPatientNames ? (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', overflowWrap: 'anywhere', lineHeight: 1.25 }}>
                        {row.id}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                      {row.id}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">{row.age}</TableCell>
                <TableCell align="center">{row.notesCount}</TableCell>
                <TableCell sx={{ overflowWrap: 'anywhere' }}>{row.dateRangeStr}</TableCell>
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
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
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
