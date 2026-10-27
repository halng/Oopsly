import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectDetailsPage from '@/app/(user)/home/[slug]/subjects/[subSlug]/page';
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
        createCards: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        generateCardsWithAI: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ImportCardsModal: () => null,
    SubjectScheduleModal: () => null,
    HostGameModal: () => null,
    CssProgressBar: () => <div data-testid="css-progress-bar" />,
}));

describe('SubjectDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [
                    card({
                        id: 'c1',
                        front: 'Mitochondria',
                        back: 'Powerhouse',
                    }),
                ],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('loads subject details and routes study actions', async () => {
        render(<SubjectDetailsPage />);
        await waitFor(() =>
            expect(
                screen.getByTestId('subject-details-page')
            ).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-subject-review'));
        fireEvent.click(screen.getByTestId('btn-subject-learn'));
        fireEvent.click(screen.getByTestId('btn-subject-match'));
        fireEvent.click(screen.getByTestId('btn-subject-back'));
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/review'
        );
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/learn'
        );
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/match'
        );
        expect(push).toHaveBeenCalledWith('/home/science');
        expect(
            screen.queryByTestId('btn-subject-test')
        ).not.toBeInTheDocument();
    });
});
