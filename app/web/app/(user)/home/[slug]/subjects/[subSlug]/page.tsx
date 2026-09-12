'use client';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeft,
    Plus,
    Play,
    Brain,
    Gamepad2,
    FileCheck2,
    Trash2,
    Edit2,
    Search,
    Sparkles,
    Layers,
    Check,
    FileSpreadsheet,
    Users,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { Subject, Card, TestSuite } from '@/types';
import { ApiService } from '@/services/api';
import { formatInterval } from '@/utils/fsrs';
import {
    ImportCardsModal,
    SubjectScheduleModal,
    JoinGameModal,
    CssProgressBar,
} from '@/components/shared';
import { useShelfStore, useSubjectStore } from '@/store';



export default function SubjectDetailsPage() {
        const params = useParams<{ slug: string; subSlug: string }>();
    const router = useRouter();
    const [cards, setCards] = useState<Card[]>([]);
    const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newFront, setNewFront] = useState('');
    const [newBack, setNewBack] = useState('');
    const [newHint, setNewHint] = useState('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiNotes, setAiNotes] = useState('');
    const [aiCardCount, setAiCardCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importNotification, setImportNotification] = useState<string | null>(
        null
    );
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isJoinGameOpen, setIsJoinGameOpen] = useState(false);

    const currentShelf = params.slug
        ? useShelfStore.getState().getCurrentShelf(params.slug)
        : undefined;
    const currentSubject = currentShelf && params.subSlug
        ? useSubjectStore.getState().getCurrentSubject(currentShelf.id, params.subSlug)
        : undefined;
    const subjectId = currentSubject?.id;


    const loadData = useCallback(async () => {
        if (!subjectId) return;
        setIsLoading(true);
        if (!currentShelf) {
            setIsLoading(false);
            return;
        }
        const [cardsRes] = await Promise.all([
            ApiService.getSubjectCards(currentShelf?.id, subjectId),
        ]);
        const fetchedCards = cardsRes.isSuccess ? cardsRes.data?.entities || [] : [];
        const nextCards = fetchedCards.filter((c) => !c.isDeleted);
        setCards(nextCards);
        setIsLoading(false);
    }, [currentShelf, subjectId]);

    useEffect(() => {
        const loadInitialData = () => {
            void loadData();
        };
        queueMicrotask(loadInitialData);
        const handleSyncComplete = () => {
            void loadData();
        };
        window.addEventListener('oopsly-sync-completed', handleSyncComplete);
        return () => {
            window.removeEventListener('oopsly-sync-completed', handleSyncComplete);
        };
    }, [subjectId, loadData]);

    if (!params.slug || !params.subSlug) {
        router.push('/home');
        return null;
    }
    

    const baseUrl = `/home/${currentShelf?.slug}/subjects/${currentSubject?.slug}`;

    const handleCreateCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFront.trim() || !newBack.trim()) return;
        if (!currentShelf || !currentSubject) return;
        const res = await ApiService.createCards(currentShelf?.id, currentSubject?.id, [{
            front: newFront,
            back: newBack,
            hint: newHint
        }]);
        if (res.isSuccess) {
            setNewFront('');
            setNewBack('');
            setNewHint('');
            setIsAddingCard(false);
            loadData();
        }
    };

    const handleUpdateCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCard?.front.trim() || !editingCard.back.trim()) return;
        const res = await ApiService.updateCard(editingCard.id, {
            front: editingCard.front,
            back: editingCard.back,
            hint: editingCard.hint,
            tags: editingCard.tags,
        });
        if (res.isSuccess) {
            setEditingCard(null);
            loadData();
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        const res = await ApiService.deleteCard(cardId);
        if (res.isSuccess) loadData();
    };

    const handleGenerateAI = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const res = await ApiService.generateCardsWithAI(
                aiTopic,
                aiNotes,
                aiCardCount
            );
            if (res.isSuccess && res.data &&  currentShelf && currentSubject) {
                for (const genCard of res.data) {
                    await ApiService.createCards(currentShelf?.id, currentSubject?.id, [{ 
                        front: genCard.front,
                        back: genCard.back,
                        hint: genCard.hint
                    }]);
                }
                setIsAiModalOpen(false);
                setAiNotes('');
                loadData();
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div
                data-testid="subject-details-loading"
                className="py-24 text-center text-sm text-stone-500"
            >
                Loading cards...
            </div>
        );
    }

    if (!currentSubject || !currentShelf) {
        return (
            <div
                data-testid="subject-details-empty"
                className="py-16 text-center space-y-3"
            >
                <p className="text-sm text-stone-500">Subject not found.</p>
                <button
                    type="button"
                    data-testid="btn-subject-back"
                    onClick={() => router.push(`/home/${currentShelf?.slug}`)}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                    Back to {currentShelf?.name}
                </button>
            </div>
        );
    }

    const filteredCards = cards.filter(
        (c) =>
            c.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const masteredCards = cards.filter(
        (c) => c.stability >= 0.8 && c.intervalDays > 21
    ).length;

    return (
        <div data-testid="subject-details-page" className="space-y-4">
            <button
                type="button"
                data-testid="btn-subject-back"
                onClick={() => router.push(`/home/${currentShelf?.slug}`)}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-bold cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to {currentShelf?.name}
            </button>

            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-8 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                            style={{
                                backgroundColor:
                                    currentSubject.color || 'var(--theme-accent)',
                            }}
                        >
                            <Layers className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                                    {currentSubject.name}
                                </h1>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600">
                                    {cards.length} Cards
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1">
                                {currentSubject.description || 'No description provided.'}
                            </p>
                            {cards.length > 0 && (
                                <div className="mt-2">
                                    <CssProgressBar
                                        mastered={masteredCards}
                                        total={cards.length}
                                        color={
                                            currentSubject.color ||
                                            'var(--theme-accent)'
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <button
                        type="button"
                        data-testid="btn-subject-review"
                        onClick={() => router.push(`${baseUrl}/review`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        Active Recall
                    </button>
                    <button
                        type="button"
                        data-testid="btn-subject-learn"
                        onClick={() => router.push(`${baseUrl}/learn`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                    >
                        <Brain className="w-4 h-4" />
                        Learn Quiz
                    </button>
                    <button
                        type="button"
                        data-testid="btn-subject-match"
                        onClick={() => router.push(`${baseUrl}/match`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold cursor-pointer"
                    >
                        <Gamepad2 className="w-4 h-4" />
                        Speed Match
                    </button>
                    <button
                        type="button"
                        data-testid="btn-subject-test"
                        onClick={() => router.push(`${baseUrl}/test`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold cursor-pointer"
                    >
                        <FileCheck2 className="w-4 h-4" />
                        Practice Test
                    </button>
                    <button
                        type="button"
                        data-testid="btn-subject-host"
                        onClick={() => setIsJoinGameOpen(true)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold cursor-pointer"
                    >
                        <Users className="w-4 h-4" />
                        Host Kahoot
                    </button>
                    <button
                        type="button"
                        data-testid="btn-subject-schedule"
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold cursor-pointer"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Schedule
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            data-testid="input-card-search"
                            type="text"
                            placeholder="Search cards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            data-testid="btn-import-cards"
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold cursor-pointer"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Import CSV / Excel
                        </button>
                        <button
                            type="button"
                            data-testid="btn-generate-ai"
                            onClick={() => setIsAiModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate with AI
                        </button>
                        <button
                            type="button"
                            data-testid="btn-add-card"
                            onClick={() => setIsAddingCard(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Card
                        </button>
                    </div>
                </div>

                {importNotification && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {importNotification}
                        </span>
                        <button
                            type="button"
                            onClick={() => setImportNotification(null)}
                            className="cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {isAddingCard && (
                    <form
                        onSubmit={handleCreateCard}
                        className="p-4 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">
                                Create New Flashcard
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsAddingCard(false)}
                                className="text-xs text-stone-400 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <textarea
                                data-testid="input-card-front"
                                rows={2}
                                required
                                placeholder="Prompt (Front)"
                                value={newFront}
                                onChange={(e) => setNewFront(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 rounded-xl text-xs"
                            />
                            <textarea
                                data-testid="input-card-back"
                                rows={2}
                                required
                                placeholder="Answer (Back)"
                                value={newBack}
                                onChange={(e) => setNewBack(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-200 rounded-xl text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                data-testid="input-card-hint"
                                type="text"
                                placeholder="Hint (optional)"
                                value={newHint}
                                onChange={(e) => setNewHint(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 rounded-xl text-xs"
                            />
                            {/* <input
                                data-testid="input-card-tags"
                                type="text"
                                placeholder="Tags (comma separated)"
                                value={newTags}
                                onChange={(e) => setNewTags(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-200 rounded-xl text-xs"
                            /> */}
                        </div>
                        <button
                            type="submit"
                            data-testid="btn-save-card"
                            className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                        >
                            Save Card
                        </button>
                    </form>
                )}

                <div className="space-y-2">
                    {filteredCards.length === 0 ? (
                        <p
                            data-testid="cards-empty"
                            className="py-10 text-center text-xs text-stone-400"
                        >
                            No cards yet. Add one to start studying.
                        </p>
                    ) : (
                        filteredCards.map((card) => (
                            <div
                                key={card.id}
                                data-testid={`card-row-${card.id}`}
                                className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800"
                            >
                                {editingCard?.id === card.id ? (
                                    <form
                                        onSubmit={handleUpdateCard}
                                        className="space-y-2"
                                    >
                                        <textarea
                                            value={editingCard.front}
                                            onChange={(e) =>
                                                setEditingCard({
                                                    ...editingCard,
                                                    front: e.target.value,
                                                })
                                            }
                                            className="w-full p-2 border rounded-xl text-xs"
                                        />
                                        <textarea
                                            value={editingCard.back}
                                            onChange={(e) =>
                                                setEditingCard({
                                                    ...editingCard,
                                                    back: e.target.value,
                                                })
                                            }
                                            className="w-full p-2 border rounded-xl text-xs"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditingCard(null)
                                                }
                                                className="px-3 py-1.5 text-xs cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                                {card.front}
                                            </p>
                                            <p className="text-xs text-stone-500 mt-1">
                                                {card.back}
                                            </p>
                                            <p className="text-[10px] text-stone-400 mt-1">
                                                Next:{' '}
                                                {formatInterval(
                                                    card.intervalDays
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                data-testid={`btn-edit-card-${card.id}`}
                                                onClick={() =>
                                                    setEditingCard(card)
                                                }
                                                className="p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                data-testid={`btn-delete-card-${card.id}`}
                                                onClick={() =>
                                                    handleDeleteCard(card.id)
                                                }
                                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {testSuites.length > 0 && (
                    <p className="text-xs text-stone-400">
                        {testSuites.length} saved test suite
                        {testSuites.length === 1 ? '' : 's'}
                    </p>
                )}
            </div>

            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 space-y-4">
                        <h2 className="text-lg font-bold">Generate with AI</h2>
                        <input
                            data-testid="input-ai-topic"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            className="w-full p-2 border rounded-xl text-xs"
                        />
                        <textarea
                            data-testid="input-ai-notes"
                            value={aiNotes}
                            onChange={(e) => setAiNotes(e.target.value)}
                            rows={3}
                            placeholder="Optional notes"
                            className="w-full p-2 border rounded-xl text-xs"
                        />
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={aiCardCount}
                            onChange={(e) =>
                                setAiCardCount(parseInt(e.target.value) || 5)
                            }
                            className="w-full p-2 border rounded-xl text-xs"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                className="px-3 py-2 text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                data-testid="btn-ai-generate"
                                onClick={handleGenerateAI}
                                disabled={isGenerating}
                                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <ImportCardsModal
                    shelfId={currentShelf.id}
                    subject={currentSubject}
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={(count) => {
                        setImportNotification(`Imported ${count} cards.`);
                        setIsImportModalOpen(false);
                        loadData();
                    }}
                />
            )}
            {isScheduleModalOpen && (
                <SubjectScheduleModal
                    subject={currentSubject}
                    onClose={() => setIsScheduleModalOpen(false)}
                    onUpdate={loadData}
                />
            )}
            {isJoinGameOpen && (
                <JoinGameModal onClose={() => setIsJoinGameOpen(false)} />
            )}
        </div>
    );
}

