import { create } from 'zustand';
import { Subject } from '@/types';

export const useSubjectStore = create<{
    subjects: { [shelfId: string]: Subject[]  };
    setSubjects: (shelfId: string, subjects: Subject[]) => void;
    clearSubjects: (shelfId: string) => void;
    getCurrentSubject: (shelfId: string, slug: string) => Subject | null;
}>((set, get) => ({
    subjects: {},
    setSubjects: (shelfId: string, subjects: Subject[]) => set((state) => ({ subjects: { ...state.subjects, [shelfId]: subjects } })),
    clearSubjects: (shelfId: string) => set((state) => ({ subjects: { ...state.subjects, [shelfId]: [] } })),
    getCurrentSubject: (shelfId: string, slug: string) => {
        const subjects = get().subjects[shelfId];
        return subjects ? subjects.find(subject => subject.slug === slug) || null : null;
    },
}));