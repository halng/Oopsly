import { describe, expect, it } from 'vitest';
import {
    changeDraftType,
    draftFromQuestion,
    describeAnswer,
    emptyDraft,
    insertBlank,
    validateDraft,
} from '@/utils/questionForm';

describe('questionForm', () => {
    it('validates each supported type', () => {
        expect(validateDraft(emptyDraft()).error).toBe(
            'Question text is required'
        );

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
        expect(validateDraft(multi).input?.correctOptionIndexes).toEqual([
            0, 1,
        ]);
        expect(
            validateDraft({ ...multi, correctOptionIndexes: [] }).error
        ).toBe('Mark at least one correct option');

        const tf = {
            ...changeDraftType(single, 'TRUE_FALSE'),
            text: 'Sky is blue',
            correctOptionIndex: 0,
        };
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
        expect(validateDraft(blank).input?.acceptedAnswers).toEqual([
            'Paris',
            'paris',
        ]);
        expect(validateDraft({ ...blank, text: 'Capital is' }).error).toMatch(
            /blank/
        );
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

    it('builds drafts from stored questions', () => {
        expect(
            draftFromQuestion({
                id: 'q1',
                text: 'Sky?',
                type: 'TRUE_FALSE',
                correctOptionIndex: 0,
            } as any)
        ).toMatchObject({
            options: ['True', 'False'],
            correctOptionIndex: 0,
            correctOptionIndexes: [],
            acceptedAnswers: [],
            caseSensitive: false,
            explanation: '',
        });
        expect(
            draftFromQuestion({
                id: 'q2',
                text: 'Pick',
                type: 'MULTIPLE_CHOICE',
                options: ['a', 'b'],
                correctOptionIndexes: [1],
                caseSensitive: true,
                explanation: 'because',
            } as any)
        ).toMatchObject({
            options: ['a', 'b'],
            correctOptionIndex: null,
            correctOptionIndexes: [1],
            caseSensitive: true,
            explanation: 'because',
        });
    });

    it('keeps or resets answers when switching types', () => {
        const single = {
            ...emptyDraft(),
            options: ['a', 'b', 'c'],
            correctOptionIndex: 2,
        };
        expect(changeDraftType(single, 'SINGLE_CHOICE')).toBe(single);
        const multi = changeDraftType(single, 'MULTIPLE_CHOICE');
        expect(multi.correctOptionIndexes).toEqual([2]);
        expect(changeDraftType(multi, 'SINGLE_CHOICE').correctOptionIndex).toBe(
            2
        );
        const none = changeDraftType(emptyDraft(), 'MULTIPLE_CHOICE');
        expect(none.correctOptionIndexes).toEqual([]);
        const back = changeDraftType(
            { ...none, correctOptionIndexes: [] },
            'SINGLE_CHOICE'
        );
        expect(back.correctOptionIndex).toBeNull();
        const tf = changeDraftType(single, 'TRUE_FALSE');
        expect(tf.correctOptionIndex).toBeNull();
        expect(changeDraftType(tf, 'SINGLE_CHOICE').options).toEqual(['', '']);
        const fill = changeDraftType(
            { ...emptyDraft(), options: ['x'] },
            'MULTIPLE_CHOICE'
        );
        expect(fill.options).toEqual(['', '']);
    });

    it('reports every option and answer validation failure', () => {
        const base = { ...emptyDraft(), text: 'Q' };
        expect(validateDraft({ ...base, options: ['a'] }).error).toMatch(
            /between 2 and 6/
        );
        expect(validateDraft({ ...base, options: ['a', ' '] }).error).toBe(
            'Options cannot be blank'
        );
        expect(
            validateDraft({
                ...base,
                options: ['a', 'b'],
                correctOptionIndex: 5,
            }).error
        ).toBe('Mark the correct option');
        const multi = changeDraftType(base, 'MULTIPLE_CHOICE');
        expect(validateDraft({ ...multi, options: ['a'] }).error).toMatch(
            /between/
        );
        expect(
            validateDraft({
                ...multi,
                options: ['a', 'b'],
                correctOptionIndexes: [9, 1, 1, 0],
            }).input?.correctOptionIndexes
        ).toEqual([0, 1]);
        const tf = changeDraftType(base, 'TRUE_FALSE');
        expect(validateDraft(tf).error).toBe('Choose True or False');
        expect(
            validateDraft({
                ...tf,
                correctOptionIndex: 1,
                explanation: ' why ',
            }).input
        ).toMatchObject({ correctOptionIndex: 1, explanation: 'why' });
        const fill = changeDraftType(base, 'FILL_IN_THE_BLANK');
        expect(validateDraft({ ...fill, text: 'a ___' }).error).toBe(
            'Add at least one accepted answer'
        );
        expect(validateDraft({ ...base, type: 'NOPE' as any }).error).toBe(
            'Unsupported question type'
        );
    });

    it('describes single, true/false and unknown answers', () => {
        const options = ['x', 'y'];
        expect(
            describeAnswer({
                text: 'q',
                type: 'SINGLE_CHOICE',
                options,
                correctOptionIndex: 1,
            })
        ).toBe('y');
        expect(describeAnswer({ text: 'q', type: 'TRUE_FALSE', options })).toBe(
            ''
        );
        expect(
            describeAnswer({
                text: 'q',
                type: 'MULTIPLE_CHOICE',
            } as any)
        ).toBe('');
        expect(
            describeAnswer({ text: 'q', type: 'FILL_IN_THE_BLANK' } as any)
        ).toBe('');
        expect(describeAnswer({ text: 'q', type: 'OTHER' } as any)).toBe('');
        expect(insertBlank('abc ', 4)).toBe('abc ___');
    });
});
