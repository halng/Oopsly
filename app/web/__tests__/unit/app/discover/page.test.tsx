import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiscoverPage from '@/app/(user)/discover/page';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: {
        getDiscoverCatalog: vi.fn(),
        getDiscoverTestSuites: vi.fn(),
        cloneTestSuite: vi.fn(),
        getShelves: vi.fn(),
    },
}));
const { setShelves } = vi.hoisted(() => ({ setShelves: vi.fn() }));
vi.mock('@/store', () => ({
    useShelfStore: { getState: () => ({ setShelves }) },
}));
vi.mock('@/components/shared', () => ({
    CloneSubjectModal: ({
        isOpen,
        shelves,
        onClose,
        onCloneSuccess,
    }: {
        isOpen: boolean;
        shelves: { id: string }[];
        onClose: () => void;
        onCloneSuccess: (s: { id: string }) => void;
    }) =>
        isOpen ? (
            <div data-testid="clone-subject-modal">
                <span data-testid="subject-modal-shelves">
                    {shelves.map((s) => s.id).join(',')}
                </span>
                <button
                    data-testid="mock-subject-cloned"
                    onClick={() => onCloneSuccess({ id: 'd1' })}
                />
                <button data-testid="mock-subject-close" onClick={onClose} />
            </div>
        ) : null,
    CloneTestSuiteModal: ({
        testSuite,
        shelves,
        onClose,
        onCloned,
    }: {
        testSuite: unknown;
        shelves: { id: string }[];
        onClose: () => void;
        onCloned: (t: { id: string }) => void;
    }) =>
        testSuite ? (
            <div data-testid="clone-test-suite-modal">
                <span data-testid="suite-modal-shelves">
                    {shelves.map((s) => s.id).join(',')}
                </span>
                <button
                    data-testid="mock-suite-cloned"
                    onClick={() => onCloned({ id: 'new-suite' })}
                />
                <button data-testid="mock-suite-close" onClick={onClose} />
            </div>
        ) : null,
}));

const catalogItem = {
    id: 'd1',
    title: 'Anatomy',
    description: 'Bones and muscles',
    tags: 'science,biology',
    color: '#8BC34A',
    cardsPreview: [],
};

describe('DiscoverPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getDiscoverCatalog).mockResolvedValue({
            isSuccess: true,
            data: { entities: [catalogItem] },
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getDiscoverTestSuites).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [
                    {
                        id: 'ts1',
                        title: 'Cell Biology Quiz',
                        description: 'Organelles',
                        questionCount: 12,
                        timeLimitMinutes: 20,
                    },
                ],
            },
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: { entities: [{ id: 's1', name: 'Science' }] },
            message: '',
            timestamp: '',
        } as never);
    });

    it('renders catalog cards after loading', async () => {
        render(<DiscoverPage />);
        expect(screen.getByTestId('discover-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument()
        );
        expect(screen.getByTestId('discover-page')).toBeInTheDocument();
    });

    it('filters by search and opens clone modal', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument()
        );
        // Tags are a comma-separated string and are searchable.
        fireEvent.change(screen.getByTestId('input-discover-search'), {
            target: { value: 'biology' },
        });
        expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('input-discover-search'), {
            target: { value: 'missing' },
        });
        expect(screen.getByTestId('discover-empty')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('input-discover-search'), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByTestId('btn-clone-d1'));
        expect(screen.getByTestId('clone-subject-modal')).toBeInTheDocument();
    });

    it('switches to test suites, filters them and opens the clone modal', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        expect(screen.queryByTestId('discover-card-d1')).toBeNull();
        expect(screen.getByTestId('discover-suite-ts1')).toHaveTextContent(
            '12 questions · 20 min'
        );
        fireEvent.change(screen.getByTestId('input-discover-search'), {
            target: { value: 'nothing' },
        });
        expect(screen.getByTestId('discover-empty')).toHaveTextContent(
            'No test suites found.'
        );
        fireEvent.change(screen.getByTestId('input-discover-search'), {
            target: { value: 'organelles' },
        });
        fireEvent.click(screen.getByTestId('btn-clone-suite-ts1'));
        expect(
            screen.getByTestId('clone-test-suite-modal')
        ).toBeInTheDocument();
    });

    it('gives both clone modals the fetched shelves and stores them', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument()
        );
        expect(setShelves).toHaveBeenCalledWith([
            { id: 's1', name: 'Science' },
        ]);
        fireEvent.click(screen.getByTestId('btn-clone-d1'));
        expect(screen.getByTestId('subject-modal-shelves')).toHaveTextContent(
            's1'
        );
        fireEvent.click(screen.getByTestId('mock-subject-close'));
        expect(screen.queryByTestId('clone-subject-modal')).toBeNull();

        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        fireEvent.click(screen.getByTestId('btn-clone-suite-ts1'));
        expect(screen.getByTestId('suite-modal-shelves')).toHaveTextContent(
            's1'
        );
        fireEvent.click(screen.getByTestId('mock-suite-close'));
        expect(screen.queryByTestId('clone-test-suite-modal')).toBeNull();
    });

    it('removes a deck from the catalog once it is cloned', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-clone-d1')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-clone-d1'));
        fireEvent.click(screen.getByTestId('mock-subject-cloned'));
        expect(screen.queryByTestId('discover-card-d1')).toBeNull();
        expect(screen.queryByTestId('clone-subject-modal')).toBeNull();
        expect(screen.getByTestId('discover-empty')).toBeInTheDocument();
    });

    it('removes a test suite from the catalog once it is cloned', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('tab-discover-tests')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        fireEvent.click(screen.getByTestId('btn-clone-suite-ts1'));
        fireEvent.click(screen.getByTestId('mock-suite-cloned'));
        expect(screen.queryByTestId('discover-suite-ts1')).toBeNull();
        // The decks tab is untouched.
        fireEvent.click(screen.getByTestId('tab-discover-decks'));
        expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument();
    });

    it('loads shelves with the first page (pages start at 1)', async () => {
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument()
        );
        expect(ApiService.getShelves).toHaveBeenCalledWith(1, 100);
    });

    it('filters decks by tag and hides the tag chips on the test suites tab', async () => {
        vi.mocked(ApiService.getDiscoverCatalog).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [
                    catalogItem,
                    {
                        ...catalogItem,
                        id: 'd2',
                        name: 'Organic',
                        tags: 'chemistry',
                    },
                ],
            },
        } as never);
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-tag-all')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByRole('button', { name: '#chemistry' }));
        expect(screen.queryByTestId('discover-card-d1')).toBeNull();
        expect(screen.getByTestId('discover-card-d2')).toBeInTheDocument();
        // Clicking the active tag again clears it.
        fireEvent.click(screen.getByRole('button', { name: '#chemistry' }));
        expect(screen.getByTestId('discover-card-d1')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '#biology' }));
        expect(screen.queryByTestId('discover-card-d2')).toBeNull();
        fireEvent.click(screen.getByTestId('btn-tag-all'));
        expect(screen.getByTestId('discover-card-d2')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        expect(screen.queryByTestId('btn-tag-all')).toBeNull();
    });

    it('shows empty states when the catalogs fail to load', async () => {
        vi.mocked(ApiService.getDiscoverCatalog).mockResolvedValue({
            isSuccess: false,
            data: null,
        } as never);
        vi.mocked(ApiService.getDiscoverTestSuites).mockResolvedValue({
            isSuccess: false,
            data: null,
        } as never);
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: false,
            data: null,
        } as never);
        render(<DiscoverPage />);
        expect(await screen.findByTestId('discover-empty')).toHaveTextContent(
            'No decks found.'
        );
        expect(setShelves).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        expect(screen.getByTestId('discover-empty')).toHaveTextContent(
            'No test suites found.'
        );
    });

    it('omits the time limit for suites without one', async () => {
        vi.mocked(ApiService.getDiscoverTestSuites).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [{ id: 'ts2', title: 'Quick', questionCount: 1 }],
            },
        } as never);
        render(<DiscoverPage />);
        await waitFor(() =>
            expect(screen.getByTestId('tab-discover-tests')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('tab-discover-tests'));
        expect(screen.getByTestId('discover-suite-ts2')).toHaveTextContent(
            '1 questions'
        );
        expect(screen.getByTestId('discover-suite-ts2')).not.toHaveTextContent(
            'min'
        );
    });
});
