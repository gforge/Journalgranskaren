import Papa from 'papaparse';
import { ParsedChartFile, ParsedChartNote, ParseWarning, LabValue, Medication } from 'src/types/chart';
import { ChartFileParser } from './index';
import { detectColumnMapping, mapRowToNote, mapRowToLabValue, mapRowToMedication } from './aliasMatcher';

export class CsvParser implements ChartFileParser {
  canParse(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.csv') || file.type === 'text/csv';
  }

  parse(file: File): Promise<ParsedChartFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
          reject(new Error('Failed to read file or file is empty.'));
          return;
        }

        Papa.parse(text, {
          header: true,
          skipEmptyLines: 'greedy',
          complete: (results) => {
            const columns = results.meta.fields || [];
            const warnings: ParseWarning[] = [];

            if (columns.length === 0) {
              reject(new Error('No column headers detected in CSV file.'));
              return;
            }

            // Detect mappings
            const mapping = detectColumnMapping(columns);

            if (!mapping.content) {
              reject(
                new Error(
                  `Could not detect a required note content column. Detected columns: [${columns.join(
                    ', '
                  )}]. Please ensure your CSV has a column representing the journal text.`
                )
              );
              return;
            }

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

            // Parse rows
            results.data.forEach((row: any, index) => {
              const rowIndex = index + 2; // 1-indexed, +1 for header row
              
              // Skip if row is completely empty
              const rowValues = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
              if (rowValues.length === 0) return;

              const parsedRow = mapRowToNote(row, mapping, rowIndex);
              
              // If the row has empty content, we log a warning but skip rendering it in the main list
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
              const lab = mapRowToLabValue(row, mapping, parsedRow.note.patientId, rowDate, rowTime);
              if (lab) {
                labValues.push(lab);
              }

              // Extract medications from this row
              const med = mapRowToMedication(row, mapping, parsedRow.note.patientId, rowDate);
              if (med) {
                medications.push(med);
              }

              // Collect warnings from each row
              warnings.push(...parsedRow.warnings);
            });

            resolve({
              fileName: file.name,
              columns,
              notes,
              medications,
              labValues,
              warnings
            });
          },
          error: (error: any) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          }
        });
      };

      reader.onerror = () => {
        reject(new Error('File reading error.'));
      };

      reader.readAsText(file);
    });
  }
}
