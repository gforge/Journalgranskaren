export interface ChartNote {
  id: string;
  patientId: string;
  patientName?: string;
  patientAge?: number;
  dateTime: string;
  noteType: string;
  author: string;
  content: string;
}

export interface ParseWarning {
  row: number;
  field?: keyof ChartNote;
  message: string;
}

export interface ParsedChartNote {
  note: ChartNote;
  sourceRow: number;
  raw: Record<string, unknown>;
  warnings: ParseWarning[];
}

export interface LabValue {
  patientId: string;
  labTest: string;
  value: string;
  unit: string;
  referenceInterval?: string;
  date: string;
  time: string;
}

export interface Medication {
  patientId: string;
  medication: string;
  strength: string;
  unit: string;
  timesPerDay: string;
  route?: string;
  date: string;
}

export interface ParsedChartFile {
  fileName: string;
  sheetName?: string;
  columns: string[];
  notes: ParsedChartNote[];
  medications: Medication[];
  labValues: LabValue[];
  warnings: ParseWarning[];
}

export interface PatientReviewStatus {
  patientId: string;
  done: boolean;
  doneAt: string;
  reviewerName: string;
  comment?: string;
}

export interface AuditLog {
  id?: number;
  timestamp: string;
  reviewerName: string;
  action: string;
  patientId?: string;
  details?: string;
  hash?: string;
  prevHash?: string;
}
