import React from 'react';
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TakeTestPage from '@/app/(user)/home/[slug]/tests/[testSlug]/take/page';
import { ApiService } from '@/services/api';
import { GameService } from '@/services/gameApi';
import { testSuiteContext } from '@/__tests__/unit/helpers/studyFixtures';

const { push, ctx } = vi.hoisted(() => ({
    push: vi.fn(),
    ctx: { current: {} as Record<string, unknown> },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science', testSlug: 'midterm' }),
}));
vi.mock('@/hooks/useTestSuiteContext', () => ({
    useTestSuiteContext: () => ctx.current,
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/services/api', () => ({
    ApiService: { getTestAttempt: vi.fn(), submitTestSuite: vi.fn() },
}));
vi.mock('@/services/gameApi', () => ({
    GameService: { claimTest: vi.fn() },
}));

const envelope = <T,>(data: T, isSuccess = true, message = '') =>
    ({ isSuccess, data, message, statusCode: isSuccess ? 200 : 500 }) as never;

const attempt = (over: Record<string, unknown> = {}) => ({
    testSuiteId: 'ts1',
    title: 'Midterm',
    timeLimitSeconds: null,
    questions: [
        {
            id: 'q1',
            text: 'Pick the prime',
            type: 'SINGLE_CHOICE',
            options: ['4', '5'],
        },
        {
            id: 'q2',
            text: 'Pick the evens',
            type: 'MULTIPLE_CHOICE',
            options: ['2', '3', '4'],
        },
        {
            id: 'q3',
            text: 'Capital of France is ___',
            type: 'FILL_IN_THE_BLANK',
            options: [],
        },
    ],
    ...over,
});

const result = {
    score: 1,
    totalQuestions: 3,
    percentage: 33,
    timeSpentSeconds: 12,
    xpGained: 10,
    totalXp: 100,
    breakdown: [
        {
            questionId: 'q1',
            text: 'Pick the prime',
            type: 'SINGLE_CHOICE',
            options: ['4', '5'],
            userAnswerIndex: 0,
            correctOptionIndex: 1,
            correct: false,
            explanation: 'Five has no divisors',
        },
        {
            questionId: 'q2',
            text: 'Pick the evens',
            type: 'MULTIPLE_CHOICE',
            options: ['2', '3', '4'],
            userAnswerIndexes: [0, 2],
            correctOptionIndexes: [0, 2],
            correct: true,
        },
        {
            questionId: 'q3',
            text: 'Capital of France is ___',
            type: 'FILL_IN_THE_BLANK',
            options: [],
            userAnswerText: '',
            correctAnswerText: 'Paris',
            correct: false,
        },
    ],
};

const open = async () => {
    render(<TakeTestPage />);
    await screen.findByTestId('take-test-page');
};

const answerEverything = () => {
    fireEvent.click(screen.getByTestId('answer-option-0'));
    fireEvent.click(screen.getByTestId('btn-next-question'));
    fireEvent.click(screen.getByTestId('answer-option-0'));
    fireEvent.click(screen.getByTestId('btn-next-question'));
    fireEvent.change(screen.getByTestId('answer-blank-input'), {
        target: { value: 'Paris' },
    });
};

describe('TakeTestPage flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ctx.current = { ...testSuiteContext };
        vi.mocked(ApiService.getTestAttempt).mockResolvedValue(
            envelope(attempt())
        );
        vi.mocked(ApiService.submitTestSuite).mockResolvedValue(
            envelope(result)
        );
        vi.mocked(GameService.claimTest).mockResolvedValue(
            envelope(null, false)
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('before the test starts', () => {
        it('shows not found for an unknown test suite', () => {
            ctx.current = { ...testSuiteContext, notFound: true };
            render(<TakeTestPage />);
            expect(screen.getByTestId('take-test-not-found')).toBeVisible();
        });

        it('shows a loading state while the suite context loads', () => {
            ctx.current = { ...testSuiteContext, isLoading: true };
            render(<TakeTestPage />);
            expect(screen.getByTestId('take-test-loading')).toBeVisible();
        });

        it('shows the server message when the attempt cannot be loaded', async () => {
            vi.mocked(ApiService.getTestAttempt).mockResolvedValue(
                envelope(null, false, 'Test is closed')
            );
            render(<TakeTestPage />);
            expect(
                await screen.findByTestId('take-test-error')
            ).toHaveTextContent('Test is closed');
            fireEvent.click(screen.getByText('Back to test suite'));
            expect(push).toHaveBeenCalledWith(testSuiteContext.baseUrl);
        });

        it('falls back to a default message when the server gives none', async () => {
            vi.mocked(ApiService.getTestAttempt).mockResolvedValue(
                envelope(null, false, '')
            );
            render(<TakeTestPage />);
            expect(
                await screen.findByTestId('take-test-error')
            ).toHaveTextContent('Could not load the test.');
        });

        it('explains when the suite has no questions', async () => {
            vi.mocked(ApiService.getTestAttempt).mockResolvedValue(
                envelope(attempt({ questions: [] }))
            );
            render(<TakeTestPage />);
            expect(
                await screen.findByTestId('take-test-error')
            ).toHaveTextContent('no questions yet');
        });
    });

    describe('navigating questions', () => {
        it('moves with Previous / Next and disables them at the ends', async () => {
            await open();
            expect(screen.getByTestId('btn-prev-question')).toBeDisabled();
            fireEvent.click(screen.getByTestId('btn-next-question'));
            expect(screen.getByTestId('question-prompt')).toHaveTextContent(
                'Pick the evens'
            );
            fireEvent.click(screen.getByTestId('btn-next-question'));
            expect(screen.getByTestId('btn-next-question')).toBeDisabled();
            fireEvent.click(screen.getByTestId('btn-prev-question'));
            expect(screen.getByTestId('question-prompt')).toHaveTextContent(
                'Pick the evens'
            );
        });

        it('jumps from the sidebar navigator and marks the current question', async () => {
            await open();
            const sidebar = screen.getByTestId('test-sidebar');
            expect(sidebar).toContainElement(
                screen.getByTestId('question-navigator')
            );
            expect(sidebar).toContainElement(
                screen.getByTestId('btn-submit-test')
            );
            fireEvent.click(screen.getByTestId('nav-question-2'));
            expect(screen.getByTestId('nav-question-2')).toHaveAttribute(
                'aria-current',
                'true'
            );
            expect(screen.getByTestId('nav-question-0')).toHaveAttribute(
                'aria-current',
                'false'
            );
        });

        it('counts answered questions in the header', async () => {
            await open();
            expect(screen.getByText(/0 answered/)).toBeInTheDocument();
            fireEvent.click(screen.getByTestId('answer-option-1'));
            expect(screen.getByText(/1 answered/)).toBeInTheDocument();
        });
    });

    describe('submit confirmation', () => {
        it('does not submit until the modal is confirmed', async () => {
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            expect(screen.getByTestId('submit-confirm-modal')).toBeVisible();
            expect(ApiService.submitTestSuite).not.toHaveBeenCalled();
        });

        it('counts the unanswered questions in the modal', async () => {
            await open();
            fireEvent.click(screen.getByTestId('answer-option-0'));
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            expect(
                screen.getByTestId('submit-confirm-modal')
            ).toHaveTextContent('2 unanswered question(s)');
        });

        it('says everything is answered when nothing is missing', async () => {
            await open();
            answerEverything();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            expect(
                screen.getByTestId('submit-confirm-modal')
            ).toHaveTextContent("You've answered every question");
        });

        it('closes from Keep working and from the backdrop, without submitting', async () => {
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-cancel-submit'));
            expect(screen.queryByTestId('submit-confirm-modal')).toBeNull();

            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('submit-confirm-modal'));
            expect(screen.queryByTestId('submit-confirm-modal')).toBeNull();
            expect(ApiService.submitTestSuite).not.toHaveBeenCalled();
        });

        it('keeps the modal open when clicking inside the dialog', async () => {
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByText('Submit your test?'));
            expect(screen.getByTestId('submit-confirm-modal')).toBeVisible();
        });

        it('sends every answer once confirmed', async () => {
            await open();
            answerEverything();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-confirm-submit'));
            await screen.findByTestId('test-results');
            expect(ApiService.submitTestSuite).toHaveBeenCalledTimes(1);
            const body = vi.mocked(ApiService.submitTestSuite).mock.calls[0][2];
            expect(Object.keys(body.answers)).toEqual(['q1']);
            expect(Object.keys(body.multiAnswers)).toEqual(['q2']);
            expect(body.textAnswers).toEqual({ q3: 'Paris' });
        });

        it('stays on the test and shows the error when submitting fails', async () => {
            vi.mocked(ApiService.submitTestSuite).mockResolvedValue(
                envelope(null, false, 'Could not grade')
            );
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-confirm-submit'));
            expect(
                await screen.findByTestId('take-test-submit-error')
            ).toHaveTextContent('Could not grade');
            expect(screen.queryByTestId('submit-confirm-modal')).toBeNull();
            expect(screen.getByTestId('btn-submit-test')).toBeEnabled();
            expect(screen.queryByTestId('test-results')).toBeNull();
        });

        it('uses a default message when the failed submit has none', async () => {
            vi.mocked(ApiService.submitTestSuite).mockResolvedValue(
                envelope(null, false, '')
            );
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-confirm-submit'));
            expect(
                await screen.findByTestId('take-test-submit-error')
            ).toHaveTextContent('Could not submit the test. Please try again.');
        });

        it('disables the submit button and shows progress while sending', async () => {
            let release: (v: unknown) => void = () => undefined;
            vi.mocked(ApiService.submitTestSuite).mockReturnValue(
                new Promise((r) => (release = r)) as never
            );
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-confirm-submit'));
            await waitFor(() =>
                expect(screen.getByTestId('btn-submit-test')).toBeDisabled()
            );
            expect(screen.getByTestId('btn-submit-test')).toHaveTextContent(
                'Submitting...'
            );
            await act(async () => release(envelope(result)));
            await screen.findByTestId('test-results');
        });
    });

    describe('results', () => {
        const finish = async () => {
            await open();
            fireEvent.click(screen.getByTestId('btn-submit-test'));
            fireEvent.click(screen.getByTestId('btn-confirm-submit'));
            await screen.findByTestId('test-results');
        };

        it('summarises the score and renders each breakdown by question type', async () => {
            await finish();
            expect(
                screen.getByTestId('test-results-summary')
            ).toHaveTextContent('1 / 3 correct');
            const single = screen.getByTestId('breakdown-q1');
            expect(single).toHaveTextContent('Your answer: 4');
            expect(single).toHaveTextContent('Correct answer: 5');
            expect(single).toHaveTextContent('Five has no divisors');

            const multi = screen.getByTestId('breakdown-q2');
            expect(multi).toHaveTextContent('Your answer: 2, 4');
            expect(multi).not.toHaveTextContent('Correct answer');

            const blank = screen.getByTestId('breakdown-q3');
            expect(blank).toHaveTextContent('No answer');
            expect(blank).toHaveTextContent('Correct answer: Paris');
        });

        it('handles a skipped single-choice question and a typed fill-in answer', async () => {
            vi.mocked(ApiService.submitTestSuite).mockResolvedValue(
                envelope({
                    ...result,
                    breakdown: [
                        {
                            ...result.breakdown[0],
                            userAnswerIndex: null,
                            correctOptionIndex: null,
                        },
                        {
                            ...result.breakdown[2],
                            userAnswerText: 'Lyon',
                        },
                    ],
                })
            );
            await finish();
            expect(screen.getByTestId('breakdown-q1')).toHaveTextContent(
                'No answer'
            );
            expect(screen.getByTestId('breakdown-q3')).toHaveTextContent(
                'Your answer: Lyon'
            );
        });

        it('retakes the test by loading a fresh attempt', async () => {
            await finish();
            fireEvent.click(screen.getByTestId('btn-retake-test'));
            await screen.findByTestId('take-test-page');
            expect(ApiService.getTestAttempt).toHaveBeenCalledTimes(2);
        });

        it('goes back to the test suite from the results', async () => {
            await finish();
            fireEvent.click(screen.getByText('Back to test suite'));
            expect(push).toHaveBeenCalledWith(testSuiteContext.baseUrl);
        });

        it('closes the test from the header', async () => {
            await open();
            fireEvent.click(screen.getByTestId('btn-take-test-close'));
            expect(push).toHaveBeenCalledWith(testSuiteContext.baseUrl);
        });
    });

    describe('time limit', () => {
        it('submits automatically when the time runs out', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            vi.mocked(ApiService.getTestAttempt).mockResolvedValue(
                envelope(attempt({ timeLimitSeconds: 2 }))
            );
            await open();
            expect(ApiService.submitTestSuite).not.toHaveBeenCalled();
            await act(async () => {
                await vi.advanceTimersByTimeAsync(2500);
            });
            await screen.findByTestId('test-results');
            expect(ApiService.submitTestSuite).toHaveBeenCalledTimes(1);
        });
    });
});
