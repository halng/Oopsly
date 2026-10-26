import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectScheduleModal from '@/components/shared/SubjectScheduleModal';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: { updateSubject: vi.fn() },
}));

const baseSubject = { id: 'sub1', name: 'Physics' };

const setup = (subject: Record<string, unknown> = baseSubject) => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    render(
        <SubjectScheduleModal
            subject={subject as never}
            onClose={onClose}
            onUpdate={onUpdate}
        />
    );
    return { onClose, onUpdate };
};

const save = () => fireEvent.click(screen.getByTestId('btn-schedule-save'));

describe('SubjectScheduleModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts with the default disabled schedule', () => {
        setup();
        expect(screen.getByText('Physics')).toBeInTheDocument();
        expect(screen.getByTestId('input-schedule-time')).toHaveValue('18:00');
        expect(
            screen.getByTestId('btn-schedule-day-1').className
        ).not.toContain('bg-indigo-600');
    });

    it('starts from the existing schedule', () => {
        setup({
            ...baseSubject,
            schedule: { days: [2, 4], time: '07:30', enabled: true },
        });
        expect(screen.getByTestId('input-schedule-time')).toHaveValue('07:30');
        expect(screen.getByTestId('btn-schedule-day-2').className).toContain(
            'bg-indigo-600 text-white'
        );
        expect(
            screen.getByTestId('btn-schedule-day-3').className
        ).not.toContain('text-white');
    });

    it('toggles days on and off', () => {
        setup();
        const day = screen.getByTestId('btn-schedule-day-5');
        fireEvent.click(day);
        expect(day.className).toContain('text-white');
        fireEvent.click(day);
        expect(day.className).not.toContain('text-white');
    });

    it('saves the edited schedule, then closes after the success delay', async () => {
        vi.useFakeTimers();
        vi.mocked(ApiService.updateSubject).mockResolvedValue({
            isSuccess: true,
        } as never);
        const { onClose, onUpdate } = setup();
        fireEvent.click(screen.getByTestId('btn-schedule-toggle'));
        fireEvent.click(screen.getByTestId('btn-schedule-day-3'));
        fireEvent.click(screen.getByTestId('btn-schedule-day-1'));
        fireEvent.change(screen.getByTestId('input-schedule-time'), {
            target: { value: '20:15' },
        });
        save();
        expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
        await act(async () => {
            await Promise.resolve();
        });
        expect(ApiService.updateSubject).toHaveBeenCalledWith('sub1', {
            schedule: { days: [1, 3], time: '20:15', enabled: true },
        });
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Schedule Saved')).toBeInTheDocument();
        expect(screen.getByTestId('btn-schedule-save')).toBeDisabled();
        expect(onClose).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1200);
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('re-enables saving without closing when the API fails', async () => {
        vi.mocked(ApiService.updateSubject).mockResolvedValue({
            isSuccess: false,
        } as never);
        const { onClose, onUpdate } = setup();
        save();
        expect(
            await screen.findByRole('button', { name: /Save Schedule/ })
        ).toBeEnabled();
        expect(onUpdate).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('toggles reminders off again', () => {
        setup({
            ...baseSubject,
            schedule: { days: [], time: '09:00', enabled: true },
        });
        const toggle = screen.getByTestId('btn-schedule-toggle');
        expect(toggle.className).toContain('bg-indigo-600');
        fireEvent.click(toggle);
        expect(toggle.className).not.toContain('bg-indigo-600');
    });

    it('closes from the close button', () => {
        const { onClose } = setup();
        fireEvent.click(screen.getByTestId('btn-schedule-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
