import ExcelJS from 'exceljs';
import { ParsedChartFile, ParsedChartNote, ParseWarning, LabValue, Medication } from 'src/types/chart';
import { ChartFileParser } from './index';
import { detectColumnMapping, mapRowToNote, mapRowToLabValue, mapRowToMedication } from './aliasMatcher';

export class XlsxParser implements ChartFileParser {
  canParse(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls');
  }

  async parse(file: File): Promise<ParsedChartFile> {
    const reader = new FileReader();

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read XLSX file as ArrayBuffer.'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error.'));
      reader.readAsArrayBuffer(file);
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Workbook does not contain any sheets.');
    }

    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    
    // Extract column headers. ExcelJS cell indexing is 1-based.
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = this.getCellValueAsString(cell.value).trim();
    });

    // Clean undefined/empty headers at the end
    const cleanHeaders = headers.map((h, i) => h || `Column_${i + 1}`);

    if (cleanHeaders.length === 0 || cleanHeaders.every(h => h.startsWith('Column_'))) {
      throw new Error('No column headers detected in the first row of the sheet.');
    }

    const mapping = detectColumnMapping(cleanHeaders);

    if (!mapping.content) {
      throw new Error(
        `Could not detect a required note content column. Detected columns: [${cleanHeaders
          .filter(h => !h.startsWith('Column_'))
          .join(', ')}]. Please ensure the first row contains column names.`
      );
    }

    const warnings: ParseWarning[] = [];

    // Add warnings for unmapped columns or missing non-critical columns
    for (const key of Object.keys(mapping) as Array<keyof typeof mapping>) {
      if (!mapping[key]) {
        if (key === 'patientId') {
          warnings.push({
            row: 0,
            message: 'Could not detect column for Patient ID. Defaulting to "Unknown Patient".'
          });
        } else if (key === 'dateTime') {
          warnings.push({
            row: 0,
            message: 'Could not detect column for Date/Time. Notes will be grouped without dates.'
          });
        } else if (key === 'noteType') {
          warnings.push({
            row: 0,
            message: 'Could not detect column for Note Type. Defaulting to "Note".'
          });
        } else if (key === 'author') {
          warnings.push({
            row: 0,
            message: 'Could not detect column for Author. Defaulting to "Unspecified".'
          });
        }
      }
    }

    const notes: ParsedChartNote[] = [];
    const labValues: LabValue[] = [];
    const medications: Medication[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rawRow: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = cleanHeaders[colNumber - 1] || `Column_${colNumber}`;
        rawRow[header] = this.getCellValueAsString(cell.value);
      });

      // Skip if row is completely empty
      const rowValues = Object.values(rawRow).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      if (rowValues.length === 0) return;

      const parsedRow = mapRowToNote(rawRow, mapping, rowNumber);

      if (parsedRow.note.content) {
        notes.push(parsedRow);
      }

      // Extract split date and time for lab/medication association
      let rowDate = '';
      let rowTime = '00:00';
      const dt = parsedRow.note.dateTime;
      if (dt) {
        const parts = dt.split(/[\sT]/);
        rowDate = parts[0] || '';
        if (parts[1]) {
          const timeParts = parts[1].split(':');
          if (timeParts.length >= 2) {
            rowTime = `${timeParts[0]}:${timeParts[1]}`;
          } else {
            rowTime = parts[1].substring(0, 5);
          }
        }
      }

      // Extract lab values from this row
      const lab = mapRowToLabValue(rawRow, mapping, parsedRow.note.patientId, rowDate, rowTime);
      if (lab) {
        labValues.push(lab);
      }

      // Extract medications from this row
      const med = mapRowToMedication(rawRow, mapping, parsedRow.note.patientId, rowDate);
      if (med) {
        medications.push(med);
      }

      warnings.push(...parsedRow.warnings);
    });

    return {
      fileName: file.name,
      sheetName: worksheet.name,
      columns: cleanHeaders,
      notes,
      medications,
      labValues,
      warnings
    };
  }

  private getCellValueAsString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'object') {
      if ('result' in value && value.result !== undefined && value.result !== null) {
        return this.getCellValueAsString(value.result);
      }
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText.map(rt => rt.text || '').join('');
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if ('text' in value) {
        return String(value.text);
      }
      return JSON.stringify(value);
    }

    return String(value);
  }
}
