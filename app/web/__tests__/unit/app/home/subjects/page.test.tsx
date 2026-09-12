import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectDetailsPage from '@/app/(app)/home/[shelfId]/subjects/[subjectId]/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ shelfId: 's1', subjectId: 'sub1' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getSubject: vi.fn(),
        getSubjectCards: vi.fn(),
        createCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        generateCardsWithAI: vi.fn(),
        updateSubject: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ImportCardsModal: () => null,
    SubjectScheduleModal: () => null,
    JoinGameModal: () => null,
    CssProgressBar: () => <div data-testid="css-progress-bar" />,
}));

const subject = {
    id: 'sub1',
    shelfId: 's1',
    title: 'Biology',
    description: 'Cells',
    tags: ['cells'],
    isDeleted: false,
    cardCount: 1,
    dueCount: 1,
    cards: [
        {
            id: 'c1',
            front: 'Mitochondria',
            back: 'Powerhouse',
            isDeleted: false,
        },
    ],
    testSuites: [],
};

describe('SubjectDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubject).mockResolvedValue({
            isSuccess: true,
            data: subject,
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: subject.cards,
            message: '',
            timestamp: '',
        } as never);
    });

    it('loads subject details and routes study actions', async () => {
        render(<SubjectDetailsPage />);
        expect(screen.getByTestId('subject-details-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('subject-details-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-subject-review'));
        fireEvent.click(screen.getByTestId('btn-subject-learn'));
        fireEvent.click(screen.getByTestId('btn-subject-match'));
        fireEvent.click(screen.getByTestId('btn-subject-test'));
        fireEvent.click(screen.getByTestId('btn-subject-back'));
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/review');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/learn');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/match');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/test');
        expect(push).toHaveBeenCalledWith('/home/s1');
    });
});
