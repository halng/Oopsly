import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LearnPage from '@/app/(user)/home/[slug]/subjects/[subSlug]/learn/page';
import { ApiService } from '@/services/api';
import { card, subjectContext } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science', subSlug: 'biology' }),
}));
vi.mock('@/hooks/useSubjectContext', () => ({
    useSubjectContext: () => subjectContext,
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getSubjectCards: vi.fn(),
        startStudySession: vi.fn(),
        logStudySession: vi.fn(),
    },
}));

const cards = [
    card({ id: 'c1', front: 'Q1', back: 'A1' }),
    card({ id: 'c2', front: 'Q2', back: 'A2' }),
];

describe('LearnPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: cards,
                currentPage: 1,
                totalItems: 2,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.startStudySession).mockResolvedValue({
            isSuccess: true,
            data: { id: 'session-1', totalItems: 2 },
            message: '',
            statusCode: 201,
            timestamp: '',
        });
        vi.mocked(ApiService.logStudySession).mockResolvedValue({
            isSuccess: true,
            data: { id: 'ss1', xpGained: 20, totalXp: 100 },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('loads learn mode, answers an MCQ, and can close', async () => {
        render(<LearnPage />);
        expect(screen.getByTestId('learn-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('learn-mode-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getAllByTestId('btn-learn-option')[0]);
        expect(screen.getByTestId('learn-feedback')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-learn-close'));
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology');
    });

    it('starts a fresh tracked session when learning again', async () => {
        vi.mocked(ApiService.startStudySession)
            .mockResolvedValueOnce({
                isSuccess: true,
                data: { id: 'session-1', totalItems: 2 },
                message: '',
                statusCode: 201,
                timestamp: '',
            })
            .mockResolvedValueOnce({
                isSuccess: true,
                data: { id: 'session-2', totalItems: 2 },
                message: '',
                statusCode: 201,
                timestamp: '',
            });
        render(<LearnPage />);
        await waitFor(() =>
            expect(screen.getByTestId('learn-mode-page')).toBeInTheDocument()
        );

        for (let attempt = 0; attempt < 10; attempt += 1) {
            if (screen.queryByTestId('learn-complete')) break;
            if (screen.queryByTestId('learn-round-summary')) {
                fireEvent.click(screen.getByTestId('btn-learn-next-round'));
            } else if (screen.queryByTestId('learn-feedback')) {
                fireEvent.click(screen.getByTestId('btn-learn-next'));
            } else {
                const answer =
                    screen.getByTestId('learn-prompt').textContent === 'Q1'
                        ? 'A1'
                        : 'A2';
                const input = screen.queryByTestId('learn-written-input');
                if (input) {
                    fireEvent.change(input, { target: { value: answer } });
                    fireEvent.click(screen.getByTestId('btn-learn-submit'));
                } else {
                    const option = screen
                        .getAllByTestId('btn-learn-option')
                        .find((button) => button.textContent?.includes(answer));
                    expect(option).toBeDefined();
                    fireEvent.click(option!);
                }
            }
        }

        await waitFor(() =>
            expect(screen.getByTestId('learn-complete')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-learn-restart'));

        await waitFor(() =>
            expect(ApiService.startStudySession).toHaveBeenCalledTimes(2)
        );
        expect(ApiService.startStudySession).toHaveBeenLastCalledWith(
            's1',
            'sub1',
            'LEARN'
        );
        expect(screen.getByTestId('learn-mode-page')).toBeInTheDocument();
    });

    it('shows empty state when there are fewer than two cards', async () => {
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [cards[0]],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<LearnPage />);
        await waitFor(() =>
            expect(screen.getByTestId('learn-empty')).toBeInTheDocument()
        );
    });
});
