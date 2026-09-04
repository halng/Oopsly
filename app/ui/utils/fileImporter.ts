import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ImportCardItem } from '../types';

export interface ColumnMapping {
  frontCol: number; // 0-based index
  backCol: number; // 0-based index
  hintCol: number | null; // 0-based index or null
  tagsCol: number | null; // 0-based index or null
}

export interface ParsedTableData {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: string[][];
  suggestedMapping: ColumnMapping;
  hasDetectedHeader: boolean;
}

const FRONT_KEYWORDS = [
  'front',
  'question',
  'prompt',
  'term',
  'word',
  'vocab',
  'vocabulary',
  'concept',
  'heading',
  'item',
  'cue',
  'q',
  'cau hoi',
  'tu',
];

const BACK_KEYWORDS = [
  'back',
  'answer',
  'definition',
  'meaning',
  'translation',
  'solution',
  'explanation',
  'response',
  'a',
  'ans',
  'tra loi',
  'dinh nghia',
  'nghia',
];

const HINT_KEYWORDS = [
  'hint',
  'clue',
  'example',
  'notes',
  'context',
  'tip',
  'goi y',
  'vi du',
];

const TAGS_KEYWORDS = [
  'tags',
  'tag',
  'category',
  'categories',
  'topic',
  'topics',
  'labels',
  'label',
  'nhan',
  'chu de',
];

/**
 * Checks if a string contains any of the target keywords (case-insensitive substring or exact match)
 */
function matchesKeyword(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  return keywords.some((k) => clean === k || clean.includes(k));
}

/**
 * Detects whether the first row is likely a header row
 */
function detectHeaderRow(firstRow: string[]): boolean {
  if (!firstRow || firstRow.length === 0) return false;
  let matches = 0;
  for (const cell of firstRow) {
    if (
      matchesKeyword(cell, FRONT_KEYWORDS) ||
      matchesKeyword(cell, BACK_KEYWORDS) ||
      matchesKeyword(cell, HINT_KEYWORDS) ||
      matchesKeyword(cell, TAGS_KEYWORDS)
    ) {
      matches++;
    }
  }
  return matches >= 1;
}

/**
 * Determines the best column mapping for a given set of headers or sample row
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  let frontCol = 0;
  let backCol = 1;
  let hintCol: number | null = null;
  let tagsCol: number | null = null;

  let foundFront = false;
  let foundBack = false;

  headers.forEach((h, idx) => {
    const clean = h.toLowerCase().trim();
    if (!foundFront && matchesKeyword(clean, FRONT_KEYWORDS)) {
      frontCol = idx;
      foundFront = true;
    } else if (!foundBack && matchesKeyword(clean, BACK_KEYWORDS)) {
      backCol = idx;
      foundBack = true;
    } else if (hintCol === null && matchesKeyword(clean, HINT_KEYWORDS)) {
      hintCol = idx;
    } else if (tagsCol === null && matchesKeyword(clean, TAGS_KEYWORDS)) {
      tagsCol = idx;
    }
  });

  // If backCol happens to equal frontCol, try to find another column
  if (frontCol === backCol && headers.length > 1) {
    backCol = frontCol === 0 ? 1 : 0;
  }

  // If no hint/tag found, and columns >= 3
  if (hintCol === null && headers.length >= 3 && frontCol !== 2 && backCol !== 2) {
    hintCol = 2;
  }
  if (tagsCol === null && headers.length >= 4 && frontCol !== 3 && backCol !== 3 && hintCol !== 3) {
    tagsCol = 3;
  }

  return { frontCol, backCol, hintCol, tagsCol };
}

/**
 * Parses a File object (CSV or Excel) into a standard 2D string matrix
 */
export async function parseFileToTable(file: File): Promise<ParsedTableData> {
  const fileName = file.name;
  const fileSize = file.size;
  const lowerName = fileName.toLowerCase();

  let rawRows: string[][] = [];

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    // Parse Excel
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Excel workbook contains no sheets');
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      rawRows = sheetData.map((row: any[]) =>
        (Array.isArray(row) ? row : []).map((cell: any) =>
          cell === null || cell === undefined ? '' : String(cell).trim()
        )
      );
    } catch (err: any) {
      throw new Error(`Failed to parse Excel file: ${err?.message || 'Unsupported format'}`);
    }
  } else {
    // Parse CSV / TSV / Delimited text
    const text = await file.text();
    const result = Papa.parse<string[]>(text, {
      skipEmptyLines: 'greedy',
      header: false,
      delimiter: '', // auto-detect
    });

    if (result.errors && result.errors.length > 0 && result.data.length === 0) {
      throw new Error(`Failed to parse CSV: ${result.errors[0].message}`);
    }

    rawRows = result.data.map((row) =>
      Array.isArray(row) ? row.map((c) => (c ? String(c).trim() : '')) : []
    );
  }

  // Filter out completely blank rows
  rawRows = rawRows.filter((r) => r.some((c) => Boolean(c && c.trim())));

  if (rawRows.length === 0) {
    throw new Error('The uploaded file is empty or contains no readable text.');
  }

  const firstRow = rawRows[0];
  const hasDetectedHeader = detectHeaderRow(firstRow);

  let headers: string[] = [];
  let rowsToProcess: string[][] = [];

  if (hasDetectedHeader) {
    headers = firstRow.map((h, i) => h.trim() || `Column ${i + 1}`);
    rowsToProcess = rawRows.slice(1);
  } else {
    // Generate Column 1, Column 2, ...
    const maxCols = Math.max(...rawRows.map((r) => r.length), 2);
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    rowsToProcess = rawRows;
  }

  const suggestedMapping = guessColumnMapping(hasDetectedHeader ? headers : firstRow);

  return {
    fileName,
    fileSize,
    headers,
    rows: rowsToProcess,
    suggestedMapping,
    hasDetectedHeader,
  };
}

/**
 * Extracts and validates Card items from raw rows using the given column mapping
 */
export function extractCardsFromTable(
  rows: string[][],
  mapping: ColumnMapping
): ImportCardItem[] {
  return rows.map((row, index) => {
    const front = (row[mapping.frontCol] || '').trim();
    const back = (row[mapping.backCol] || '').trim();
    const hint = mapping.hintCol !== null && mapping.hintCol !== undefined ? (row[mapping.hintCol] || '').trim() : '';
    const tagsRaw = mapping.tagsCol !== null && mapping.tagsCol !== undefined ? (row[mapping.tagsCol] || '').trim() : '';

    let tags: string[] = [];
    if (tagsRaw) {
      tags = tagsRaw
        .split(/[,;\s#]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean);
    }

    let isValid = true;
    let validationError = '';

    if (!front && !back) {
      isValid = false;
      validationError = 'Row is blank';
    } else if (!front) {
      isValid = false;
      validationError = 'Missing front/question text';
    } else if (!back) {
      isValid = false;
      validationError = 'Missing back/answer text';
    }

    return {
      front,
      back,
      hint: hint || undefined,
      tags,
      isValid,
      validationError: validationError || undefined,
    };
  });
}

/**
 * Downloads a sample CSV template for users to fill in
 */
export function downloadCsvTemplate(type: 'minimal' | 'full' = 'full') {
  let csvContent = '';
  let filename = 'oopsly_flashcards_template.csv';

  if (type === 'minimal') {
    csvContent = `Front,Back\n` +
      `"What is active recall?","Testing yourself to retrieve info from memory rather than passive re-reading"\n` +
      `"What is spaced repetition?","Reviewing material at systematically increasing intervals to flatten the forgetting curve"\n` +
      `"What is FSRS?","Free Spaced Repetition Scheduler - a modern 17-parameter memory algorithm"\n`;
  } else {
    csvContent = `Front,Back,Hint,Tags\n` +
      `"What is the time complexity of QuickSort?","O(n log n) average, O(n^2) worst case","Think about pivot selection","algorithms, sorting, computer-science"\n` +
      `"What is the powerhouse of the cell?","Mitochondria","Produces ATP energy","biology, science"\n` +
      `"What is Amdahl's Law?","Formula to find maximum improvement possible by improving a portion of a system","Speedup equation","systems, architecture"\n` +
      `"What is Docker?","Containerization platform to package apps with dependencies","Containers vs VMs","devops, docker, cloud"\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a sample Excel (.xlsx) template for users to fill in
 */
export function downloadExcelTemplate(type: 'minimal' | 'full' = 'full') {
  const filename = 'oopsly_flashcards_template.xlsx';
  let data: any[][] = [];

  if (type === 'minimal') {
    data = [
      ['Front', 'Back'],
      ['What is active recall?', 'Testing yourself to retrieve info from memory rather than passive re-reading'],
      ['What is spaced repetition?', 'Reviewing material at systematically increasing intervals to flatten the forgetting curve'],
      ['What is FSRS?', 'Free Spaced Repetition Scheduler - a modern 17-parameter memory algorithm'],
    ];
  } else {
    data = [
      ['Front', 'Back', 'Hint', 'Tags'],
      ['What is the time complexity of QuickSort?', 'O(n log n) average, O(n^2) worst case', 'Think about pivot selection', 'algorithms, sorting, computer-science'],
      ['What is the powerhouse of the cell?', 'Mitochondria', 'Produces ATP energy', 'biology, science'],
      ["What is Amdahl's Law?", 'Formula to find maximum improvement possible by improving a portion of a system', 'Speedup equation', 'systems, architecture'],
      ['What is Docker?', 'Containerization platform to package apps with dependencies', 'Containers vs VMs', 'devops, docker, cloud'],
    ];
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Flashcards');
  XLSX.writeFile(workbook, filename);
}

