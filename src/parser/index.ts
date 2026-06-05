import { ParsedChartFile } from 'src/types/chart';
import { CsvParser } from './csvParser';
import { XlsxParser } from './xlsxParser';

export interface ChartFileParser {
  canParse(file: File): boolean;
  parse(file: File): Promise<ParsedChartFile>;
}

const parsers: ChartFileParser[] = [
  new CsvParser(),
  new XlsxParser()
];

export function getParserForFile(file: File): ChartFileParser | null {
  return parsers.find(p => p.canParse(file)) || null;
}
