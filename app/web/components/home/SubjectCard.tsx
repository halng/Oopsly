'use client';
import React from 'react';
import {
    Layers,
    Play,
    Brain,
    Gamepad2,
    FileCheck2,
    Clock,
    ChevronRight,
    MoreVertical,
    Edit2,
    CheckCircle2,
    FileSpreadsheet,
    Copy,
    Trash2,
} from 'lucide-react';
import { Subject } from '@/types';

interface SubjectCardProps {
    subject: Subject;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onViewDetails: () => void;
    onStartReview: () => void;
    onStartLearn: () => void;
    onStartMatch: () => void;
    onStartTest: () => void;
    onImport: () => void;
    onClone: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function SubjectCard({
    subject,
    isMenuOpen,
    onToggleMenu,
    onViewDetails,
    onStartReview,
    onStartLearn,
    onStartMatch,
    onStartTest,
    onImport,
    onClone,
    onEdit,
    onDelete,
}: SubjectCardProps) {
    const hasDue = subject.dueCount > 0;

    return (
        <div
            id={`subject-card-${subject.id}`}
            data-testid={`subject-card-${subject.id}`}
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
        >
            <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs font-bold text-sm shrink-0"
                            style={{
                                backgroundColor:
                                    subject.color || 'var(--theme-accent)',
                            }}
                        >
                            <Layers className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3
                                onClick={onViewDetails}
                                className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[var(--theme-secondary)] dark:group-hover:text-[var(--theme-accent)] transition-colors cursor-pointer line-clamp-1"
                            >
                                {subject.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                                    {subject.cardCount} cards
                                </span>
                                {hasDue ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        {subject.dueCount} due
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        All caught up
                                    </span>
                                )}
                                {subject.schedule?.enabled && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800"
                                        title={`Scheduled at ${subject.schedule.time}`}
                                    >
                                        <Clock className="w-2.5 h-2.5" />
                                        {subject.schedule.time}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            data-testid={`btn-subject-menu-${subject.id}`}
                            onClick={onToggleMenu}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {isMenuOpen && (
                            <div
                                data-testid={`subject-menu-${subject.id}`}
                                className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-100 dark:border-stone-700 py-1 text-xs font-semibold text-stone-700 dark:text-stone-200"
                            >
                                <button
                                    type="button"
                                    data-testid={`btn-import-${subject.id}`}
                                    onClick={onImport}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 text-left text-emerald-700 dark:text-emerald-400 cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Import CSV / Excel</span>
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-clone-${subject.id}`}
                                    onClick={onClone}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 text-left text-[var(--theme-secondary)] dark:text-[var(--theme-accent)] cursor-pointer"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Clone to Shelf</span>
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-edit-subject-${subject.id}`}
                                    onClick={onEdit}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-700 text-left cursor-pointer"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                                    <span>Edit Subject</span>
                                </button>
                                <button
                                    type="button"
                                    data-testid={`btn-delete-subject-${subject.id}`}
                                    onClick={onDelete}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 text-left cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Deck</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-3 leading-relaxed">
                    {subject.description || 'No description provided.'}
                </p>

                {subject.tags?.split(",").length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {subject.tags?.split(",").slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-[10px] font-medium"
                            >
                                #{tag}
                            </span>
                        ))}
                        {subject.tags?.split(",").length > 3 && (
                            <span className="text-[10px] text-stone-400 font-medium self-center">
                                +{subject.tags?.split(",").length - 3} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 pt-3 bg-stone-50/70 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <button
                    id={`review-btn-${subject.id}`}
                    data-testid={`btn-review-${subject.id}`}
                    onClick={onStartReview}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>
                        {hasDue
                            ? `Review Due (${subject.dueCount})`
                            : 'Practice All Cards'}
                    </span>
                </button>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                        id={`learn-mode-btn-${subject.id}`}
                        data-testid={`btn-learn-${subject.id}`}
                        onClick={onStartLearn}
                        title="Adaptive quiz mode"
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                        <Brain className="w-3.5 h-3.5 text-amber-500" />
                        <span>Learn</span>
                    </button>
                    <button
                        id={`match-game-btn-${subject.id}`}
                        data-testid={`btn-match-${subject.id}`}
                        onClick={onStartMatch}
                        title="Speed matching game"
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                        <Gamepad2 className="w-3.5 h-3.5 text-sky-500" />
                        <span>Match</span>
                    </button>
                    <button
                        id={`test-suite-btn-${subject.id}`}
                        data-testid={`btn-test-${subject.id}`}
                        onClick={onStartTest}
                        title="Diagnostic test assessment"
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Test</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onViewDetails}
                    className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 pt-1 cursor-pointer"
                >
                    <span>View Cards & Test Suites</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
