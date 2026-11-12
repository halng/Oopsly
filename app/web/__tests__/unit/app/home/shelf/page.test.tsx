import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShelfPage from '@/app/(user)/home/[slug]/page';
import { ApiService } from '@/services/api';
import { useShelfStore } from '@/store';
import {
    shelf,
    subject,
    testSuite,
} from '@/__tests__/unit/helpers/studyFixtures';

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
        deleteShelf: vi.fn(),
        createTestSuite: vi.fn(),
        updateTestSuite: vi.fn(),
        deleteTestSuite: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ShelfModal: ({
        onClose,
        onSave,
    }: {
        onClose: () => void;
        onSave: (data: { name: string; description: string }) => void;
    }) => (
        <div>
            <button onClick={onClose}>Close shelf modal</button>
            <button
                onClick={() =>
                    onSave({
                        name: 'Renamed',
                        description: 'A new description',
                    })
                }
            >
                Save shelf modal
            </button>
        </div>
    ),
    SubjectModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close subject modal</button>
    ),
    TestSuiteModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close test suite modal</button>
    ),
    HostGameModal: ({ onClose }: { onClose: () => void }) => (
        <div data-testid="host-game-modal">
            <button data-testid="btn-host-game-close" onClick={onClose} />
        </div>
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
            data: {
                entities: [testSuite],
                currentPage: 0,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
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
        fireEvent.click(screen.getByTestId('btn-host-test-suite-ts1'));
        expect(screen.getByTestId('host-game-modal')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-host-game-close'));
        fireEvent.click(screen.getByTestId('btn-back-to-shelves'));
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/review'
        );
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/learn'
        );
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/match'
        );
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
            expect(
                screen.getByTestId('shelf-subjects-empty')
            ).toBeInTheDocument()
        );
    });

    it('pages the subjects ten at a time from the server', async () => {
        const other = {
            ...subject,
            id: 'sub2',
            name: 'Chemistry',
            slug: 'chem',
        };
        vi.mocked(ApiService.getShelfSubjects).mockImplementation(
            async (_shelfId: string, pageNumber = 1) =>
                ({
                    isSuccess: true,
                    data: {
                        entities: [pageNumber === 1 ? subject : other],
                        currentPage: pageNumber,
                        totalItems: 11,
                        totalPages: 2,
                        hasNextPage: pageNumber === 1,
                    },
                    message: '',
                    statusCode: 200,
                    timestamp: '',
                }) as never
        );
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('subject-card-sub1')).toBeInTheDocument()
        );
        expect(ApiService.getShelfSubjects).toHaveBeenCalledWith('s1', 1, 10);

        fireEvent.click(screen.getByTestId('subjects-pagination-next'));
        await waitFor(() =>
            expect(screen.getByTestId('subject-card-sub2')).toBeInTheDocument()
        );
        expect(ApiService.getShelfSubjects).toHaveBeenLastCalledWith(
            's1',
            2,
            10
        );
        expect(
            screen.queryByTestId('subject-card-sub1')
        ).not.toBeInTheDocument();
        // moving between pages does not blank the page behind a loader
        expect(screen.getByTestId('shelf-page')).toBeInTheDocument();
    });

    it('pages the test suites ten at a time from the server', async () => {
        const second = {
            ...testSuite,
            id: 'ts2',
            slug: 'final',
            title: 'Final',
        };
        vi.mocked(ApiService.getTestSuites).mockImplementation(
            async (_shelfId: string, pageNumber = 1) =>
                ({
                    isSuccess: true,
                    data: {
                        entities: [pageNumber === 1 ? testSuite : second],
                        currentPage: pageNumber - 1,
                        totalItems: 11,
                        totalPages: 2,
                        hasNextPage: pageNumber === 1,
                    },
                    message: '',
                    statusCode: 200,
                    timestamp: '',
                }) as never
        );
        render(<ShelfPage />);
        await waitFor(() =>
            expect(
                screen.getByTestId('test-suite-card-ts1')
            ).toBeInTheDocument()
        );
        expect(ApiService.getTestSuites).toHaveBeenCalledWith('s1', 1, 10);
        expect(
            screen.getByTestId('test-suites-pagination-status')
        ).toHaveTextContent('Page 1 of 2');

        fireEvent.click(screen.getByTestId('test-suites-pagination-next'));
        await waitFor(() =>
            expect(
                screen.getByTestId('test-suite-card-ts2')
            ).toBeInTheDocument()
        );
        expect(ApiService.getTestSuites).toHaveBeenLastCalledWith('s1', 2, 10);
        expect(
            screen.queryByTestId('test-suite-card-ts1')
        ).not.toBeInTheDocument();
        expect(screen.getByTestId('shelf-page')).toBeInTheDocument();
    });

    it('renames the shelf with a full update that keeps its address, and never deletes it', async () => {
        vi.mocked(ApiService.updateShelf).mockResolvedValue({
            isSuccess: true,
            data: null,
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-edit-active-shelf'));
        fireEvent.click(screen.getByText('Save shelf modal'));

        await waitFor(() =>
            expect(ApiService.updateShelf).toHaveBeenCalledWith('s1', {
                name: 'Renamed',
                slug: 'science',
                description: 'A new description',
                icon: shelf.icon,
                color: shelf.color,
            })
        );
        // The shelf is still there, under its new name, with the same address.
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toHaveTextContent(
                'Renamed'
            )
        );
        expect(ApiService.deleteShelf).not.toHaveBeenCalled();
        expect(useShelfStore.getState().getCurrentShelf('science')?.name).toBe(
            'Renamed'
        );
    });
});
