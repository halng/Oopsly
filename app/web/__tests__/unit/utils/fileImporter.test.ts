import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    downloadCsvTemplate,
    extractCardsFromTable,
    guessColumnMapping,
    parseFileToTable,
} from '@/utils/fileImporter';

describe('file importer utilities', () => {
    beforeEach(() => {
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:test'),
            revokeObjectURL: vi.fn(),
        });
    });

    it('guesses semantic and fallback column mappings', () => {
        expect(
            guessColumnMapping(['Question', 'Answer', 'Hint', 'Tags'])
        ).toEqual({ frontCol: 0, backCol: 1, hintCol: 2, tagsCol: 3 });
        expect(guessColumnMapping(['A', 'B', 'C', 'D'])).toEqual({
            frontCol: 0,
            backCol: 1,
            hintCol: 2,
            tagsCol: 3,
        });
        expect(guessColumnMapping(['Front', 'Back'])).toEqual({
            frontCol: 0,
            backCol: 1,
            hintCol: null,
            tagsCol: null,
        });
    });

    it('parses headed and headerless CSV files and rejects empty files', async () => {
        const headed = await parseFileToTable(
            new File(
                ['Question,Answer,Tags\nWhat?,This!,science'],
                'cards.csv',
                { type: 'text/csv' }
            )
        );
        expect(headed.hasDetectedHeader).toBe(true);
        expect(headed.headers).toEqual(['Question', 'Answer', 'Tags']);
        expect(headed.rows).toEqual([['What?', 'This!', 'science']]);

        const raw = await parseFileToTable(
            new File(['one,two\nthree,four'], 'cards.tsv')
        );
        expect(raw.hasDetectedHeader).toBe(false);
        expect(raw.headers).toEqual(['Column 1', 'Column 2']);
        await expect(
            parseFileToTable(new File(['  \n'], 'empty.csv'))
        ).rejects.toThrow('Failed to parse CSV');
    });

    it('extracts valid cards and reports every missing-field edge case', () => {
        const cards = extractCardsFromTable(
            [
                [' Front ', ' Back ', ' Hint ', '#Science, memory'],
                ['', '', '', ''],
                ['', 'answer', '', ''],
                ['question', '', '', ''],
            ],
            { frontCol: 0, backCol: 1, hintCol: 2, tagsCol: 3 }
        );
        expect(cards[0]).toMatchObject({
            front: 'Front',
            back: 'Back',
            hint: 'Hint',
            tags: ['science', 'memory'],
            isValid: true,
        });
        expect(cards.slice(1).map((card) => card.validationError)).toEqual([
            'Row is blank',
            'Missing front/question text',
            'Missing back/answer text',
        ]);
    });

    it('parses xlsx files using read-excel-file', async () => {
        const writeXlsxFileNode = (await import('write-excel-file/node'))
            .default;
        const buffer = await writeXlsxFileNode([
            [
                { value: 'Front', type: String },
                { value: 'Back', type: String },
            ],
            [
                { value: 'Q1', type: String },
                { value: 'A1', type: String },
            ],
        ]).toBuffer();

        const file = new File([buffer], 'cards.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const parsed = await parseFileToTable(file);
        expect(parsed.hasDetectedHeader).toBe(true);
        expect(parsed.headers).toEqual(['Front', 'Back']);
        expect(parsed.rows).toEqual([['Q1', 'A1']]);
    });

    it('downloads a CSV template through a temporary anchor', () => {
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);
        downloadCsvTemplate('minimal');
        expect(click).toHaveBeenCalledOnce();
        expect(URL.createObjectURL).toHaveBeenCalledOnce();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
        click.mockRestore();
    });
});
