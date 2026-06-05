import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  AppBar,
  Toolbar,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  UploadFile as UploadFileIcon,
  Sort as SortIcon,
  FilterList as FilterListIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutlined as HelpOutlineIcon,
  Description as DescriptionIcon,
  Medication as MedicationIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { SecurityNotice } from 'components/SecurityNotice';
import { ImportSummary } from 'components/ImportSummary';
import { PatientOverview } from 'components/PatientOverview';
import { ReviewerDialog } from 'components/ReviewerDialog';
import { CompletionDialog } from 'components/CompletionDialog';
import { NoteList } from 'components/NoteList';
import { Note } from 'components/Note/Note';

import { ParsedChartFile, PatientReviewStatus, Medication, LabValue } from 'src/types/chart';
import { getParserForFile } from './parser';
import { addAuditLog } from 'src/db';

const sanitizeDose = (val: string): string => {
  const trimmed = val.trim();
  if (/^p\.?o\.?$/i.test(trimmed)) {
    return '';
  }
  return trimmed;
};

export default function App() {
  const { t, i18n } = useTranslation();

  // App settings & Reviewer identity state
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerPromptOpen, setReviewerPromptOpen] = useState(false);

  // File parsing states
  const [parsedFile, setParsedFile] = useState<ParsedChartFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation states
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'medications' | 'labs'>('notes');

  // Reset tab when active patient changes
  useEffect(() => {
    setActiveTab('notes');
  }, [activePatientId]);

  // Note display filters
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('ALL');
  const [authorFilter, setAuthorFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'dateTimeAsc' | 'dateTimeDesc' | 'sourceRow'>('dateTimeAsc');

  // Persistence status states
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, PatientReviewStatus>>({});

  // Status Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogPatientId, setStatusDialogPatientId] = useState<string | null>(null);

  // Load Reviewer name and initialize prompt on boot
  useEffect(() => {
    const stored = localStorage.getItem('reviewer_name');
    if (stored) {
      setReviewerName(stored);
    } else {
      setReviewerPromptOpen(true);
    }
  }, []);

  // Sync completion states whenever a new file is successfully parsed
  useEffect(() => {
    if (parsedFile) {
      const pids = Array.from(new Set(parsedFile.notes.map((n) => n.note.patientId)));
      const statuses: Record<string, PatientReviewStatus> = {};
      pids.forEach((pid) => {
        const stored = localStorage.getItem(`review_status_${pid}`);
        if (stored) {
          try {
            statuses[pid] = JSON.parse(stored);
          } catch (e) {
            console.error('Error loading completion status:', e);
          }
        }
      });
      setReviewStatuses(statuses);
    }
  }, [parsedFile]);

  const handleSaveReviewer = (name: string) => {
    localStorage.setItem('reviewer_name', name);
    setReviewerName(name);
    setReviewerPromptOpen(false);
  };

  const handleChangeReviewerClick = () => {
    setReviewerPromptOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setParsedFile(null);
    setActivePatientId(null);

    try {
      const parser = getParserForFile(file);
      if (!parser) {
        throw new Error(t('unsupportedFileError'));
      }

      const result = await parser.parse(file);
      setParsedFile(result);

      // Audit Log File Import Action
      await addAuditLog({
        timestamp: new Date().toISOString(),
        reviewerName,
        action: 'LOAD_FILE',
        details: `Loaded file: ${file.name} (${result.notes.length} notes parsed)`,
      });
    } catch (err: any) {
      setError(err.message || t('parseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async (demoName: string) => {
    setLoading(true);
    setError(null);
    setParsedFile(null);
    setActivePatientId(null);

    try {
      const base = (import.meta as any).env.BASE_URL || '/';
      const cleanBase = base.endsWith('/') ? base : base + '/';
      const url = `${cleanBase}examples/${demoName}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch demo file: ${response.statusText}`);
      }
      const text = await response.text();
      const file = new File([text], demoName, { type: 'text/csv' });

      const parser = getParserForFile(file);
      if (!parser) {
        throw new Error(t('unsupportedFileError'));
      }

      const result = await parser.parse(file);
      setParsedFile(result);

      // Audit Log File Import Action
      await addAuditLog({
        timestamp: new Date().toISOString(),
        reviewerName,
        action: 'LOAD_FILE',
        details: `Loaded demo file: ${demoName} (${result.notes.length} notes parsed)`,
      });
    } catch (err: any) {
      setError(err.message || t('parseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setParsedFile(null);
    setError(null);
    setActivePatientId(null);
  };

  // Open a specific patient's chart
  const handleOpenChart = async (patientId: string) => {
    setActivePatientId(patientId);
    setNoteTypeFilter('ALL');
    setAuthorFilter('ALL');

    // Audit Log Patient Interaction Action
    await addAuditLog({
      timestamp: new Date().toISOString(),
      reviewerName,
      action: 'OPEN_CHART',
      patientId,
      details: 'Opened patient chart notes viewer',
    });
  };

  const handleBackToOverview = () => {
    setActivePatientId(null);
  };

  const handleTabChange = async (newTab: 'notes' | 'medications' | 'labs') => {
    setActiveTab(newTab);
    if (activePatientId) {
      await addAuditLog({
        timestamp: new Date().toISOString(),
        reviewerName,
        action: newTab === 'medications' ? 'VIEW_MEDICATIONS' : newTab === 'labs' ? 'VIEW_LABS' : 'VIEW_NOTES',
        patientId: activePatientId,
        details: `Switched to ${newTab} tab`,
      });
    }
  };

  // Opening the Status completion dialog
  const handleOpenStatusDialog = (patientId: string) => {
    setStatusDialogPatientId(patientId);
    setStatusDialogOpen(true);
  };

  const handleSaveStatus = async (done: boolean, comment: string) => {
    if (!statusDialogPatientId) return;

    const patientId = statusDialogPatientId;
    const timestamp = new Date().toISOString();

    const newStatus: PatientReviewStatus = {
      patientId,
      done,
      doneAt: timestamp,
      reviewerName,
      comment,
    };

    // Save in LocalStorage
    localStorage.setItem(`review_status_${patientId}`, JSON.stringify(newStatus));

    // Update state
    setReviewStatuses((prev) => ({
      ...prev,
      [patientId]: newStatus,
    }));

    // Audit Log Action
    await addAuditLog({
      timestamp,
      reviewerName,
      action: done ? 'MARK_DONE' : 'UNMARK_DONE',
      patientId,
      details: comment ? `Comment: ${comment}` : 'No comment added',
    });

    setStatusDialogOpen(false);
    setStatusDialogPatientId(null);
  };

  // Language toggle helper
  const toggleLanguage = () => {
    const currentLang = i18n.language;
    i18n.changeLanguage(currentLang === 'sv' ? 'en' : 'sv');
  };

  // Filters for notes of the active patient
  const activePatientNotes = parsedFile
    ? parsedFile.notes.filter((n) => n.note.patientId === activePatientId)
    : [];

  // Get filter select options dynamically
  const uniqueNoteTypes = Array.from(new Set(activePatientNotes.map((n) => n.note.noteType)));
  const uniqueAuthors = Array.from(new Set(activePatientNotes.map((n) => n.note.author)));

  // Apply note type and author filters
  const filteredNotes = activePatientNotes.filter((n) => {
    const matchesType = noteTypeFilter === 'ALL' || n.note.noteType === noteTypeFilter;
    const matchesAuthor = authorFilter === 'ALL' || n.note.author === authorFilter;
    return matchesType && matchesAuthor;
  });

  // Sort notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'sourceRow') {
      return a.sourceRow - b.sourceRow;
    }
    const dateA = a.note.dateTime ? new Date(a.note.dateTime).getTime() : 0;
    const dateB = b.note.dateTime ? new Date(b.note.dateTime).getTime() : 0;

    if (dateA === 0 && dateB !== 0) return 1;
    if (dateB === 0 && dateA !== 0) return -1;
    if (dateA === 0 && dateB === 0) return a.sourceRow - b.sourceRow;

    if (sortBy === 'dateTimeAsc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });

  // Medications and Lab Values for the active patient
  const activePatientMedications = parsedFile
    ? parsedFile.medications.filter((m) => m.patientId === activePatientId)
    : [];

  const activePatientLabValues = parsedFile
    ? parsedFile.labValues.filter((l) => l.patientId === activePatientId)
    : [];

  // 1. Unique dates when any medication was recorded for this patient (chronological oldest first)
  const uniqueMedicationDates = useMemo(() => {
    return Array.from(
      new Set(activePatientMedications.map((m) => m.date))
    ).sort((a, b) => dayjs(a).diff(dayjs(b)));
  }, [activePatientMedications]);

  // 2. Group medications by unique row details: medication, strength, unit
  const groupedMedications = useMemo(() => {
    const groups: Record<string, {
      medication: string;
      strength: string;
      unit: string;
      route: string;
      history: Medication[];
    }> = {};

    activePatientMedications.forEach((m) => {
      const key = `${m.medication}|${m.strength}|${m.unit}`;
      if (!groups[key]) {
        groups[key] = {
          medication: m.medication,
          strength: m.strength,
          unit: m.unit,
          route: '',
          history: [],
        };
      }
      groups[key].history.push(m);
    });

    // Sort history chronologically inside each group and determine the latest dose/schedule
    Object.values(groups).forEach((g) => {
      g.history.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
      const latest = g.history[g.history.length - 1];
      if (latest) {
        g.route = sanitizeDose(latest.timesPerDay || '') || sanitizeDose(latest.route || '');
      }
    });

    return Object.values(groups).sort((a, b) => a.medication.localeCompare(b.medication, 'sv'));
  }, [activePatientMedications]);

  const parseDoseToNumericValue = (doseStr: string): number => {
    const cleaned = doseStr.trim().toLowerCase();
    if (!cleaned || cleaned === 'utgår' || cleaned === 'utsatt') {
      return 0;
    }
    if (cleaned.includes('+')) {
      const parts = cleaned.split('+');
      let sum = 0;
      for (const part of parts) {
        const num = parseFloat(part.replace(/[^0-9\.]/g, ''));
        if (!isNaN(num)) {
          sum += num;
        }
      }
      return sum;
    }
    const match = cleaned.match(/[0-9\.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
    return 0;
  };

  // Helper to evaluate dose for a date column
  const getMedicationDoseForDate = (
    history: Medication[],
    colDate: string
  ): React.ReactNode => {
    const exactRecord = history.find((h) => h.date === colDate);

    // Find all records before this date
    const priorRecords = history
      .filter((h) => dayjs(h.date).isBefore(dayjs(colDate)))
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date))); // newest first

    const lastRecord = priorRecords[0];
    const previousDose = lastRecord
      ? sanitizeDose(lastRecord.timesPerDay || '') || sanitizeDose(lastRecord.route || '')
      : '';

    // If there is no exact record for this date
    if (!exactRecord) {
      if (priorRecords.length > 0) {
        const isInactive = !previousDose || previousDose === '0+0+0' || previousDose === '0' || previousDose === '0+0+0+0' || previousDose.toLowerCase() === 'utgår';
        return isInactive ? '' : '→';
      }
      return '';
    }

    const currentDose = sanitizeDose(exactRecord.timesPerDay || '') || sanitizeDose(exactRecord.route || '') || '✓';

    // If this is the first recorded dose in history, just show it
    if (priorRecords.length === 0) {
      return currentDose;
    }

    // Compare with the previous record
    if (currentDose === previousDose) {
      return '→';
    }

    // Dose changed: determine arrow indicator
    const currentVal = parseDoseToNumericValue(currentDose);
    const previousVal = parseDoseToNumericValue(previousDose);

    if (currentVal > previousVal) {
      return (
        <span>
          {currentDose}
          <span style={{ fontSize: '0.75em', verticalAlign: 'super', marginLeft: '2px', color: '#666' }}>↗</span>
        </span>
      );
    } else if (currentVal < previousVal) {
      return (
        <span>
          {currentDose}
          <span style={{ fontSize: '0.75em', verticalAlign: 'super', marginLeft: '2px', color: '#666' }}>↘</span>
        </span>
      );
    }

    return currentDose;
  };

  // 3. Unique date-times when any lab value was recorded (chronological oldest first)
  const uniqueLabDateTimes = useMemo(() => {
    return Array.from(
      new Set(activePatientLabValues.map((l) => `${l.date} ${l.time}`))
    ).sort((a, b) => dayjs(a).diff(dayjs(b)));
  }, [activePatientLabValues]);

  // 4. Group labs by unique row details: labTest, unit, referenceInterval
  const groupedLabValues = useMemo(() => {
    const groups: Record<string, {
      labTest: string;
      unit: string;
      referenceInterval: string;
      history: LabValue[];
    }> = {};

    activePatientLabValues.forEach((l) => {
      const refVal = l.referenceInterval || '';
      const key = `${l.labTest}|${l.unit}|${refVal}`;
      if (!groups[key]) {
        groups[key] = {
          labTest: l.labTest,
          unit: l.unit,
          referenceInterval: refVal,
          history: [],
        };
      }
      groups[key].history.push(l);
    });

    return Object.values(groups).sort((a, b) => a.labTest.localeCompare(b.labTest, 'sv'));
  }, [activePatientLabValues]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.02em', color: 'primary.main' }}>
            {t('appName')} <Typography component="span" variant="caption" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1, display: { xs: 'none', sm: 'inline' } }}>{t('appSubtitle')}</Typography>
          </Typography>
          
          {reviewerName && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'inline' } }}>
                Granskare: <strong>{reviewerName}</strong>
              </Typography>
              <Button size="small" variant="text" color="inherit" onClick={handleChangeReviewerClick}>
                {t('changeReviewerBtn')}
              </Button>
              <Button size="small" variant="text" color="inherit" onClick={toggleLanguage}>
                {i18n.language === 'sv' ? 'EN' : 'SV'}
              </Button>
              {parsedFile && (
                <Button size="small" variant="outlined" color="primary" onClick={handleClear}>
                  {t('closeChart')}
                </Button>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {!parsedFile ? (
          <Box sx={{ my: 'auto', textAlign: 'center' }}>
            <SecurityNotice />

            <Box
              sx={{
                border: '2px dashed',
                borderColor: error ? 'error.light' : 'divider',
                borderRadius: 3,
                p: { xs: 4, sm: 6 },
                backgroundColor: 'background.paper',
                maxWidth: '680px',
                mx: 'auto',
                transition: 'border-color 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <UploadFileIcon sx={{ fontSize: 60, color: error ? 'error.main' : 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t('selectFileTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: '400px', mx: 'auto' }}>
                {t('selectFileDesc')}
              </Typography>

              <Button
                variant="contained"
                component="label"
                disabled={loading || !reviewerName}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ px: 4, py: 1, borderRadius: 2, fontWeight: 600 }}
              >
                {loading ? t('readingFile') : t('chooseFileBtn')}
                <input type="file" accept=".csv,.xlsx" hidden onChange={handleFileChange} />
              </Button>

              <Box sx={{ mt: 4, borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                  {t('loadDemoTitle')}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={loading || !reviewerName}
                    onClick={() => handleLoadDemo('chart_only.csv')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('loadDemoNotesOnly')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={loading || !reviewerName}
                    onClick={() => handleLoadDemo('chart_labs_meds.csv')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('loadDemoLabsMeds')}
                  </Button>
                </Stack>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ maxWidth: '680px', mx: 'auto', mt: 3, borderRadius: 2, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
          </Box>
        ) : activePatientId === null ? (
          /* Land on Patient Overview screen first (Task 22) */
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <ImportSummary parsedFile={parsedFile} onClear={handleClear} />
            <PatientOverview
              notes={parsedFile.notes}
              reviewStatuses={reviewStatuses}
              onOpenChart={handleOpenChart}
              onOpenStatusDialog={handleOpenStatusDialog}
            />
          </Box>
        ) : (
          /* Render patient chart notes viewer */
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <Button
                variant="text"
                color="secondary"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToOverview}
                sx={{ fontWeight: 600 }}
              >
                {t('overviewHeader')}
              </Button>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, ml: 1 }}>
                {t('patientIdLabel')}{' '}
                <Typography component="span" variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {activePatientId}
                </Typography>
              </Typography>

              {reviewStatuses[activePatientId]?.done ? (
                <Chip
                  label={t('done')}
                  color="success"
                  icon={<CheckCircleIcon />}
                  onClick={() => handleOpenStatusDialog(activePatientId)}
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Chip
                  label={t('pending')}
                  icon={<HelpOutlineIcon />}
                  onClick={() => handleOpenStatusDialog(activePatientId)}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            {/* Top Navigation Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, val) => handleTabChange(val)}
              sx={{
                mb: 3,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 48,
                },
              }}
            >
              <Tab
                value="notes"
                label={t('notesTab')}
                icon={<DescriptionIcon sx={{ fontSize: '1.25rem' }} />}
                iconPosition="start"
              />
              <Tab
                value="medications"
                label={t('medicationsTab')}
                icon={<MedicationIcon sx={{ fontSize: '1.25rem' }} />}
                iconPosition="start"
              />
              <Tab
                value="labs"
                label={t('labsTab')}
                icon={<ScienceIcon sx={{ fontSize: '1.25rem' }} />}
                iconPosition="start"
              />
            </Tabs>

            {activeTab === 'notes' && (
              <>
                {/* Note filters and sorting toolbar */}
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    boxSizing: 'border-box',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Type and Author Filters */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="type-filter-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterListIcon fontSize="inherit" /> {t('categoriesCount')}
                      </InputLabel>
                      <Select
                        labelId="type-filter-label"
                        value={noteTypeFilter}
                        label={t('categoriesCount')}
                        onChange={(e) => setNoteTypeFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">{t('all')} ({activePatientNotes.length})</MenuItem>
                        {uniqueNoteTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type === 'Note' ? t('defaultNoteType') : type} (
                            {activePatientNotes.filter((n) => n.note.noteType === type).length})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="author-filter-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterListIcon fontSize="inherit" /> Skribent
                      </InputLabel>
                      <Select
                        labelId="author-filter-label"
                        value={authorFilter}
                        label="Skribent"
                        onChange={(e) => setAuthorFilter(e.target.value)}
                      >
                        <MenuItem value="ALL">{t('all')} ({activePatientNotes.length})</MenuItem>
                        {uniqueAuthors.map((author) => (
                          <MenuItem key={author} value={author}>
                            {author === 'Unspecified' ? t('unspecifiedAuthor') : author} (
                            {activePatientNotes.filter((n) => n.note.author === author).length})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  {/* Sorting option */}
                  <FormControl size="small" sx={{ minWidth: 200, width: { xs: '100%', md: 'auto' } }}>
                    <InputLabel id="sort-select-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SortIcon fontSize="inherit" /> {t('sortOrder')}
                    </InputLabel>
                    <Select
                      labelId="sort-select-label"
                      value={sortBy}
                      label={t('sortOrder')}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <MenuItem value="dateTimeAsc">{t('sortDateTimeAsc')}</MenuItem>
                      <MenuItem value="dateTimeDesc">{t('sortDateTimeDesc')}</MenuItem>
                      <MenuItem value="sourceRow">{t('sortSourceRow')}</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Note Viewer Panel */}
                <Box sx={{ flexGrow: 1, minHeight: '400px', width: '100%' }}>
                  {sortedNotes.length > 0 ? (
                    <NoteList>
                      {sortedNotes.map((parsedNote, idx) => (
                        <Note
                          key={parsedNote.note.id}
                          note={parsedNote.note}
                          medications={activePatientMedications}
                          labValues={activePatientLabValues}
                          first={idx === 0}
                        />
                      ))}
                    </NoteList>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        {t('noNotesMatch')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {activeTab === 'medications' && (
              <Box sx={{ flexGrow: 1, minHeight: '400px', width: '100%' }}>
                {groupedMedications.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                    <Table size="small" sx={{ minWidth: '800px' }}>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('medicationHeader')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('routeHeader')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('strengthHeader')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('unitHeader')}</TableCell>
                          {uniqueMedicationDates.map((d) => (
                            <TableCell key={d} align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              <Tooltip title={d}>
                                <span>{formatGridDate(d, i18n.language)}</span>
                              </Tooltip>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupedMedications.map((group, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{group.medication}</TableCell>
                            <TableCell>{group.route}</TableCell>
                            <TableCell>{group.strength}</TableCell>
                            <TableCell>{group.unit}</TableCell>
                            {uniqueMedicationDates.map((d) => {
                              const doseVal = getMedicationDoseForDate(group.history, d);
                              const isContinuation = typeof doseVal === 'string' && doseVal === '→';
                              return (
                                <TableCell
                                  key={d}
                                  align="center"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: isContinuation ? 400 : 700,
                                    color: isContinuation ? 'text.secondary' : 'text.primary',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {doseVal}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('noMedications')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 'labs' && (
              <Box sx={{ flexGrow: 1, minHeight: '400px', width: '100%' }}>
                {groupedLabValues.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
                    <Table size="small" sx={{ minWidth: '800px' }}>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('labTestHeader')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('labUnitHeader')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('labRefHeader')}</TableCell>
                          {uniqueLabDateTimes.map((dt) => {
                            const { datePart, timePart } = formatLabHeader(dt, i18n.language);
                            return (
                              <TableCell key={dt} align="center" sx={{ fontWeight: 700, py: 0.5, px: 1.5, whiteSpace: 'nowrap' }}>
                                <Tooltip title={dt}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1.1 }}>
                                      {datePart}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem', color: 'text.primary', lineHeight: 1.1 }}>
                                      {timePart}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupedLabValues.map((group, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{group.labTest}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{group.unit}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                              {group.referenceInterval || '-'}
                            </TableCell>
                            {uniqueLabDateTimes.map((dt) => {
                              const match = group.history.find((h) => `${h.date} ${h.time}` === dt);
                              if (!match) {
                                return <TableCell key={dt} align="center" />;
                              }
                              const outOfRange = isValueOutOfRange(match.value, group.referenceInterval);
                              return (
                                <TableCell
                                  key={dt}
                                  align="center"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: outOfRange ? 700 : 400,
                                    color: outOfRange ? 'error.main' : 'text.primary',
                                  }}
                                >
                                  {match.value}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('noLabValues')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Container>

      {/* Reviewer prompt modal */}
      <ReviewerDialog
        open={reviewerPromptOpen}
        initialValue={reviewerName}
        forcePrompt={!reviewerName}
        onSave={handleSaveReviewer}
      />

      {/* Status Done Dialog (Task 21) */}
      <CompletionDialog
        open={statusDialogOpen}
        patientId={statusDialogPatientId || ''}
        initialStatus={statusDialogPatientId ? reviewStatuses[statusDialogPatientId] || null : null}
        reviewerName={reviewerName}
        onSave={handleSaveStatus}
        onCancel={() => {
          setStatusDialogOpen(false);
          setStatusDialogPatientId(null);
        }}
      />
    </Box>
  );
}

const formatGridDate = (dateStr: string, locale: string) => {
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  if (locale === 'sv') {
    const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    return `${days[d.day()]} ${d.date()}`;
  } else {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.day()]} ${d.date()}`;
  }
};

const formatLabHeader = (dateTimeStr: string, locale: string) => {
  const d = dayjs(dateTimeStr);
  if (!d.isValid()) return { datePart: dateTimeStr, timePart: '' };
  const datePart = formatGridDate(d.format('YYYY-MM-DD'), locale);
  const timePart = d.format('HH:mm');
  return { datePart, timePart };
};

const isValueOutOfRange = (valueStr: string, refInterval?: string): boolean => {
  if (!refInterval) return false;
  const val = parseFloat(valueStr.replace(',', '.'));
  if (isNaN(val)) return false;

  const cleanedRef = refInterval.trim().replace(/\s/g, '');

  // Case 1: <max (e.g. <3 or <0.53)
  if (cleanedRef.startsWith('<')) {
    const maxVal = parseFloat(cleanedRef.substring(1).replace(',', '.'));
    if (!isNaN(maxVal)) {
      return val > maxVal;
    }
  }

  // Case 2: >min
  if (cleanedRef.startsWith('>')) {
    const minVal = parseFloat(cleanedRef.substring(1).replace(',', '.'));
    if (!isNaN(minVal)) {
      return val < minVal;
    }
  }

  // Case 3: min-max (e.g. 3.5-8.8 or 3.9-5.2)
  if (cleanedRef.includes('-')) {
    const parts = cleanedRef.split('-');
    if (parts.length === 2) {
      const minVal = parseFloat(parts[0].replace(',', '.'));
      const maxVal = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return val < minVal || val > maxVal;
      }
    }
  }

  return false;
};
