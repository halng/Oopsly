import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShelfPage from '@/app/(user)/home/[slug]/page';
import { ApiService } from '@/services/api';
import { useShelfStore } from '@/store';
import { shelf, subject, testSuite } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getShelves: vi.fn(),
        getShelfSubjects: vi.fn(),
        getTestSuites: vi.fn(),
        createSubject: vi.fn(),
        updateSubject: vi.fn(),
        deleteSubject: vi.fn(),
        updateShelf: vi.fn(),
        createTestSuite: vi.fn(),
        updateTestSuite: vi.fn(),
        deleteTestSuite: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ShelfModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close shelf modal</button>
    ),
    SubjectModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close subject modal</button>
    ),
    TestSuiteModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close test suite modal</button>
    ),
    ImportCardsModal: () => <div data-testid="import-cards-modal" />,
    CloneSubjectModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="clone-subject-modal" /> : null,
}));

describe('ShelfPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useShelfStore.setState({ shelves: [shelf] });
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [shelf],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [subject],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.getTestSuites).mockResolvedValue({
            isSuccess: true,
            data: [testSuite],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('loads subjects and test suites and routes study actions', async () => {
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toBeInTheDocument()
        );
        expect(screen.getByTestId('subject-card-sub1')).toBeInTheDocument();
        expect(screen.getByTestId('test-suite-card-ts1')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-review-sub1'));
        fireEvent.click(screen.getByTestId('btn-learn-sub1'));
        fireEvent.click(screen.getByTestId('btn-match-sub1'));
        fireEvent.click(screen.getByTestId('btn-take-test-suite-ts1'));
        fireEvent.click(screen.getByTestId('btn-back-to-shelves'));
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology/review');
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology/learn');
        expect(push).toHaveBeenCalledWith('/home/science/subjects/biology/match');
        expect(push).toHaveBeenCalledWith('/home/science/tests/midterm/take');
        expect(push).toHaveBeenCalledWith('/home');
        expect(screen.queryByTestId('btn-test-sub1')).not.toBeInTheDocument();
    });

    it('opens the create-subject modal from the shelf page', async () => {
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-create-subject-in-shelf'));
        expect(screen.getByText('Close subject modal')).toBeInTheDocument();
    });

    it('shows empty state when the shelf has no subjects', async () => {
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
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
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-subjects-empty')).toBeInTheDocument()
        );
    });
});
