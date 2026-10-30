import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    kind: ToastKind;
    title: string;
    description?: string;
}

interface ToastState {
    toasts: Toast[];
    push: (kind: ToastKind, title: string, description?: string) => number;
    dismiss: (id: number) => void;
}

const MAX_VISIBLE = 4;
let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    push: (kind, title, description) => {
        const id = nextId++;
        set((state) => {
            // Collapse repeats so a failing retry loop doesn't stack identical toasts.
            const rest = state.toasts.filter(
                (t) =>
                    !(
                        t.kind === kind &&
                        t.title === title &&
                        t.description === description
                    )
            );
            return {
                toasts: [...rest, { id, kind, title, description }].slice(
                    -MAX_VISIBLE
                ),
            };
        });
        return id;
    },
    dismiss: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative API, usable outside React (e.g. from the API layer). */
export const toast = {
    success: (title: string, description?: string) =>
        useToastStore.getState().push('success', title, description),
    error: (title: string, description?: string) =>
        useToastStore.getState().push('error', title, description),
    info: (title: string, description?: string) =>
        useToastStore.getState().push('info', title, description),
    dismiss: (id: number) => useToastStore.getState().dismiss(id),
};
