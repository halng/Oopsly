import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectDetailsPage from '@/app/(user)/home/[slug]/subjects/[subSlug]/page';
import { ApiService } from '@/services/api';
import { useToastStore } from '@/store/ToastStore';
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
    CssProgressBar: () => <div data-testid="css-progress-bar" />,
}));

describe('SubjectDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useToastStore.setState({ toasts: [] });
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

    it('enables the study buttons when the subject has cards', async () => {
        render(<SubjectDetailsPage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-subject-review')).toBeEnabled()
        );
        expect(screen.getByTestId('btn-subject-learn')).toBeEnabled();
        expect(screen.getByTestId('btn-subject-match')).toBeEnabled();
    });

    it('disables the study buttons when the subject has no cards', async () => {
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [],
                currentPage: 1,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<SubjectDetailsPage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-subject-review')).toBeDisabled()
        );
        for (const id of ['review', 'learn', 'match']) {
            const button = screen.getByTestId(`btn-subject-${id}`);
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute(
                'title',
                'Add cards to start practising'
            );
            fireEvent.click(button);
        }
        expect(push).not.toHaveBeenCalled();
    });

    it('toasts after deleting a card, and not when the delete fails', async () => {
        vi.mocked(ApiService.deleteCard).mockResolvedValue({
            isSuccess: true,
            data: null,
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<SubjectDetailsPage />);
        const del = await screen.findByTestId('btn-delete-card-c1');
        fireEvent.click(del);
        await waitFor(() =>
            expect(useToastStore.getState().toasts[0]).toMatchObject({
                kind: 'success',
                title: 'Card deleted',
            })
        );

        useToastStore.setState({ toasts: [] });
        vi.mocked(ApiService.deleteCard).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'x',
            statusCode: 500,
            timestamp: '',
        });
        fireEvent.click(await screen.findByTestId('btn-delete-card-c1'));
        await waitFor(() =>
            expect(ApiService.deleteCard).toHaveBeenCalledTimes(2)
        );
        expect(useToastStore.getState().toasts).toEqual([]);
    });

    it('shows twenty cards per page and goes back to page one on a new search', async () => {
        const cards = Array.from({ length: 25 }, (_, i) =>
            card({ id: `c${i + 1}`, front: `Term ${i + 1}`, back: 'x' })
        );
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: cards,
                currentPage: 1,
                totalItems: 25,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<SubjectDetailsPage />);
        await waitFor(() =>
            expect(screen.getByTestId('card-row-c1')).toBeInTheDocument()
        );
        expect(screen.getAllByTestId(/^card-row-/)).toHaveLength(20);
        expect(screen.getByTestId('cards-pagination-status')).toHaveTextContent(
            'Page 1 of 2'
        );

        fireEvent.click(screen.getByTestId('cards-pagination-next'));
        expect(screen.getAllByTestId(/^card-row-/)).toHaveLength(5);
        expect(screen.getByTestId('card-row-c25')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText('Search cards...'), {
            target: { value: 'Term 2' },
        });
        expect(screen.getByTestId('card-row-c2')).toBeInTheDocument();
        expect(
            screen.queryByTestId('cards-pagination')
        ).not.toBeInTheDocument();
    });
});
