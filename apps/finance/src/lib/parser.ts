// =============================================================================
// CSV Parser - Parse bank/finance CSV files into transactions
// =============================================================================

import Papa from 'papaparse';
import type {
  CSVParserConfig,
  CSVParseResult,
  CSVParseError,
  ParsedTransaction,
} from '@optimai/types';

// Default configurations for common bank formats
export const BANK_PRESETS: Record<string, Partial<CSVParserConfig>> = {
  generic: {
    delimiter: ',',
    hasHeader: true,
    dateColumn: 'date',
    amountColumn: 'amount',
    descriptionColumn: 'description',
    dateFormat: 'YYYY-MM-DD',
    encoding: 'utf-8',
  },
  bbva_es: {
    delimiter: ';',
    hasHeader: true,
    dateColumn: 'Fecha',
    amountColumn: 'Importe',
    descriptionColumn: 'Concepto',
    dateFormat: 'DD/MM/YYYY',
    encoding: 'latin1',
  },
  santander_es: {
    delimiter: ';',
    hasHeader: true,
    dateColumn: 'Fecha operación',
    amountColumn: 'Importe',
    descriptionColumn: 'Concepto',
    dateFormat: 'DD/MM/YYYY',
    encoding: 'latin1',
  },
  revolut: {
    delimiter: ',',
    hasHeader: true,
    dateColumn: 'Started Date',
    amountColumn: 'Amount',
    descriptionColumn: 'Description',
    dateFormat: 'YYYY-MM-DD',
    encoding: 'utf-8',
  },
  wise: {
    delimiter: ',',
    hasHeader: true,
    dateColumn: 'Date',
    amountColumn: 'Amount',
    descriptionColumn: 'Description',
    dateFormat: 'DD-MM-YYYY',
    encoding: 'utf-8',
  },
};

// Default config
const DEFAULT_CONFIG: CSVParserConfig = {
  delimiter: ',',
  hasHeader: true,
  dateColumn: 'date',
  amountColumn: 'amount',
  descriptionColumn: 'description',
  dateFormat: 'YYYY-MM-DD',
  encoding: 'utf-8',
};

/**
 * Parse date string based on format
 */
function parseDate(dateStr: string, format: string): string | null {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();
  let day: string, month: string, year: string;

  try {
    if (format === 'YYYY-MM-DD') {
      const parts = cleanDate.split('-');
      if (parts.length !== 3) return null;
      [year, month, day] = parts;
    } else if (format === 'DD/MM/YYYY') {
      const parts = cleanDate.split('/');
      if (parts.length !== 3) return null;
      [day, month, year] = parts;
    } else if (format === 'DD-MM-YYYY') {
      const parts = cleanDate.split('-');
      if (parts.length !== 3) return null;
      [day, month, year] = parts;
    } else if (format === 'MM/DD/YYYY') {
      const parts = cleanDate.split('/');
      if (parts.length !== 3) return null;
      [month, day, year] = parts;
    } else {
      // Try to parse as ISO
      const parsed = new Date(cleanDate);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString().split('T')[0];
    }

    // Validate and format
    const numYear = parseInt(year, 10);
    const numMonth = parseInt(month, 10);
    const numDay = parseInt(day, 10);

    if (numYear < 1900 || numYear > 2100) return null;
    if (numMonth < 1 || numMonth > 12) return null;
    if (numDay < 1 || numDay > 31) return null;

    return `${numYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.trim().replace(/[€$£¥₹\s]/g, '');

  // Handle European format (1.234,56 -> 1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // European: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Could be European decimal (123,45) or US thousands (1,234)
    const commaPos = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaPos + 1);
    if (afterComma.length === 2) {
      // Likely decimal: 123,45 -> 123.45
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands: 1,234 -> 1234
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Find column by name (case-insensitive, partial match)
 */
function findColumn(headers: string[], target: string): string | null {
  const targetLower = target.toLowerCase();

  // Exact match first
  const exact = headers.find(h => h.toLowerCase() === targetLower);
  if (exact) return exact;

  // Partial match
  const partial = headers.find(h => h.toLowerCase().includes(targetLower));
  if (partial) return partial;

  return null;
}

/**
 * Auto-detect CSV configuration from content
 */
export function detectConfig(csvContent: string): Partial<CSVParserConfig> {
  const lines = csvContent.split('\n').slice(0, 5);
  const detected: Partial<CSVParserConfig> = {};

  // Detect delimiter
  const firstLine = lines[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    detected.delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    detected.delimiter = '\t';
  } else {
    detected.delimiter = ',';
  }

  // Parse headers
  const parsed = Papa.parse(csvContent, {
    delimiter: detected.delimiter,
    preview: 2,
  });

  if (parsed.data.length > 0) {
    const headers = parsed.data[0] as string[];

    // Try to find date column
    const dateCol = findColumn(headers, 'date') ||
                    findColumn(headers, 'fecha') ||
                    findColumn(headers, 'datum');
    if (dateCol) detected.dateColumn = dateCol;

    // Try to find amount column
    const amountCol = findColumn(headers, 'amount') ||
                      findColumn(headers, 'importe') ||
                      findColumn(headers, 'betrag') ||
                      findColumn(headers, 'monto');
    if (amountCol) detected.amountColumn = amountCol;

    // Try to find description column
    const descCol = findColumn(headers, 'description') ||
                    findColumn(headers, 'concepto') ||
                    findColumn(headers, 'beschreibung') ||
                    findColumn(headers, 'merchant');
    if (descCol) detected.descriptionColumn = descCol;
  }

  // Detect date format from sample data
  if (parsed.data.length > 1 && detected.dateColumn) {
    const headers = parsed.data[0] as string[];
    const firstRow = parsed.data[1] as string[];
    const dateIndex = headers.indexOf(detected.dateColumn);

    if (dateIndex >= 0 && firstRow[dateIndex]) {
      const sampleDate = firstRow[dateIndex];
      if (sampleDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        detected.dateFormat = 'YYYY-MM-DD';
      } else if (sampleDate.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        detected.dateFormat = 'DD/MM/YYYY';
      } else if (sampleDate.match(/^\d{2}-\d{2}-\d{4}/)) {
        detected.dateFormat = 'DD-MM-YYYY';
      }
    }
  }

  return detected;
}

/**
 * Main CSV parser function
 */
export function parseCSV(
  csvContent: string,
  config: Partial<CSVParserConfig> = {}
): CSVParseResult {
  const finalConfig: CSVParserConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: CSVParseError[] = [];
  const transactions: ParsedTransaction[] = [];

  // Parse CSV with PapaParse
  const parsed = Papa.parse(csvContent, {
    delimiter: finalConfig.delimiter,
    header: finalConfig.hasHeader,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((err) => {
      errors.push({
        row: err.row || 0,
        message: err.message,
        raw: err.code,
      });
    });
  }

  const data = parsed.data as Record<string, string>[];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + (finalConfig.hasHeader ? 2 : 1);

    // Get values using configured column names
    const dateStr = row[finalConfig.dateColumn];
    const amountStr = row[finalConfig.amountColumn];
    const description = row[finalConfig.descriptionColumn];

    // Parse date
    const date = parseDate(dateStr, finalConfig.dateFormat);
    if (!date) {
      errors.push({
        row: rowNum,
        column: finalConfig.dateColumn,
        message: `Invalid date format: "${dateStr}"`,
        raw: JSON.stringify(row),
      });
      continue;
    }

    // Parse amount
    const amount = parseAmount(amountStr);
    if (amount === null) {
      errors.push({
        row: rowNum,
        column: finalConfig.amountColumn,
        message: `Invalid amount: "${amountStr}"`,
        raw: JSON.stringify(row),
      });
      continue;
    }

    // Create transaction
    const transaction: ParsedTransaction = {
      date,
      amount,
      description: description?.trim() || '',
      raw: row,
      confidence: 1.0,
    };

    transactions.push(transaction);
  }

  return {
    success: errors.length === 0 || transactions.length > 0,
    transactions,
    errors,
    stats: {
      total_rows: data.length,
      parsed_rows: transactions.length,
      error_rows: errors.length,
    },
  };
}

/**
 * Parse CSV with auto-detection
 */
export function parseCSVAuto(csvContent: string): CSVParseResult {
  const detected = detectConfig(csvContent);
  return parseCSV(csvContent, detected);
}

/**
 * Parse CSV using a bank preset
 */
export function parseCSVWithPreset(
  csvContent: string,
  preset: keyof typeof BANK_PRESETS
): CSVParseResult {
  const presetConfig = BANK_PRESETS[preset] || BANK_PRESETS.generic;
  return parseCSV(csvContent, presetConfig);
}
