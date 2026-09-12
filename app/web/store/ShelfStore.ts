import { create } from 'zustand';
import { Shelf } from '@/types';

export const useShelfStore = create<{
    shelves: Shelf[] | null;
    setShelves: (shelves: Shelf[]) => void;
    clearShelves: () => void;
    getCurrentShelf: (slug: string) => Shelf | null;
}>((set, get) => ({
    shelves: null,
    setShelves: (shelves: Shelf[]) => set({ shelves }),
    clearShelves: () => set({ shelves: null }),
    getCurrentShelf: (slug: string) => {
        const shelves = get().shelves;
        return shelves && shelves.length > 0 ? shelves.find(shelf => shelf.slug === slug) || null : null;
    },
}));