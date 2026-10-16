import { describe, expect, it } from 'vitest';
import {
    changeDraftType,
    describeAnswer,
    emptyDraft,
    insertBlank,
    validateDraft,
} from '@/utils/questionForm';

describe('questionForm', () => {
    it('validates each supported type', () => {
        expect(validateDraft(emptyDraft()).error).toBe('Question text is required');

        const single = {
            ...emptyDraft(),
            text: '2+2',
            options: ['3', '4'],
            correctOptionIndex: 1,
        };
        expect(validateDraft(single).input).toMatchObject({
            type: 'SINGLE_CHOICE',
            correctOptionIndex: 1,
        });

        const multi = {
            ...changeDraftType(single, 'MULTIPLE_CHOICE'),
            text: 'primes',
            options: ['2', '3', '4'],
            correctOptionIndexes: [0, 1],
        };
        expect(validateDraft(multi).input?.correctOptionIndexes).toEqual([0, 1]);
        expect(validateDraft({ ...multi, correctOptionIndexes: [] }).error).toBe(
            'Mark at least one correct option'
        );

        const tf = { ...changeDraftType(single, 'TRUE_FALSE'), text: 'Sky is blue', correctOptionIndex: 0 };
        expect(validateDraft(tf).input).toMatchObject({
            type: 'TRUE_FALSE',
            options: ['True', 'False'],
            correctOptionIndex: 0,
        });

        const blank = {
            ...changeDraftType(single, 'FILL_IN_THE_BLANK'),
            text: 'Capital is ___',
            acceptedAnswers: ['Paris', ' paris '],
        };
        expect(validateDraft(blank).input?.acceptedAnswers).toEqual(['Paris', 'paris']);
        expect(validateDraft({ ...blank, text: 'Capital is' }).error).toMatch(/blank/);
    });

    it('inserts a blank marker and describes stored answers', () => {
        expect(insertBlank('The capital is')).toBe('The capital is ___');
        expect(insertBlank('The  city', 4)).toBe('The ___ city');
        expect(
            describeAnswer({
                text: 'q',
                type: 'MULTIPLE_CHOICE',
                options: ['A', 'B', 'C'],
                correctOptionIndexes: [0, 2],
            })
        ).toBe('A, C');
        expect(
            describeAnswer({
                text: 'q',
                type: 'FILL_IN_THE_BLANK',
                acceptedAnswers: ['Paris', 'Lutetia'],
            })
        ).toBe('Paris / Lutetia');
    });
});
