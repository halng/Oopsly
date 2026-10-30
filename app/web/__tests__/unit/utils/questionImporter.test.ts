import { describe, expect, it, vi } from 'vitest';
import {
    downloadQuestionCsvTemplate,
    downloadQuestionExcelTemplate,
    extractQuestionsFromTable,
    guessQuestionMapping,
    looksLikeQuestionHeader,
    parsePastedRows,
} from '@/utils/questionImporter';

const header = [
    'Question',
    'Type',
    'Option A',
    'Option B',
    'Option C',
    'Correct',
    'Explanation',
];

const { toFile } = vi.hoisted(() => ({ toFile: vi.fn() }));
vi.mock('write-excel-file/browser', () => ({
    default: vi.fn(() => ({ toFile })),
}));

describe('guessQuestionMapping', () => {
    it('maps columns from headers', () => {
        expect(guessQuestionMapping(header)).toEqual({
            questionCol: 0,
            typeCol: 1,
            optionCols: [2, 3, 4],
            correctCol: 5,
            explanationCol: 6,
        });
    });

    it('falls back to question + answer columns', () => {
        const m = guessQuestionMapping(['', '']);
        expect(m.questionCol).toBe(0);
        expect(m.correctCol).toBe(1);
        expect(m.optionCols).toEqual([]);
    });
});

describe('extractQuestionsFromTable', () => {
    const mapping = guessQuestionMapping(header);
    const run = (row: string[]) => extractQuestionsFromTable([row], mapping)[0];

    it('parses a single choice by letter and infers the type', () => {
        const q = run(['Capital?', '', 'Paris', 'Rome', '', 'A', 'Because']);
        expect(q.isValid).toBe(true);
        expect(q.input).toMatchObject({
            type: 'SINGLE_CHOICE',
            options: ['Paris', 'Rome'],
            correctOptionIndex: 0,
            explanation: 'Because',
        });
        expect(q.rowNumber).toBe(2);
    });

    it('infers multiple choice from several correct answers', () => {
        const q = run(['Primes?', '', '2', '4', '5', 'A, C', '']);
        expect(q.input).toMatchObject({
            type: 'MULTIPLE_CHOICE',
            correctOptionIndexes: [0, 2],
        });
    });

    it('resolves the correct answer by option text, even with commas', () => {
        const m = guessQuestionMapping(['Question', 'Options', 'Correct']);
        const [q] = extractQuestionsFromTable(
            [['Pick', 'Paris, France|Rome', 'Paris, France']],
            m
        );
        expect(q.input).toMatchObject({
            type: 'SINGLE_CHOICE',
            correctOptionIndex: 0,
        });
    });

    it('parses true/false and fill in the blank', () => {
        expect(
            run(['Sky is green', 'tf', '', '', '', 'false', '']).input
        ).toMatchObject({
            type: 'TRUE_FALSE',
            correctOptionIndex: 1,
        });
        expect(
            run(['Capital of France is ___', '', '', '', '', 'Paris|paris', ''])
                .input
        ).toMatchObject({
            type: 'FILL_IN_THE_BLANK',
            acceptedAnswers: ['Paris', 'paris'],
        });
    });

    it('explains why a row is invalid', () => {
        expect(run(['', '', 'a', 'b', '', 'A', '']).validationError).toMatch(
            /question text is missing/i
        );
        expect(run(['Q', '', 'a', 'b', '', 'Z', '']).validationError).toMatch(
            /doesn't match any option/i
        );
        expect(run(['Q', '', 'a', 'b', '', '', '']).validationError).toMatch(
            /correct answer is missing/i
        );
        expect(
            run(['Q', 'weird', 'a', 'b', '', 'A', '']).validationError
        ).toMatch(/unknown type/i);
        expect(
            run(['Q', 'single', 'a', 'b', '', 'A,B', '']).validationError
        ).toMatch(/only one correct/i);
        expect(run(['No blank', 'fill', '', '', '', 'x', '']).isValid).toBe(
            false
        );
    });
});

describe('parsing helpers', () => {
    it('detects header rows', () => {
        expect(looksLikeQuestionHeader(header)).toBe(true);
        expect(looksLikeQuestionHeader(['What is 2+2?', '4'])).toBe(false);
    });

    it('parses tab separated pasted text', () => {
        expect(parsePastedRows('Q\tA\n1+1\t2\n\n')).toEqual([
            ['Q', 'A'],
            ['1+1', '2'],
        ]);
    });
});

describe('templates', () => {
    it('downloads a CSV that the importer can read back', async () => {
        let blob: Blob | undefined;
        URL.createObjectURL = vi.fn((b: Blob) => {
            blob = b;
            return 'blob:x';
        });
        URL.revokeObjectURL = vi.fn();
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        downloadQuestionCsvTemplate();

        expect(click).toHaveBeenCalled();
        const text = await blob!.text();
        const rows = parsePastedRows(text);
        const mapping = guessQuestionMapping(rows[0]);
        const items = extractQuestionsFromTable(rows.slice(1), mapping);
        expect(items).toHaveLength(4);
        expect(items.every((q) => q.isValid)).toBe(true);
        expect(items.map((q) => q.type)).toEqual([
            'SINGLE_CHOICE',
            'MULTIPLE_CHOICE',
            'TRUE_FALSE',
            'FILL_IN_THE_BLANK',
        ]);
        click.mockRestore();
    });

    it('writes the Excel template to a file', async () => {
        await downloadQuestionExcelTemplate();
        expect(toFile).toHaveBeenCalledWith('oopsly_questions_template.xlsx');
    });
});

describe('edge cases', () => {
    const mapping = guessQuestionMapping(header);
    const run = (row: string[]) => extractQuestionsFromTable([row], mapping)[0];

    it('accepts a number as the correct option', () => {
        expect(run(['Q', '', 'a', 'b', '', '2', '']).input).toMatchObject({
            correctOptionIndex: 1,
        });
    });

    it('rejects more than six options', () => {
        const wide = guessQuestionMapping(['Question', 'Options', 'Correct']);
        const [q] = extractQuestionsFromTable(
            [['Q', 'a|b|c|d|e|f|g', 'A']],
            wide
        );
        expect(q.validationError).toMatch(/up to 6 options/i);
    });

    it('requires a true/false answer to be true or false', () => {
        expect(run(['Q', 'tf', '', '', '', 'maybe', '']).validationError).toBe(
            'Choose True or False'
        );
    });

    it('numbers rows from the first data row', () => {
        const [a, b] = extractQuestionsFromTable(
            [
                ['A', '', 'x', 'y', '', 'A', ''],
                ['B', '', 'x', 'y', '', 'B', ''],
            ],
            mapping,
            1
        );
        expect([a.rowNumber, b.rowNumber]).toEqual([1, 2]);
    });
});
