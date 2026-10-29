import { beforeEach, describe, expect, it } from 'vitest';
import { toast, useToastStore } from '@/store/ToastStore';

describe('ToastStore', () => {
    beforeEach(() => useToastStore.setState({ toasts: [] }));

    it('pushes toasts of each kind with a unique id', () => {
        const a = toast.success('Saved', 'details');
        const b = toast.error('Failed');
        const c = toast.info('FYI');
        expect(new Set([a, b, c]).size).toBe(3);
        expect(useToastStore.getState().toasts).toEqual([
            { id: a, kind: 'success', title: 'Saved', description: 'details' },
            { id: b, kind: 'error', title: 'Failed', description: undefined },
            { id: c, kind: 'info', title: 'FYI', description: undefined },
        ]);
    });

    it('collapses identical repeats, keeping only the newest', () => {
        toast.error('Boom', 'same');
        const last = toast.error('Boom', 'same');
        const { toasts } = useToastStore.getState();
        expect(toasts).toHaveLength(1);
        expect(toasts[0].id).toBe(last);
    });

    it('keeps different descriptions apart', () => {
        toast.error('Boom', 'one');
        toast.error('Boom', 'two');
        expect(useToastStore.getState().toasts).toHaveLength(2);
    });

    it('shows at most four toasts, dropping the oldest', () => {
        for (let i = 1; i <= 6; i++) toast.info(`t${i}`);
        expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual([
            't3',
            't4',
            't5',
            't6',
        ]);
    });

    it('dismisses by id', () => {
        const id = toast.info('bye');
        toast.info('stay');
        toast.dismiss(id);
        expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual([
            'stay',
        ]);
    });
});
