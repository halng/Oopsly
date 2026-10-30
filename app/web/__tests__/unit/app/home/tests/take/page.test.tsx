import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TakeTestPage from '@/app/(user)/home/[slug]/tests/[testSlug]/take/page';
import { ApiService } from '@/services/api';
import { GameService } from '@/services/gameApi';
import { testSuiteContext } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science', testSlug: 'midterm' }),
}));
vi.mock('@/hooks/useTestSuiteContext', () => ({
    useTestSuiteContext: () => testSuiteContext,
}));
vi.mock('next/dynamic', () => ({
    default: (importer: () => Promise<{ default: React.ComponentType }>) => {
        const Lazy = React.lazy(importer);
        return function DynamicComponent(props: Record<string, unknown>) {
            return (
                <React.Suspense fallback={null}>
                    <Lazy {...props} />
                </React.Suspense>
            );
        };
    },
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getTestAttempt: vi.fn(),
        submitTestSuite: vi.fn(),
    },
}));
vi.mock('@/services/gameApi', () => ({
    GameService: {
        claimTest: vi.fn(),
    },
}));
vi.mock('@/components/garden/PouchReveal', () => ({
    default: ({ species, rarity }: { species: string; rarity: string }) => (
        <div data-testid="seed-pouch">
            {species} {rarity}
        </div>
    ),
}));

describe('TakeTestPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getTestAttempt).mockResolvedValue({
            isSuccess: true,
            data: {
                testSuiteId: 'ts1',
                title: 'Midterm',
                timeLimitSeconds: null,
                questions: [
                    {
                        id: 'q1',
                        text: '2+2?',
                        type: 'SINGLE_CHOICE',
                        options: ['3', '4'],
                    },
                ],
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(GameService.claimTest).mockResolvedValue({
            isSuccess: true,
            data: {
                species: 'camphor_tree',
                rarity: 'Legendary',
                dewDropsGained: 10,
                sunlightOrbsGained: 5,
                forestCoinsGained: 10,
                growthPointsGained: 20,
                xpGained: 0,
                garden: {} as never,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.submitTestSuite).mockResolvedValue({
            isSuccess: true,
            data: {
                score: 1,
                totalQuestions: 1,
                percentage: 100,
                timeSpentSeconds: 5,
                xpGained: 75,
                totalXp: 200,
                breakdown: [
                    {
                        questionId: 'q1',
                        text: '2+2?',
                        type: 'SINGLE_CHOICE',
                        userAnswerIndex: 1,
                        userAnswerIndexes: null,
                        userAnswerText: null,
                        correctOptionIndex: 1,
                        correctOptionIndexes: null,
                        correctAnswerText: null,
                        options: ['3', '4'],
                        correct: true,
                        explanation: 'Arithmetic',
                    },
                ],
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('loads an attempt, answers, and submits', async () => {
        render(<TakeTestPage />);
        await waitFor(() =>
            expect(screen.getByTestId('question-prompt')).toHaveTextContent(
                '2+2?'
            )
        );
        fireEvent.click(screen.getByTestId('answer-option-0'));
        fireEvent.click(screen.getByTestId('btn-submit-test'));
        expect(ApiService.submitTestSuite).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('btn-confirm-submit'));
        await waitFor(() =>
            expect(ApiService.submitTestSuite).toHaveBeenCalled()
        );
        expect(screen.getByTestId('test-breakdown')).toBeInTheDocument();
        await waitFor(() =>
            expect(GameService.claimTest).toHaveBeenCalledWith(100)
        );
        expect(await screen.findByTestId('seed-pouch')).toHaveTextContent(
            'camphor_tree'
        );
    });

    it('keeps the attempt open when the confirmation is cancelled', async () => {
        render(<TakeTestPage />);
        await waitFor(() =>
            expect(screen.getByTestId('question-prompt')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-submit-test'));
        expect(screen.getByTestId('submit-confirm-modal')).toHaveTextContent(
            '1 unanswered question(s)'
        );
        fireEvent.click(screen.getByTestId('btn-cancel-submit'));
        expect(screen.queryByTestId('submit-confirm-modal')).toBeNull();
        expect(ApiService.submitTestSuite).not.toHaveBeenCalled();
    });
});
