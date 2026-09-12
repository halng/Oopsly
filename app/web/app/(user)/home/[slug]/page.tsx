'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Book,
    Bookmark,
    BookOpen,
    Camera,
    Edit2,
    Film,
    Folder,
    Gift,
    Heart,
    Music,
    Play,
    Plus,
    Search,
    Star,
    Tag,
    Target,
} from 'lucide-react';
import { Shelf, Subject } from '@/types';
import { ApiService } from '@/services/api';
import {
    CloneSubjectModal,
    ImportCardsModal,
    ShelfModal,
    SubjectModal,
} from '@/components/shared';
import SubjectCard from '@/components/home/SubjectCard';
import { useShelfStore, useSubjectStore, useUserProfileStore } from '@/store';

const PRESET_ICONS = {
        'folder': <Folder className="w-5 h-5" />,
        'book': <Book className="w-5 h-5" />,
        'star': <Star className="w-5 h-5" />,
        'tag': <Tag className="w-5 h-5" />,
        'heart': <Heart className="w-5 h-5" />,
        'bookmark': <Bookmark className="w-5 h-5" />,
        'camera': <Camera className="w-5 h-5" />,
        'music': <Music className="w-5 h-5" />,
        'film': <Film className="w-5 h-5" />,
        'gift': <Gift className="w-5 h-5" />,
};  

export default function ShelfPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const slug = String(params.slug || '');
    const profile = useUserProfileStore((state) => state.profile);
    const setProfile = useUserProfileStore((state) => state.setProfile);
    const [shelf, setShelf] = useState<Shelf | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [reviewedToday, setReviewedToday] = useState(0);
    const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [activeMenuSubjectId, setActiveMenuSubjectId] = useState<string | null>(
        null
    );
    const [importingSubject, setImportingSubject] = useState<Subject | null>(
        null
    );
    
    const loadData = useCallback(async () => {

        setIsLoading(true);
        
        const filteredShelf = useShelfStore.getState().getCurrentShelf(slug);
        if (!filteredShelf) {
            router.push('/home'); // Redirect to home if shelf not found
            return;
        }

        setShelf(filteredShelf);
        try {
            const [ subjectsRes] =
                await Promise.all([
                    ApiService.getShelfSubjects(filteredShelf.id),
                    // ApiService.getStats(),
                ]);
            if (subjectsRes.isSuccess && subjectsRes.data) {
                setSubjects(subjectsRes.data.entities);
                useSubjectStore.getState().setSubjects(filteredShelf.id, subjectsRes.data.entities);
            } else {
                setSubjects([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [setProfile, slug]);

    useEffect(() => {
        loadData();
    }, [slug, loadData]);

    const handleSaveShelf = async (data: {
        name: string;
        description?: string;
        color?: string;
        icon?: string;
    }) => {
        if (!shelf) return;
        await ApiService.updateShelf(shelf.id, data);
        loadData();
    };

    const handleSaveSubject = async (data: {
        name: string;
        description: string;
        color: string;
        tags: string;
        isPublic: boolean;
    }) => {
        if (editingSubject) {
            await ApiService.updateSubject(editingSubject.id, data);
        } else {
            if (!shelf) return;
            await ApiService.createSubject(shelf.id, data);
        }
        loadData();
    };

    const filteredSubjects = useMemo(() => {
        return subjects.filter((s) => {
            const matchesSearch =
                !subjectSearchQuery.trim() ||
                s.name
                    .toLowerCase()
                    .includes(subjectSearchQuery.toLowerCase()) ||
                (s.description || '')
                    .toLowerCase()
                    .includes(subjectSearchQuery.toLowerCase());
            const matchesTag =
                !selectedTag || (s.tags && s.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        });
    }, [subjects, subjectSearchQuery, selectedTag]);    

    const tags = useMemo(() => {
        const next = new Set<string>();
        // subjects.forEach((s) => s.tags?.forEach((t) => next.add(t)));
        return Array.from(next);
    }, [subjects]);

    const stats = useMemo(() => {
        return {
            subjectCount: subjects.length,
            cardCount: subjects.reduce((acc, s) => acc + (s.cardCount || 0), 0),
            dueCount: subjects.reduce((acc, s) => acc + (s.dueCount || 0), 0),
        };
    }, [subjects]);

    const dailyGoal = profile?.settings?.dailyGoal || 20;
    const progress = Math.min((reviewedToday / dailyGoal) * 100, 100);

    if (isLoading) {
        return (
            <div
                data-testid="shelf-page-loading"
                className="py-24 text-center text-sm text-stone-500"
            >
                Loading shelf...
            </div>
        );
    }

    if (!shelf) {
        return (
            <div
                data-testid="shelf-page-empty"
                className="py-16 text-center space-y-3"
            >
                <p className="text-sm text-stone-500">Shelf not found.</p>
                <button
                    type="button"
                    data-testid="btn-back-to-shelves"
                    onClick={() => router.push('/home')}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                    All Shelves
                </button>
            </div>
        );
    }

    return (
        <div data-testid="shelf-page" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    id="back-to-shelves-btn"
                    data-testid="btn-back-to-shelves"
                    onClick={() => router.push('/home')}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-white text-xs font-bold cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>All Shelves</span>
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-testid="btn-edit-active-shelf"
                        onClick={() => setIsShelfModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Shelf</span>
                    </button>
                    <button
                        type="button"
                        data-testid="btn-create-subject-in-shelf"
                        onClick={() => {
                            setEditingSubject(null);
                            setIsSubjectModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Subject</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border relative overflow-hidden">
                <div
                    className="absolute top-0 left-0 w-2 h-full"
                    style={{
                        backgroundColor: shelf.color || 'var(--theme-accent)',
                    }}
                />
                <div className="flex items-start gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                        style={{
                            backgroundColor:
                                shelf.color || 'var(--theme-accent)',
                        }}
                    >
                            {Object.fromEntries(Object.entries(PRESET_ICONS).filter(([key]) => key === shelf.icon))[shelf.icon] ?? <Folder className="w-5 h-5" />}

                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{shelf.name}</h1>
                        <p className="text-sm text-stone-500 mt-1">
                            {shelf.description ||
                                'Collection of subjects, flashcard decks, and practice tests.'}
                        </p>
                    </div>
                </div>
            </div>

            {stats.dueCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-sm font-bold">
                        {stats.dueCount} Cards Due in {shelf.name}
                    </h3>
                    <button
                        type="button"
                        data-testid="btn-quick-shelf-review"
                        onClick={() => {
                            const firstDue = filteredSubjects.find(
                                (s) => s.dueCount > 0
                            );
                            if (firstDue) {
                                router.push(
                                    `/home/${firstDue.shelfId}/subjects/${firstDue.id}/review`
                                );
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        Start Review Session
                    </button>
                </div>
            )}

            <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    data-testid="search-subjects-input"
                    type="text"
                    placeholder={`Search ${stats.subjectCount} subjects in this shelf...`}
                    value={subjectSearchQuery}
                    onChange={(e) => setSubjectSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border rounded-xl text-xs"
                />
            </div>

            {tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-stone-400 uppercase flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Tags:
                    </span>
                    {tags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            data-testid={`btn-tag-${tag}`}
                            onClick={() =>
                                setSelectedTag(tag === selectedTag ? null : tag)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                selectedTag === tag
                                    ? 'bg-[var(--theme-accent)] text-white'
                                    : 'bg-stone-100'
                            }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {filteredSubjects.length === 0 ? (
                <div
                    data-testid="shelf-subjects-empty"
                    className="bg-white rounded-3xl border border-dashed p-12 text-center space-y-4"
                >
                    <BookOpen className="w-7 h-7 text-stone-400 mx-auto" />
                    <h3 className="text-base font-bold">
                        No subjects in this shelf yet
                    </h3>
                    <button
                        type="button"
                        data-testid="btn-create-first-subject"
                        onClick={() => {
                            setEditingSubject(null);
                            setIsSubjectModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Subject
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSubjects.map((subject) => (
                        <SubjectCard
                            key={subject.id}
                            subject={subject}
                            isMenuOpen={activeMenuSubjectId === subject.id}
                            onToggleMenu={() =>
                                setActiveMenuSubjectId(
                                    activeMenuSubjectId === subject.id
                                        ? null
                                        : subject.id
                                )
                            }
                            onViewDetails={() =>
                                router.push(
                                    `/home/${shelf.slug}/subjects/${subject.slug}`
                                )
                            }
                            onStartReview={() =>
                                router.push(
                                    `/home/${shelf.slug}/subjects/${subject.slug}/review`
                                )
                            }
                            onStartLearn={() =>
                                router.push(
                                    `/home/${shelf.slug}/subjects/${subject.slug}/learn`
                                )
                            }
                            onStartMatch={() =>
                                router.push(
                                    `/home/${shelf.slug}/subjects/${subject.slug}/match`
                                )
                            }
                            onStartTest={() =>
                                router.push(
                                    `/home/${shelf.slug}/subjects/${subject.slug}/test`
                                )
                            }
                            onImport={() => {
                                setActiveMenuSubjectId(null);
                                setImportingSubject(subject);
                            }}
                            onClone={() => {
                                setActiveMenuSubjectId(null);
                            }}
                            onEdit={() => {
                                setActiveMenuSubjectId(null);
                                setEditingSubject(subject);
                                setIsSubjectModalOpen(true);
                            }}
                            onDelete={async () => {
                                setActiveMenuSubjectId(null);
                                await ApiService.deleteSubject(subject.id);
                                loadData();
                            }}
                        />
                    ))}
                </div>
            )}

            {isShelfModalOpen && (
                <ShelfModal
                    shelf={shelf}
                    onClose={() => setIsShelfModalOpen(false)}
                    onSave={handleSaveShelf}
                />
            )}
            {isSubjectModalOpen && (
                <SubjectModal
                    subject={editingSubject}
                    onClose={() => {
                        setIsSubjectModalOpen(false);
                        setEditingSubject(null);
                    }}
                    onSave={handleSaveSubject}
                />
            )}
            {/* {importingSubject && (
                <ImportCardsModal
                    subject={importingSubject}
                    isOpen={!!importingSubject}
                    onClose={() => setImportingSubject(null)}
                    onImportSuccess={() => {
                        setImportingSubject(null);
                        loadData();
                    }}
                />
            )} */}
        
        </div>
    );
}
