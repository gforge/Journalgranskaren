import { ChartNote, ParsedChartNote, ParseWarning, LabValue, Medication } from 'src/types/chart';

export const columnAliases = {
  patientId: ['patientid', 'patient_id', 'personnummer', 'pnr', 'patient', 'id', 'pnr_id'],
  patientName: ['patientname', 'patient_name', 'namn', 'patientnamn', 'name', 'full_name', 'förnamn', 'efternamn'],
  patientAge: ['patientage', 'patient_age', 'ålder', 'age', 'födelsedatum', 'dob', 'birthdate', 'birth_date'],
  dateTime: ['datetime', 'date_time', 'datum', 'tidpunkt', 'journaldate', 'noteringsdatum', 'date', 'tid', 'registrerad'],
  noteType: ['notetype', 'note_type', 'typ', 'anteckningstyp', 'notetyp', 'rubrik', 'sökord', 'kategori', 'typavanteckning'],
  author: ['author', 'författare', 'signatur', 'skapadav', 'skribent', 'signerare', 'skapad_av'],
  content: ['content', 'text', 'journaltext', 'anteckning', 'notering', 'note', 'fritext', 'textinnehåll', 'noteringstext'],
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

/**
 * Normalizes a header string for alias matching.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_\-\/\\\(\)]/g, '');
}

/**
 * Maps input column headers to their corresponding ChartNote fields.
 * Returns a map of ChartNote field -> original column header string (or null if not found).
 */
export function detectColumnMapping(headers: string[]): Record<FieldKey, string | null> {
  const mapping: Record<FieldKey, string | null> = {
    patientId: null,
    patientName: null,
    patientAge: null,
    dateTime: null,
    noteType: null,
    author: null,
    content: null,
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
    const aliases = columnAliases[field] as readonly string[];
    return normalizedHeaders.find(nh => {
      if (skipUsed && usedOriginals.has(nh.original)) {
        return false;
      }
      return (
        aliases.includes(nh.normalized) || 
        aliases.some(alias => nh.normalized.includes(alias))
      );
    });
  };

  // 1. First Pass: Map critical patient/note fields (these take precedence)
  const patientFields: FieldKey[] = [
    'patientId',
    'patientName',
    'patientAge',
    'dateTime',
    'noteType',
    'author',
    'content'
  ];

  for (const field of patientFields) {
    const matched = findMatch(field, false);
    if (matched) {
      mapping[field] = matched.original;
      usedOriginals.add(matched.original);
    }
  }

  // 2. Second Pass: Map lab/medication fields, skipping headers already used for patient/note fields
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
    'patientId',
    'patientName',
    'patientAge',
    'dateTime',
    'noteType',
    'author',
    'content'
  ]);
  const labFieldsSet = new Set<FieldKey>([
    'labTest',
    'labValue',
    'labUnit',
    'referenceInterval'
  ]);

  for (const field of clinicalFields) {
    const matched = findMatch(field, true);
    if (matched) {
      mapping[field] = matched.original;
      usedOriginals.add(matched.original);
    } else {
      // Fallback: if no unused match is found, try matching including already used ones
      const matchedAny = findMatch(field, false);
      if (matchedAny) {
        // Find which field currently uses this column
        let mappedField: FieldKey | null = null;
        for (const k of Object.keys(mapping) as FieldKey[]) {
          if (mapping[k] === matchedAny.original) {
            mappedField = k;
            break;
          }
        }

        if (mappedField) {
          // If it is a patient/note field, reject mapping
          if (patientFieldsSet.has(mappedField)) {
            continue;
          }
          // If it is in a different clinical group, check for exact match
          const isLab1 = labFieldsSet.has(mappedField);
          const isLab2 = labFieldsSet.has(field);
          if (isLab1 !== isLab2) {
            const aliases = columnAliases[field] as readonly string[];
            if (!aliases.includes(matchedAny.normalized)) {
              continue;
            }
          }
        }

        mapping[field] = matchedAny.original;
      }
    }
  }

  // Fallback: if no content column is matched, check if any column contains words like "text" or "note"
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
 * Calculates age based on a Swedish personnummer (YYYYMMDD-XXXX or YYMMDD-XXXX).
 */
export function calculateAgeFromPersonnummer(pnr: string): number | undefined {
  const cleaned = pnr.replace(/\D/g, '');
  if (cleaned.length >= 8) {
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10) - 1;
    const day = parseInt(cleaned.substring(6, 8), 10);
    const birthDate = new Date(year, month, day);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  } else if (cleaned.length === 6) {
    let year = parseInt(cleaned.substring(0, 2), 10);
    const month = parseInt(cleaned.substring(2, 4), 10) - 1;
    const day = parseInt(cleaned.substring(4, 6), 10);

    const today = new Date();
    const currentYearShort = today.getFullYear() % 100;
    const century = year <= currentYearShort ? 2000 : 1900;
    year += century;

    const birthDate = new Date(year, month, day);
    if (!isNaN(birthDate.getTime())) {
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  }
  return undefined;
}

/**
 * Maps a single raw row object to a ParsedChartNote.
 * Computes warnings for validation issues.
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
    content = String(raw[mapping.content]).trim();
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

  // Fallback: If age is still undefined, try calculating it from the patientId
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

  // Validate note category and subsections
  if (content && noteType) {
    const normType = noteType.toLowerCase().trim();
    const headers = extractMarkdownHeaders(content);
    const normalizedHeaders = headers.map(normalizeHeaderText);

    const hasSubjective = normalizedHeaders.includes('subjektivt') || normalizedHeaders.includes('subjektiv');
    const hasObjective = normalizedHeaders.includes('objektivt') || normalizedHeaders.includes('objektiv');
    const hasAssessment = normalizedHeaders.includes('assessment');
    const hasPlan = normalizedHeaders.includes('planering') || normalizedHeaders.includes('plan');
    const hasSoap = hasSubjective && hasObjective && hasAssessment && hasPlan;

    const hasAktuellt = normalizedHeaders.includes('aktuellt');

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
      if (normType.startsWith('inläggningsanteckning') || normType.startsWith('slutanteckning')) {
        const missing: string[] = [];
        if (!hasSubjective) missing.push('Subjektiv/Subjektivt');
        if (!hasObjective) missing.push('Objektiv/Objektivt');
        if (!hasAssessment) missing.push('Assessment');
        if (!hasPlan) missing.push('Planering/Plan');

        if (missing.length > 0) {
          warnings.push({
            row: rowIndex,
            field: 'content',
            message: `${noteType} is missing SOAP subsection(s): ${missing.join(', ')}.`
          });
        }
      } else if (normType.startsWith('daganteckning')) {
        if (!hasAktuellt && !hasSoap) {
          warnings.push({
            row: rowIndex,
            field: 'content',
            message: `Daganteckning is missing required subsection: must have 'Aktuellt' or all SOAP subsections (Subjektiv, Objektiv, Assessment, Planering).`
          });
        }
      }
    } else if (noteType !== 'Note') {
      warnings.push({
        row: rowIndex,
        field: 'noteType',
        message: `Unrecognized note category '${noteType}'. Expected 'Inläggningsanteckning', 'Daganteckning', or 'Slutanteckning'.`
      });
    }
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
    patientId,
    patientName,
    patientAge,
    dateTime,
    noteType,
    author,
    content
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

function normalizeHeaderText(text: string): string {
  return text.toLowerCase().trim().replace(/[:\*\._]/g, '');
}
