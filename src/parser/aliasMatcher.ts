import { ChartNote, ParsedChartNote, ParseWarning, LabValue, Medication } from 'src/types/chart';

export const columnAliases = {
  patientId: ['patientid', 'patient_id', 'personnummer', 'pnr', 'patient', 'id', 'pnr_id'],
  noteId: ['jaid', 'journalanteckningsid', 'anteckningsid', 'anteckningid', 'noteid', 'note_id', 'journalid'],
  patientName: ['patientname', 'patient_name', 'namn', 'patientnamn', 'name', 'full_name', 'förnamn', 'efternamn'],
  patientAge: ['patientage', 'patient_age', 'ålder', 'age', 'födelsedatum', 'dob', 'birthdate', 'birth_date'],
  dateTime: ['datetime', 'date_time', 'datum', 'tidpunkt', 'journaldate', 'noteringsdatum', 'date', 'tid', 'registrerad'],
  noteType: ['notetype', 'note_type', 'typ', 'anteckningstyp', 'notetyp', 'rubrik', 'kategori', 'typavanteckning', 'mallnamn'],
  author: ['author', 'författare', 'signatur', 'skapadav', 'skribent', 'signerare', 'skapad_av', 'signeradav'],
  content: ['content', 'text', 'journaltext', 'anteckning', 'notering', 'note', 'fritext', 'textinnehåll', 'noteringstext'],
  // Fields specific to the sökord-based export format
  sokord: ['sökord', 'sokord', 'sectionkeyword'],
  ward: ['vårdenhet', 'vardenhet', 'ward', 'avdelning'],
  profession: ['yrkeskategori', 'yrkesroll', 'profession'],
  // Lab columns
  labTest: ['labtest', 'provtagningsanalys', 'analys', 'test', 'lab_test', 'labname', 'laborationsnamn'],
  labValue: ['labvalue', 'provsvar', 'svar', 'resultat', 'value', 'lab_value', 'labbvärde'],
  labUnit: ['labunit', 'enhet', 'unit', 'lab_unit', 'labbenhet'],
  referenceInterval: ['labref', 'referensintervall', 'referens', 'ref', 'reference_interval', 'referensområde'],
  // Medication columns
  medication: ['medicationname', 'läkemedel', 'medicin', 'medication_name', 'medication', 'namn', 'preparat'],
  strength: ['medicationdosage', 'dos', 'dosering', 'styrka', 'strength', 'medication_dosage', 'dosering_mängd'],
  unit: ['medicationunit', 'läkemedelsenhet', 'enhet', 'unit', 'medication_unit', 'dosenhet'],
  route: ['medicationroute', 'administreringssätt', 'väg', 'route', 'medication_route', 'administrering'],
  timesPerDay: ['timesperday', 'frekvens', 'schema', 'kortdos', 'ordination', 'doseringstext', 'dostillfallen', 'tider', 'schedule', 'frequency', 'tidsintervall', 'medicationschedule', 'läkemedelsschema']
} as const;

type FieldKey = keyof typeof columnAliases;

const containsMatchBlockedAliases: Partial<Record<FieldKey, Set<string>>> = {
  patientName: new Set(['namn', 'name']),
};

/**
 * Normalizes a header string for alias matching.
 * Strips leading %, whitespace, underscores, dashes, slashes, and parentheses.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_\-\/\\()\%]/g, '');
}

/**
 * Maps input column headers to their corresponding ChartNote fields.
 * Returns a map of field -> original column header string (or null if not found).
 */
export function detectColumnMapping(headers: string[]): Record<FieldKey, string | null> {
  const mapping: Record<FieldKey, string | null> = {
    patientId: null,
    noteId: null,
    patientName: null,
    patientAge: null,
    dateTime: null,
    noteType: null,
    author: null,
    content: null,
    sokord: null,
    ward: null,
    profession: null,
    labTest: null,
    labValue: null,
    labUnit: null,
    referenceInterval: null,
    medication: null,
    strength: null,
    unit: null,
    route: null,
    timesPerDay: null,
  };

  const normalizedHeaders = headers.map(h => ({
    original: h,
    normalized: normalizeHeader(h)
  }));

  const usedOriginals = new Set<string>();

  // Helper to find a match for a field
  const findMatch = (field: FieldKey, skipUsed: boolean) => {
    const aliases = (columnAliases[field] as readonly string[]).map(normalizeHeader);
    const candidates = normalizedHeaders.filter(nh => {
      if (skipUsed && usedOriginals.has(nh.original)) {
        return false;
      }
      return true;
    });

    const exactMatch = candidates.find(nh => aliases.includes(nh.normalized));
    if (exactMatch) {
      return exactMatch;
    }

    return candidates.find(nh => {
      return (
        aliases.some(alias => (
          alias.length >= 4 &&
          !containsMatchBlockedAliases[field]?.has(alias) &&
          nh.normalized.includes(alias)
        ))
      );
    });
  };

  // 1. First Pass: Map patient/note fields (these take precedence)
  const patientFields: FieldKey[] = [
    'patientId',
    'noteId',
    'patientName',
    'patientAge',
    'dateTime',
    'noteType',
    'author',
    'content',
    'sokord',
    'ward',
    'profession',
  ];

  for (const field of patientFields) {
    const matched = findMatch(field, true);
    if (matched) {
      mapping[field] = matched.original;
      usedOriginals.add(matched.original);
    }
  }

  // 2. Second Pass: Map lab/medication fields, skipping already-used headers
  const clinicalFields: FieldKey[] = [
    'labTest',
    'labValue',
    'labUnit',
    'referenceInterval',
    'medication',
    'strength',
    'unit',
    'route',
    'timesPerDay'
  ];

  const patientFieldsSet = new Set<FieldKey>([
    'patientId', 'noteId', 'patientName', 'patientAge', 'dateTime', 'noteType',
    'author', 'content', 'sokord', 'ward', 'profession',
  ]);
  const labFieldsSet = new Set<FieldKey>([
    'labTest', 'labValue', 'labUnit', 'referenceInterval'
  ]);

  for (const field of clinicalFields) {
    const matched = findMatch(field, true);
    if (matched) {
      mapping[field] = matched.original;
      usedOriginals.add(matched.original);
    } else {
      // Fallback: try matching even used columns, but only if not already claimed by a patient/note field
      const matchedAny = findMatch(field, false);
      if (matchedAny) {
        let mappedField: FieldKey | null = null;
        for (const k of Object.keys(mapping) as FieldKey[]) {
          if (mapping[k] === matchedAny.original) {
            mappedField = k;
            break;
          }
        }

        if (mappedField) {
          if (patientFieldsSet.has(mappedField)) {
            continue;
          }
          const isLab1 = labFieldsSet.has(mappedField);
          const isLab2 = labFieldsSet.has(field);
          if (isLab1 !== isLab2) {
            const aliases = (columnAliases[field] as readonly string[]).map(normalizeHeader);
            if (!aliases.includes(matchedAny.normalized)) {
              continue;
            }
          }
        }

        mapping[field] = matchedAny.original;
      }
    }
  }

  // Fallback: if no content column is matched, look for text/note/anteckning
  if (!mapping.content) {
    const textMatched = normalizedHeaders.find(nh =>
      nh.normalized.includes('text') || nh.normalized.includes('note') || nh.normalized.includes('anteckning')
    );
    if (textMatched) {
      mapping.content = textMatched.original;
    }
  }

  return mapping;
}

/**
 * Clinical ordering for sökord (section keywords) in Swedish journal exports.
 * Lower priority numbers appear first in the assembled note.
 */
const SOKORD_ORDER_PATTERNS: Array<{ patterns: string[]; priority: number }> = [
  { patterns: ['sokorsak', 'inskrivningsorsak'], priority: 10 },
  { patterns: ['tidnuvsjukdomar', 'tidnuvarande', 'nuvsjukdom', 'sjukhistoria'], priority: 20 },
  { patterns: ['anamnes'], priority: 30 },
  { patterns: ['socialt'], priority: 40 },
  { patterns: ['aktuellt', 'aktuellabesvar', 'aktuellabesv'], priority: 50 },
  { patterns: ['lakemedel', 'medicinering'], priority: 60 },
  { patterns: ['allergier', 'allergi'], priority: 70 },
  { patterns: ['status'], priority: 80 },
  { patterns: ['allmantillstand', 'allmantillstang'], priority: 90 },
  { patterns: ['hjarta', 'harta'], priority: 100 },
  { patterns: ['lungor'], priority: 110 },
  { patterns: ['buk'], priority: 120 },
  { patterns: ['lokalstatus'], priority: 130 },
  { patterns: ['bedomning', 'assessment'], priority: 140 },
  { patterns: ['atgard'], priority: 150 },
  { patterns: ['planering'], priority: 160 },
  { patterns: ['icdkoder', 'icd'], priority: 170 },
  { patterns: ['kvakoder', 'kva', 'nomesco'], priority: 180 },
];

/**
 * Returns a sort priority for a given sökord value.
 * Normalize Swedish characters before pattern matching.
 */
export function getSokordPriority(sokord: string): number {
  const normalized = normalizeSectionText(sokord);

  for (const { patterns, priority } of SOKORD_ORDER_PATTERNS) {
    if (patterns.some(p => normalized.includes(p))) {
      return priority;
    }
  }
  return 55; // Unknown: placed around the current-state sections.
}

function isStatusSubsection(sokord: string): boolean {
  const normalized = normalizeSectionText(sokord);
  return [
    'allmantillstand',
    'allmantillstang',
    'hjarta',
    'harta',
    'lungor',
    'buk',
    'lokalstatus',
  ].some((pattern) => normalized.includes(pattern));
}

/**
 * Calculates age based on a Swedish personnummer.
 *
 * Supported formats (after stripping non-digits):
 *   12 digits  YYYYMMDDNNNN  e.g. 197007071234
 *   10 digits  YYMMDDNNNN    e.g. 7007071234  (century inferred)
 *    6 digits  YYMMDD        e.g. 700707       (century inferred, rare)
 *
 * Samordningsnummer (day += 60) are also handled for the 10-digit case.
 */
export function calculateAgeFromPersonnummer(pnr: string): number | undefined {
  const cleaned = pnr.replace(/\D/g, '');

  // Some reserve numbers begin with 9920... and do not encode a birth date.
  if (cleaned.startsWith('9920')) {
    return undefined;
  }

  let birthYear: number | undefined;
  let birthMonth: number | undefined; // 0-indexed
  let birthDay: number | undefined;

  if (cleaned.length === 12) {
    // YYYYMMDDNNNN
    birthYear  = parseInt(cleaned.substring(0, 4), 10);
    birthMonth = parseInt(cleaned.substring(4, 6), 10) - 1;
    birthDay   = parseInt(cleaned.substring(6, 8), 10);
  } else if (cleaned.length === 10) {
    // YYMMDDNNNN — century inferred from current year
    let yy = parseInt(cleaned.substring(0, 2), 10);
    birthMonth = parseInt(cleaned.substring(2, 4), 10) - 1;
    birthDay   = parseInt(cleaned.substring(4, 6), 10);
    // Samordningsnummer: day is offset by 60
    if (birthDay > 60) birthDay -= 60;
    const currentYearShort = new Date().getFullYear() % 100;
    birthYear = yy + (yy <= currentYearShort ? 2000 : 1900);
  } else if (cleaned.length === 6) {
    // YYMMDD (rare standalone form)
    let yy = parseInt(cleaned.substring(0, 2), 10);
    birthMonth = parseInt(cleaned.substring(2, 4), 10) - 1;
    birthDay   = parseInt(cleaned.substring(4, 6), 10);
    const currentYearShort = new Date().getFullYear() % 100;
    birthYear = yy + (yy <= currentYearShort ? 2000 : 1900);
  }

  if (birthYear === undefined || birthMonth === undefined || birthDay === undefined) {
    return undefined;
  }

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (isNaN(birthDate.getTime())) return undefined;
  if (
    birthDate.getFullYear() !== birthYear ||
    birthDate.getMonth() !== birthMonth ||
    birthDate.getDate() !== birthDay
  ) {
    return undefined;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  // Guard against nonsensical results (future birth dates or implausibly old)
  if (age < 0 || age > 150) return undefined;
  return age;
}

/**
 * Maps a single raw row object (or an aggregated pseudo-row for sökord format)
 * to a ParsedChartNote. Computes warnings for validation issues.
 */
export function mapRowToNote(
  raw: Record<string, unknown>,
  mapping: Record<FieldKey, string | null>,
  rowIndex: number
): ParsedChartNote {
  const warnings: ParseWarning[] = [];

  // Extract content
  let content = '';
  if (mapping.content && raw[mapping.content] !== undefined && raw[mapping.content] !== null) {
    content = normalizeNoteContent(String(raw[mapping.content]));
  }

  if (!content) {
    warnings.push({
      row: rowIndex,
      field: 'content',
      message: 'Row has empty or missing content.'
    });
  }

  // Extract patientId
  let patientId = '';
  if (mapping.patientId && raw[mapping.patientId] !== undefined && raw[mapping.patientId] !== null) {
    patientId = String(raw[mapping.patientId]).trim();
  }
  if (!patientId) {
    patientId = 'Unknown Patient';
    warnings.push({
      row: rowIndex,
      field: 'patientId',
      message: 'Missing patient identifier. Defaulted to "Unknown Patient".'
    });
  }

  // Extract source note id, if the export provides one (for example %JAID)
  let noteId: string | undefined = undefined;
  if (mapping.noteId && raw[mapping.noteId] !== undefined && raw[mapping.noteId] !== null) {
    const extractedNoteId = String(raw[mapping.noteId]).trim();
    if (extractedNoteId) noteId = extractedNoteId;
  }

  // Extract patientName
  let patientName: string | undefined = undefined;
  if (mapping.patientName && raw[mapping.patientName] !== undefined && raw[mapping.patientName] !== null) {
    patientName = String(raw[mapping.patientName]).trim();
  }

  // Extract patientAge
  let patientAge: number | undefined = undefined;
  if (mapping.patientAge && raw[mapping.patientAge] !== undefined && raw[mapping.patientAge] !== null) {
    const rawAge = String(raw[mapping.patientAge]).trim();
    const parsedAge = parseInt(rawAge, 10);
    if (!isNaN(parsedAge)) {
      patientAge = parsedAge;
    } else {
      patientAge = calculateAgeFromPersonnummer(rawAge);
    }
  }

  // Fallback: If age is still undefined, try calculating from patientId (personnummer)
  if (patientAge === undefined && patientId) {
    patientAge = calculateAgeFromPersonnummer(patientId);
  }

  // Extract dateTime
  let dateTime = '';
  if (mapping.dateTime && raw[mapping.dateTime] !== undefined && raw[mapping.dateTime] !== null) {
    dateTime = String(raw[mapping.dateTime]).trim();
  }
  if (!dateTime) {
    warnings.push({
      row: rowIndex,
      field: 'dateTime',
      message: 'Missing date/time. This note will be grouped separately.'
    });
  } else {
    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      warnings.push({
        row: rowIndex,
        field: 'dateTime',
        message: `Date "${dateTime}" could not be parsed. Sorting may be affected.`
      });
    }
  }

  // Extract noteType
  let noteType = 'Note';
  if (mapping.noteType && raw[mapping.noteType] !== undefined && raw[mapping.noteType] !== null) {
    const extractedType = String(raw[mapping.noteType]).trim();
    if (extractedType) noteType = extractedType;
  } else {
    warnings.push({
      row: rowIndex,
      field: 'noteType',
      message: 'Missing note type. Defaulted to "Note".'
    });
  }

  // Extract author
  let author = 'Unspecified';
  if (mapping.author && raw[mapping.author] !== undefined && raw[mapping.author] !== null) {
    const extractedAuthor = String(raw[mapping.author]).trim();
    if (extractedAuthor) author = extractedAuthor;
  } else {
    warnings.push({
      row: rowIndex,
      field: 'author',
      message: 'Missing author/signer. Defaulted to "Unspecified".'
    });
  }

  // Extract ward (Vårdenhet)
  let ward: string | undefined = undefined;
  if (mapping.ward && raw[mapping.ward] !== undefined && raw[mapping.ward] !== null) {
    const w = String(raw[mapping.ward]).trim();
    if (w) ward = w;
  }

  // Extract profession (Yrkeskategori)
  let profession: string | undefined = undefined;
  if (mapping.profession && raw[mapping.profession] !== undefined && raw[mapping.profession] !== null) {
    const p = String(raw[mapping.profession]).trim();
    if (p) profession = p;
  }

  // Validate note structure for known Swedish note categories (old format only).
  // Notes from the new sökord-based format use mallnamn values that won't match
  // these patterns, so no spurious warnings are generated for them.
  if (content && noteType) {
    const normType = noteType.toLowerCase().trim();
    const headings = extractMarkdownHeaders(content).map(normalizeSectionText);
    const hasJournalSections = headings.some(isKnownJournalSection);

    if (normType.startsWith('progressanteckning')) {
      warnings.push({
        row: rowIndex,
        field: 'noteType',
        message: `Note category '${noteType}' should not be used. Use 'Daganteckning' instead.`
      });
    } else if (normType.startsWith('epikris')) {
      warnings.push({
        row: rowIndex,
        field: 'noteType',
        message: `Note category '${noteType}' should not be used. Use 'Slutanteckning' instead.`
      });
    } else if (
      normType.startsWith('inläggningsanteckning') ||
      normType.startsWith('daganteckning') ||
      normType.startsWith('slutanteckning')
    ) {
      if (!hasJournalSections) {
        warnings.push({
          row: rowIndex,
          field: 'content',
          message: `${noteType} is missing recognized journal section headings, such as Aktuellt, Status, Bedömning, Åtgärd, or Planering.`
        });
      }
    }
    // For new sökord-format notes (mallnamn), structure is implicit in the sökord ordering
    // and no additional category warning is issued.
  }

  // Generate unique ID
  let uniqueId = '';
  try {
    uniqueId = crypto.randomUUID();
  } catch (e) {
    uniqueId = `note-${rowIndex}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  const note: ChartNote = {
    id: uniqueId,
    noteId,
    patientId,
    patientName,
    patientAge,
    dateTime,
    noteType,
    author,
    content,
    ward,
    profession,
  };

  return {
    note,
    sourceRow: rowIndex,
    raw,
    warnings
  };
}

/**
 * Extracts a LabValue object from a raw row.
 */
export function mapRowToLabValue(
  raw: Record<string, unknown>,
  mapping: Record<FieldKey, string | null>,
  patientId: string,
  date: string,
  time: string
): LabValue | null {
  const testHeader = mapping.labTest;
  const valHeader = mapping.labValue;
  if (!testHeader || !valHeader) return null;

  const labTest = String(raw[testHeader] || '').trim();
  const value = String(raw[valHeader] || '').trim();
  if (!labTest || !value) return null;

  const unitHeader = mapping.labUnit;
  const refHeader = mapping.referenceInterval;
  const unit = unitHeader ? String(raw[unitHeader] || '').trim() : '';
  const referenceInterval = refHeader ? String(raw[refHeader] || '').trim() : undefined;

  return {
    patientId,
    labTest,
    value,
    unit,
    referenceInterval,
    date,
    time
  };
}

/**
 * Extracts a Medication object from a raw row.
 */
export function mapRowToMedication(
  raw: Record<string, unknown>,
  mapping: Record<FieldKey, string | null>,
  patientId: string,
  date: string
): Medication | null {
  const medHeader = mapping.medication;
  if (!medHeader) return null;

  const medication = String(raw[medHeader] || '').trim();
  if (!medication) return null;

  const strHeader = mapping.strength;
  const unitHeader = mapping.unit;
  const timesHeader = mapping.timesPerDay;
  const routeHeader = (mapping as any).route;

  const strength = strHeader ? String(raw[strHeader] || '').trim() : '';
  const unit = unitHeader ? String(raw[unitHeader] || '').trim() : '';
  const timesPerDay = timesHeader ? String(raw[timesHeader] || '').trim() : '';
  const route = routeHeader ? String(raw[routeHeader] || '').trim() : '';

  return {
    patientId,
    medication,
    strength,
    unit,
    timesPerDay,
    route,
    date
  };
}

function extractMarkdownHeaders(content: string): string[] {
  const lines = content.split('\n');
  const headers: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').trim();
      if (headerText) {
        headers.push(headerText);
      }
    }
  }
  return headers;
}

function normalizeSectionText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\-\/\\()._:*]/g, '')
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o');
}

function isKnownJournalSection(normalizedHeading: string): boolean {
  return SOKORD_ORDER_PATTERNS.some(({ patterns }) =>
    patterns.some((pattern) => normalizedHeading.includes(pattern))
  ) || [
    // Legacy example headings: still accepted, but not treated as canonical labels.
    'subjektiv',
    'subjektivt',
    'objektiv',
    'objektivt',
    'plan',
  ].some((pattern) => normalizedHeading.includes(pattern));
}

function normalizeNoteContent(content: string): string {
  return content.replace(/\s*(?:<nl>|&lt;nl&gt;)\s*/gi, '\n').trim();
}

/**
 * Normalizes a raw date/time string for use as a grouping key.
 * Excel serializes date-only cells as "YYYY-MM-DDT00:00:00.000Z"; we strip the
 * time portion when it is exactly midnight so that rows from the same calendar
 * date land in the same group regardless of whether the source was CSV or XLSX.
 */
function normalizeDateKey(raw: string): string {
  // If the string matches an ISO timestamp with zero time, keep only the date
  const isoMidnight = /^(\d{4}-\d{2}-\d{2})T00:00:00(\.0+)?Z?$/;
  const m = raw.match(isoMidnight);
  return m ? m[1] : raw;
}

/**
 * Shared post-processing step for the sökord-based export format.
 *
 * Groups an array of raw row objects by (patientId, noteId) when the export
 * provides a note id, otherwise by (patientId, dateTime, noteType, author),
 * sorts each group's entries by clinical sökord priority, concatenates the
 * anteckning texts under markdown section headers, and returns one
 * ParsedChartNote per group.
 *
 * Use this in any parser that has already detected `mapping.sokord`.
 */
export function groupSokordRows(
  rows: Record<string, unknown>[],
  mapping: Record<FieldKey, string | null>
): { notes: ParsedChartNote[]; warnings: ParseWarning[] } {
  interface SokordEntry {
    sokord: string;
    anteckning: string;
  }
  interface NoteGroup {
    entries: SokordEntry[];
    firstRaw: Record<string, unknown>;
  }

  const groups = new Map<string, NoteGroup>();

  for (const row of rows) {
    const pnr    = mapping.patientId ? String(row[mapping.patientId!] ?? '').trim() : '';
    const noteId = mapping.noteId ? String(row[mapping.noteId!] ?? '').trim() : '';
    const datum  = mapping.dateTime  ? normalizeDateKey(String(row[mapping.dateTime!]  ?? '').trim()) : '';
    const mall   = mapping.noteType  ? String(row[mapping.noteType!]  ?? '').trim() : '';
    const sign   = mapping.author    ? String(row[mapping.author!]    ?? '').trim() : '';
    const sokordVal  = String(row[mapping.sokord!] ?? '').trim();
    const anteckn    = mapping.content ? String(row[mapping.content!]  ?? '').trim() : '';

    // Skip entirely empty rows
    if (!pnr && !datum && !sokordVal && !anteckn) continue;

    const key = noteId
      ? `${pnr}|||${noteId}`
      : `${pnr}|||${datum}|||${mall}|||${sign}`;

    if (!groups.has(key)) {
      // Store the first row with date key normalised so dateTime is clean
      const firstRaw = { ...row };
      if (mapping.dateTime && datum) {
        firstRaw[mapping.dateTime!] = datum;
      }
      groups.set(key, { entries: [], firstRaw });
    }

    if (sokordVal || anteckn) {
      groups.get(key)!.entries.push({ sokord: sokordVal, anteckning: anteckn });
    }
  }

  const notes: ParsedChartNote[] = [];
  const warnings: ParseWarning[] = [];
  let rowIdx = 2;

  for (const group of groups.values()) {
    // Sort entries by clinical sökord order
    const sorted = [...group.entries].sort(
      (a, b) => getSokordPriority(a.sokord) - getSokordPriority(b.sokord)
    );

    // Aggregate anteckning texts under markdown section headers. Certain
    // examination keywords belong under Status rather than as top-level sections.
    const contentSections: string[] = [];
    let hasStatusSection = sorted.some(e => normalizeSectionText(e.sokord) === 'status');
    for (const entry of sorted) {
      if (!entry.anteckning) continue;

      if (!entry.sokord) {
        contentSections.push(entry.anteckning);
        continue;
      }

      if (isStatusSubsection(entry.sokord)) {
        if (!hasStatusSection) {
          contentSections.push('### Status');
          hasStatusSection = true;
        }
        contentSections.push(`#### ${entry.sokord}\n${entry.anteckning}`);
      } else {
        contentSections.push(`### ${entry.sokord}\n${entry.anteckning}`);
      }
    }

    const content = contentSections.join('\n\n');

    // Build pseudo-row: first row's metadata + aggregated content
    const pseudoRow: Record<string, unknown> = {
      ...group.firstRaw,
      [mapping.content!]: content,
    };

    const parsedRow = mapRowToNote(pseudoRow, mapping, rowIdx++);
    if (parsedRow.note.content) {
      notes.push(parsedRow);
    }
    warnings.push(...parsedRow.warnings);
  }

  return { notes, warnings };
}
