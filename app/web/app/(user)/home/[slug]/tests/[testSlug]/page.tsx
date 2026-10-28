'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ClipboardList,
    Edit2,
    Play,
    Plus,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { Question, QuestionInput } from '@/types';
import { ApiService } from '@/services/api';
import { useTestSuiteContext } from '@/hooks/useTestSuiteContext';
import QuestionEditor from '@/components/tests/QuestionEditor';
import { HostGameModal } from '@/components/shared';
import {
    QUESTION_TYPE_LABELS,
    describeAnswer,
    draftFromQuestion,
    emptyDraft,
} from '@/utils/questionForm';

const TYPE_BADGE_STYLES: Record<Question['type'], string> = {
    SINGLE_CHOICE:
        'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    MULTIPLE_CHOICE:
        'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    TRUE_FALSE:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    FILL_IN_THE_BLANK:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export default function TestSuiteDetailsPage() {
    const router = useRouter();
    const {
        shelf,
        testSuite,
        baseUrl,
        shelfUrl,
        isLoading,
        notFound,
        refresh,
    } = useTestSuiteContext();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isHosting, setIsHosting] = useState(false);

    const shelfId = shelf?.id;
    const suiteId = testSuite?.id;

    const loadQuestions = useCallback(async () => {
        if (!shelfId || !suiteId) return;
        const res = await ApiService.getQuestions(shelfId, suiteId);
        setQuestions(res.isSuccess && res.data ? res.data : []);
        setIsLoadingQuestions(false);
    }, [shelfId, suiteId]);

    useEffect(() => {
        queueMicrotask(() => void loadQuestions());
    }, [loadQuestions]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return questions;
        return questions.filter(
            (question) =>
                question.text.toLowerCase().includes(q) ||
                (question.options ?? []).some((o) =>
                    o.toLowerCase().includes(q)
                ) ||
                (question.acceptedAnswers ?? []).some((a) =>
                    a.toLowerCase().includes(q)
                )
        );
    }, [questions, search]);

    const afterChange = async () => {
        await loadQuestions();
        await refresh();
    };

    const handleCreate = async (input: QuestionInput) => {
        if (!shelfId || !suiteId) return;
        const res = await ApiService.createQuestion(shelfId, suiteId, input);
        if (!res.isSuccess)
            throw new Error(res.message || 'Could not add the question');
        setIsAdding(false);
        await afterChange();
    };

    const handleUpdate = async (id: string, input: QuestionInput) => {
        if (!shelfId || !suiteId) return;
        const res = await ApiService.updateQuestion(
            shelfId,
            suiteId,
            id,
            input
        );
        if (!res.isSuccess)
            throw new Error(res.message || 'Could not update the question');
        setEditingId(null);
        await afterChange();
    };

    const handleDelete = async (question: Question) => {
        if (!shelfId || !suiteId) return;
        if (!window.confirm('Delete this question?')) return;
        const res = await ApiService.deleteQuestion(
            shelfId,
            suiteId,
            question.id
        );
        if (res.isSuccess) await afterChange();
    };

    if (isLoading || (!notFound && isLoadingQuestions)) {
        return (
            <div
                data-testid="test-suite-loading"
                className="py-24 text-center text-sm text-stone-500"
            >
                Loading test suite...
            </div>
        );
    }

    if (notFound || !testSuite) {
        return (
            <div
                data-testid="test-suite-not-found"
                className="py-16 text-center space-y-3"
            >
                <p className="text-sm text-stone-500">Test suite not found.</p>
                <button
                    type="button"
                    data-testid="btn-test-suite-back"
                    onClick={() => router.push(shelf ? shelfUrl : '/home')}
                    className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                    Back to {shelf?.name ?? 'Library'}
                </button>
            </div>
        );
    }

    return (
        <div data-testid="test-suite-page" className="space-y-4">
            <button
                type="button"
                data-testid="btn-test-suite-back"
                onClick={() => router.push(shelfUrl)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-white dark:bg-stone-900 text-xs font-bold cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                {shelf?.name ?? 'Shelf'}
            </button>

            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold truncate">
                            {testSuite.title}
                        </h1>
                        {testSuite.description && (
                            <p className="text-sm text-stone-500 mt-1">
                                {testSuite.description}
                            </p>
                        )}
                        <p className="text-xs text-stone-500 mt-1">
                            {questions.length} questions
                            {testSuite.timeLimitMinutes
                                ? ` · ${testSuite.timeLimitMinutes} min limit`
                                : ' · no time limit'}
                            {testSuite.highestScore != null &&
                                ` · best ${testSuite.highestScore}%`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        data-testid="btn-take-test"
                        disabled={questions.length === 0}
                        onClick={() => router.push(`${baseUrl}/take`)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        Take Test
                    </button>
                    <button
                        type="button"
                        data-testid="btn-host-test"
                        disabled={questions.length === 0}
                        onClick={() => setIsHosting(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Users className="w-4 h-4" />
                        Quizzly
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        data-testid="search-questions-input"
                        type="text"
                        placeholder={`Search ${questions.length} questions...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border rounded-xl text-xs"
                    />
                </div>
                {!isAdding && (
                    <button
                        type="button"
                        data-testid="btn-add-question"
                        onClick={() => {
                            setEditingId(null);
                            setIsAdding(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Question
                    </button>
                )}
            </div>

            {isAdding && (
                <QuestionEditor
                    testId="new-question-editor"
                    initial={emptyDraft()}
                    submitLabel="Add question"
                    onSubmit={handleCreate}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            {questions.length === 0 && !isAdding ? (
                <div
                    data-testid="questions-empty"
                    className="bg-white dark:bg-stone-900 rounded-3xl border border-dashed p-12 text-center text-sm text-stone-500"
                >
                    No questions yet. Add the first one to make this test
                    playable.
                </div>
            ) : (
                <ol className="space-y-2" data-testid="question-list">
                    {filtered.map((question) =>
                        editingId === question.id ? (
                            <li key={question.id}>
                                <QuestionEditor
                                    testId={`edit-question-editor-${question.id}`}
                                    initial={draftFromQuestion(question)}
                                    onSubmit={(input) =>
                                        handleUpdate(question.id, input)
                                    }
                                    onCancel={() => setEditingId(null)}
                                />
                            </li>
                        ) : (
                            <li
                                key={question.id}
                                data-testid={`question-row-${question.id}`}
                                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 flex items-start justify-between gap-3"
                            >
                                <div className="min-w-0 space-y-1">
                                    <span
                                        data-testid="question-type-badge"
                                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${TYPE_BADGE_STYLES[question.type]}`}
                                    >
                                        {QUESTION_TYPE_LABELS[question.type]}
                                    </span>
                                    <p className="text-sm font-semibold whitespace-pre-wrap">
                                        {question.text}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        Answer:{' '}
                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                            {describeAnswer(question)}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        aria-label="Edit question"
                                        data-testid={`btn-edit-question-${question.id}`}
                                        onClick={() => {
                                            setIsAdding(false);
                                            setEditingId(question.id);
                                        }}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Delete question"
                                        data-testid={`btn-delete-question-${question.id}`}
                                        onClick={() => handleDelete(question)}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        )
                    )}
                    {filtered.length === 0 && questions.length > 0 && (
                        <li className="text-center text-xs text-stone-500 py-6">
                            No questions match &quot;{search}&quot;.
                        </li>
                    )}
                </ol>
            )}
            {isHosting && shelf && (
                <HostGameModal
                    shelfId={shelf.id}
                    testSuite={{
                        ...testSuite,
                        questionCount: questions.length,
                    }}
                    onClose={() => setIsHosting(false)}
                />
            )}
        </div>
    );
}
