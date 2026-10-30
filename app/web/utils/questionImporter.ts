import Papa from 'papaparse';
import writeXlsxFile from 'write-excel-file/browser';
import { QuestionInput, QuestionType } from '@/types';
import {
    BLANK_MARKER,
    MAX_OPTIONS,
    QUESTION_TYPES,
    QuestionDraft,
    TRUE_FALSE_OPTIONS,
    validateDraft,
} from '@/utils/questionForm';

export const MAX_IMPORT_QUESTIONS = 200;

export interface QuestionColumnMapping {
    questionCol: number;
    typeCol: number | null;
    optionCols: number[];
    correctCol: number | null;
    explanationCol: number | null;
}

export interface ImportQuestionItem {
    /** 1-based row number as the user sees it in their file. */
    rowNumber: number;
    text: string;
    type?: QuestionType;
    input?: QuestionInput;
    isValid: boolean;
    validationError?: string;
}

const clean = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const OPTION_HEADER =
    /^(option|choice|answer)\s?([a-f]|[1-6])$|^(options|choices)$/;
const QUESTION_HEADER = /^(question|questions|prompt|text|q|stem)$/;
const TYPE_HEADER = /^(type|question type|kind)$/;
const CORRECT_HEADER =
    /^(correct|correct answer|correct answers|answer|answers|key|solution|right answer)$/;
const EXPLANATION_HEADER = /^(explanation|rationale|notes?|reason|feedback)$/;

/** Picks a column mapping from header names, falling back to position. */
export function guessQuestionMapping(headers: string[]): QuestionColumnMapping {
    const mapping: QuestionColumnMapping = {
        questionCol: -1,
        typeCol: null,
        optionCols: [],
        correctCol: null,
        explanationCol: null,
    };
    headers.forEach((header, index) => {
        const h = clean(header);
        if (OPTION_HEADER.test(h)) mapping.optionCols.push(index);
        else if (mapping.questionCol < 0 && QUESTION_HEADER.test(h))
            mapping.questionCol = index;
        else if (mapping.typeCol === null && TYPE_HEADER.test(h))
            mapping.typeCol = index;
        else if (mapping.correctCol === null && CORRECT_HEADER.test(h))
            mapping.correctCol = index;
        else if (mapping.explanationCol === null && EXPLANATION_HEADER.test(h))
            mapping.explanationCol = index;
    });
    if (mapping.questionCol < 0) mapping.questionCol = 0;
    if (mapping.correctCol === null && mapping.optionCols.length === 0) {
        mapping.correctCol = headers.length > 1 ? 1 : null;
    }
    return mapping;
}

const TYPE_ALIASES: Record<string, QuestionType> = {
    'single choice': 'SINGLE_CHOICE',
    single: 'SINGLE_CHOICE',
    sc: 'SINGLE_CHOICE',
    mcq: 'SINGLE_CHOICE',
    'multiple choice': 'MULTIPLE_CHOICE',
    multiple: 'MULTIPLE_CHOICE',
    multi: 'MULTIPLE_CHOICE',
    mc: 'MULTIPLE_CHOICE',
    'true false': 'TRUE_FALSE',
    truefalse: 'TRUE_FALSE',
    tf: 'TRUE_FALSE',
    boolean: 'TRUE_FALSE',
    'fill in the blank': 'FILL_IN_THE_BLANK',
    'fill in blank': 'FILL_IN_THE_BLANK',
    fill: 'FILL_IN_THE_BLANK',
    blank: 'FILL_IN_THE_BLANK',
    cloze: 'FILL_IN_THE_BLANK',
    fib: 'FILL_IN_THE_BLANK',
};

const TRUE_WORDS = new Set(['true', 't', 'yes', 'y', '1']);
const FALSE_WORDS = new Set(['false', 'f', 'no', 'n', '0']);

const cell = (row: string[], col: number | null) =>
    col === null || col < 0 ? '' : (row[col] ?? '').trim();

function parseOptions(row: string[], cols: number[]): string[] {
    const cells = cols.map((c) => cell(row, c));
    if (cells.length === 1) {
        // A single column holds every option, separated by | or new lines.
        return cells[0]
            .split(/\||\r?\n/)
            .map((o) => o.trim())
            .filter(Boolean);
    }
    return cells.filter(Boolean);
}

/** Resolves "B", "2" or the option text itself to an option index. */
function resolveOptionIndex(token: string, options: string[]): number {
    const t = token.trim();
    const byText = options.findIndex(
        (o) => o.toLowerCase() === t.toLowerCase()
    );
    if (byText >= 0) return byText;
    if (/^[a-f]$/i.test(t)) {
        const i = t.toUpperCase().charCodeAt(0) - 65;
        return i < options.length ? i : -1;
    }
    if (/^\d$/.test(t)) {
        const i = Number(t) - 1;
        return i >= 0 && i < options.length ? i : -1;
    }
    return -1;
}

function parseCorrectIndexes(
    raw: string,
    options: string[]
): { indexes: number[]; bad?: string } {
    const whole = resolveOptionIndex(raw, options);
    if (whole >= 0 && raw.trim().length > 1) return { indexes: [whole] };
    const indexes: number[] = [];
    for (const token of raw.split(/[|;,]/).map((t) => t.trim())) {
        if (!token) continue;
        const i = resolveOptionIndex(token, options);
        if (i < 0) return { indexes: [], bad: token };
        indexes.push(i);
    }
    return { indexes };
}

function inferType(
    typeRaw: string,
    options: string[],
    correctRaw: string,
    text: string
): QuestionType | string {
    if (typeRaw) {
        return TYPE_ALIASES[clean(typeRaw)] ?? `Unknown type "${typeRaw}"`;
    }
    if (options.length >= 2) {
        // The whole cell naming one option (even with a comma in it) is a single answer.
        if (resolveOptionIndex(correctRaw, options) >= 0) {
            return 'SINGLE_CHOICE';
        }
        return correctRaw.split(/[|;,]/).filter((t) => t.trim()).length > 1
            ? 'MULTIPLE_CHOICE'
            : 'SINGLE_CHOICE';
    }
    const word = correctRaw.trim().toLowerCase();
    if (TRUE_WORDS.has(word) || FALSE_WORDS.has(word)) return 'TRUE_FALSE';
    if (text.includes(BLANK_MARKER)) return 'FILL_IN_THE_BLANK';
    return 'Add options, or set a type';
}

function rowToQuestion(
    row: string[],
    mapping: QuestionColumnMapping,
    rowNumber: number
): ImportQuestionItem {
    const text = cell(row, mapping.questionCol);
    const fail = (error: string, type?: QuestionType): ImportQuestionItem => ({
        rowNumber,
        text,
        type,
        isValid: false,
        validationError: error,
    });
    if (!text) return fail('Question text is missing');

    const options = parseOptions(row, mapping.optionCols);
    const correctRaw = cell(row, mapping.correctCol);
    const explanation = cell(row, mapping.explanationCol);
    const type = inferType(
        cell(row, mapping.typeCol),
        options,
        correctRaw,
        text
    );
    if (!QUESTION_TYPES.includes(type as QuestionType)) {
        return fail(type);
    }
    const kind = type as QuestionType;
    if (!correctRaw) return fail('Correct answer is missing', kind);

    const draft: QuestionDraft = {
        text,
        type: kind,
        options,
        correctOptionIndex: null,
        correctOptionIndexes: [],
        acceptedAnswers: [],
        caseSensitive: false,
        explanation,
    };

    if (kind === 'SINGLE_CHOICE' || kind === 'MULTIPLE_CHOICE') {
        if (options.length > MAX_OPTIONS) {
            return fail(`Up to ${MAX_OPTIONS} options are allowed`, kind);
        }
        const { indexes, bad } = parseCorrectIndexes(correctRaw, options);
        if (bad) {
            return fail(
                `Correct answer "${bad}" doesn't match any option`,
                kind
            );
        }
        if (kind === 'SINGLE_CHOICE' && indexes.length > 1) {
            return fail('Single choice allows only one correct option', kind);
        }
        draft.correctOptionIndex = indexes[0] ?? null;
        draft.correctOptionIndexes = indexes;
    } else if (kind === 'TRUE_FALSE') {
        const word = correctRaw.toLowerCase();
        if (TRUE_WORDS.has(word)) draft.correctOptionIndex = 0;
        else if (FALSE_WORDS.has(word)) draft.correctOptionIndex = 1;
        draft.options = [...TRUE_FALSE_OPTIONS];
    } else {
        draft.acceptedAnswers = correctRaw.split(/[|;]/);
    }

    const result = validateDraft(draft);
    if (!result.input) return fail(result.error, kind);
    return { rowNumber, text, type: kind, input: result.input, isValid: true };
}

export function extractQuestionsFromTable(
    rows: string[][],
    mapping: QuestionColumnMapping,
    firstRowNumber = 2
): ImportQuestionItem[] {
    return rows.map((row, i) =>
        rowToQuestion(row, mapping, firstRowNumber + i)
    );
}

/** True when a row reads like column titles rather than a question. */
export function looksLikeQuestionHeader(row: string[]): boolean {
    return row.some((c) => {
        const h = clean(c);
        return (
            OPTION_HEADER.test(h) ||
            QUESTION_HEADER.test(h) ||
            TYPE_HEADER.test(h) ||
            CORRECT_HEADER.test(h) ||
            EXPLANATION_HEADER.test(h)
        );
    });
}

/** Parses pasted text (tab, comma or semicolon separated) into rows. */
export function parsePastedRows(text: string): string[][] {
    const result = Papa.parse<string[]>(text.trim(), {
        skipEmptyLines: 'greedy',
        header: false,
        delimiter: '',
    });
    return result.data
        .map((r) => (Array.isArray(r) ? r.map((c) => (c ?? '').trim()) : []))
        .filter((r) => r.some(Boolean));
}

const TEMPLATE_HEADER = [
    'Question',
    'Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct',
    'Explanation',
];

const TEMPLATE_ROWS: string[][] = [
    [
        'Which planet is closest to the sun?',
        'single',
        'Mercury',
        'Venus',
        'Earth',
        'Mars',
        'A',
        'Mercury orbits at about 58 million km.',
    ],
    [
        'Which of these are prime numbers?',
        'multiple',
        '2',
        '4',
        '5',
        '9',
        'A,C',
        '',
    ],
    ['The Earth is flat.', 'true/false', '', '', '', '', 'False', ''],
    [
        `The capital of France is ${BLANK_MARKER}.`,
        'fill',
        '',
        '',
        '',
        '',
        'Paris',
        'Use | to accept several answers.',
    ],
];

function csvCell(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
}

function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function downloadQuestionCsvTemplate() {
    const csv = [TEMPLATE_HEADER, ...TEMPLATE_ROWS]
        .map((r) => r.map(csvCell).join(','))
        .join('\n');
    download(
        new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
        'oopsly_questions_template.csv'
    );
}

export async function downloadQuestionExcelTemplate() {
    const sheet = [TEMPLATE_HEADER, ...TEMPLATE_ROWS].map((row) =>
        row.map((value) => ({ value, type: String }))
    );
    await writeXlsxFile(sheet, { sheet: 'Questions' }).toFile(
        'oopsly_questions_template.xlsx'
    );
}
