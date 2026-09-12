import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiscoverPage from '@/app/(app)/discover/page';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: {
        getDiscoverCatalog: vi.fn(),
        getShelves: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    CloneSubjectModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="clone-subject-modal" /> : null,
}));

const catalogItem = {
    id: 'd1',
    title: 'Anatomy',
    description: 'Bones and muscles',
    tags: ['science'],
    color: '#8BC34A',
    cardsPreview: [],
};

describe('DiscoverPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getDiscoverCatalog).mockResolvedValue({
            isSuccess: true,
            data: [catalogItem],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: [{ id: 's1', name: 'Science', isDeleted: false }],
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
});
