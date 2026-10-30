import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CalendarModal from '@/components/shared/CalendarModal';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: { getShelves: vi.fn(), getShelfSubjects: vi.fn() },
}));

describe('CalendarModal', () => {
    it('shows scheduled subjects sorted by time and supports closing', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [{ id: 's1' }],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [
                    {
                        id: 'late',
                        name: 'Late',
                        title: 'Late',
                        cardCount: 2,
                        dueCount: 1,
                        color: '#111',
                        schedule: { enabled: true, days: [1], time: '18:00' },
                    },
                    {
                        id: 'early',
                        name: 'Early',
                        title: 'Early',
                        cardCount: 3,
                        dueCount: 0,
                        schedule: { enabled: true, days: [1], time: '08:00' },
                    },
                    {
                        id: 'ignored',
                        name: 'Ignored',
                        title: 'Ignored',
                        schedule: { enabled: false, days: [1], time: '01:00' },
                    },
                ],
                currentPage: 1,
                totalItems: 3,
                totalPages: 1,
                hasNextPage: false,
            } as never,
            message: '',
            timestamp: '',
        });
        const onClose = vi.fn();
        render(<CalendarModal onClose={onClose} />);
        await waitFor(() =>
            expect(screen.getByText('Early')).toBeInTheDocument()
        );
        expect(screen.getByText('Late')).toBeInTheDocument();
        expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
        expect(
            screen
                .getByText('Early')
                .compareDocumentPosition(screen.getByText('Late')) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        screen.getByRole('button').click();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('renders the empty state for failed responses', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'offline',
            timestamp: '',
        } as never);
        render(<CalendarModal onClose={vi.fn()} />);
        await waitFor(() =>
            expect(screen.getByText('No Scheduled Studies')).toBeInTheDocument()
        );
    });

    it('asks for the first page of shelves (pages start at 1)', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: { entities: [] },
            message: '',
            timestamp: '',
        } as never);
        render(<CalendarModal onClose={vi.fn()} />);
        await waitFor(() =>
            expect(ApiService.getShelves).toHaveBeenCalledWith(1, 100)
        );
    });
});
