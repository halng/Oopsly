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
            data: [{ id: 's1' }],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: [
                {
                    id: 'late',
                    title: 'Late',
                    cardCount: 2,
                    dueCount: 1,
                    color: '#111',
                    schedule: { enabled: true, days: [1], time: '18:00' },
                },
                {
                    id: 'early',
                    title: 'Early',
                    cardCount: 3,
                    dueCount: 0,
                    schedule: { enabled: true, days: [1], time: '08:00' },
                },
                {
                    id: 'ignored',
                    title: 'Ignored',
                    schedule: { enabled: false, days: [1], time: '01:00' },
                },
            ] as never,
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
});
