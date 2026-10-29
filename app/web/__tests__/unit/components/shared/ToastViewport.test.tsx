import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ToastViewport from '@/components/shared/ToastViewport';
import { toast, useToastStore } from '@/store/ToastStore';

afterEach(() => {
    act(() => useToastStore.setState({ toasts: [] }));
    vi.useRealTimers();
});

describe('ToastViewport', () => {
    it('shows success and error toasts with proper roles', () => {
        render(<ToastViewport />);
        act(() => {
            toast.success('Saved');
            toast.error("Couldn't delete that", 'You are offline.');
        });
        expect(screen.getByRole('status')).toHaveTextContent('Saved');
        expect(screen.getByRole('alert')).toHaveTextContent('You are offline.');
    });

    it('dismisses on click', async () => {
        render(<ToastViewport />);
        act(() => {
            toast.info('Hello');
        });
        await userEvent.click(screen.getByTestId('btn-toast-dismiss'));
        expect(screen.queryByText('Hello')).toBeNull();
    });

    it('auto-dismisses and collapses duplicates', () => {
        vi.useFakeTimers();
        render(<ToastViewport />);
        act(() => {
            toast.success('Saved');
            toast.success('Saved');
        });
        expect(screen.getAllByText('Saved')).toHaveLength(1);
        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(screen.queryByText('Saved')).toBeNull();
    });
});
