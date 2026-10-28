'use client';
import React from 'react';
import {
    ClipboardList,
    Clock,
    Edit2,
    Play,
    Plus,
    Trash2,
    Trophy,
    Users,
} from 'lucide-react';
import { TestSuite } from '@/types';

interface TestSuiteListProps {
    testSuites: TestSuite[];
    onCreate: () => void;
    onOpen: (suite: TestSuite) => void;
    onTake: (suite: TestSuite) => void;
    onHost: (suite: TestSuite) => void;
    onEdit: (suite: TestSuite) => void;
    onDelete: (suite: TestSuite) => void;
}

export default function TestSuiteList({
    testSuites,
    onCreate,
    onOpen,
    onTake,
    onHost,
    onEdit,
    onDelete,
}: Readonly<TestSuiteListProps>) {
    return (
        <section data-testid="shelf-test-suites" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                    Test Suites
                </h2>
                <button
                    type="button"
                    data-testid="btn-create-test-suite"
                    onClick={onCreate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border bg-white dark:bg-stone-900 text-xs font-bold cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    New Test Suite
                </button>
            </div>

            {testSuites.length === 0 ? (
                <div
                    data-testid="shelf-test-suites-empty"
                    className="bg-white dark:bg-stone-900 rounded-3xl border border-dashed p-8 text-center text-sm text-stone-500"
                >
                    No test suites yet. Create one and add your own questions.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testSuites.map((suite) => (
                        <div
                            key={suite.id}
                            data-testid={`test-suite-card-${suite.id}`}
                            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    type="button"
                                    data-testid={`btn-open-test-suite-${suite.id}`}
                                    onClick={() => onOpen(suite)}
                                    className="text-left min-w-0 cursor-pointer"
                                >
                                    <h3 className="text-sm font-bold truncate hover:text-[var(--theme-secondary)]">
                                        {suite.title}
                                    </h3>
                                    {suite.description && (
                                        <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                                            {suite.description}
                                        </p>
                                    )}
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        aria-label="Edit test suite"
                                        data-testid={`btn-edit-test-suite-${suite.id}`}
                                        onClick={() => onEdit(suite)}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Delete test suite"
                                        data-testid={`btn-delete-test-suite-${suite.id}`}
                                        onClick={() => onDelete(suite)}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-stone-500">
                                <span>{suite.questionCount} questions</span>
                                {suite.timeLimitMinutes ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {suite.timeLimitMinutes} min
                                    </span>
                                ) : null}
                                {suite.highestScore != null && (
                                    <span
                                        data-testid={`test-suite-best-${suite.id}`}
                                        className="inline-flex items-center gap-1 text-amber-700"
                                    >
                                        <Trophy className="w-3 h-3" />
                                        Best {suite.highestScore}%
                                    </span>
                                )}
                            </div>
                            <div className="mt-auto flex gap-2">
                                <button
                                    type="button"
                                    data-testid={`btn-take-test-suite-${suite.id}`}
                                    disabled={suite.questionCount === 0}
                                    onClick={() => onTake(suite)}
                                    title={
                                        suite.questionCount === 0
                                            ? 'Add questions first'
                                            : undefined
                                    }
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Play className="w-3.5 h-3.5 fill-white" />
                                    Take test
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-host-test-suite-${suite.id}`}
                                    disabled={suite.questionCount === 0}
                                    onClick={() => onHost(suite)}
                                    title={
                                        suite.questionCount === 0
                                            ? 'Add questions first'
                                            : undefined
                                    }
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    Quizzly
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
