import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MatchPage from '@/app/(user)/home/[slug]/subjects/[subSlug]/match/page';
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

describe('MatchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [
                    card({ id: 'c1', front: 'Q1', back: 'A1' }),
                    card({ id: 'c2', front: 'Q2', back: 'A2' }),
                ],
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
    });

    it('loads matching tiles and can close', async () => {
        render(<MatchPage />);
        expect(screen.getByTestId('match-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('matching-game-page')).toBeInTheDocument()
        );
        expect(screen.getByTestId('match-progress')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-match-close'));
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology');
    });

    it('starts the displayed clock when the board is ready', async () => {
        const now = vi.spyOn(Date, 'now').mockReturnValue(10_000);
        try {
            render(<MatchPage />);
            await waitFor(() =>
                expect(
                    screen.getByTestId('matching-game-page')
                ).toBeInTheDocument()
            );

            now.mockReturnValue(50_000);
            await waitFor(() =>
                expect(screen.getByTestId('study-timer')).toHaveTextContent(
                    '00:40'
                )
            );
        } finally {
            now.mockRestore();
        }
    });

    it('shows empty state when there are too few cards', async () => {
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [card({ id: 'c1' })],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<MatchPage />);
        await waitFor(() =>
            expect(screen.getByTestId('match-empty')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-match-close'));
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology');
    });
});
