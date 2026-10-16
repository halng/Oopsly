'use client';
import React, { useState } from 'react';
import { ClipboardList, Save, X } from 'lucide-react';
import { TestSuite, TestSuiteInput } from '@/types';

interface TestSuiteModalProps {
    testSuite?: TestSuite | null;
    onClose: () => void;
    onSave: (data: TestSuiteInput) => Promise<void>;
}

export const MAX_TIME_LIMIT_MINUTES = 600;

export default function TestSuiteModal({
    testSuite,
    onClose,
    onSave,
}: Readonly<TestSuiteModalProps>) {
    const [title, setTitle] = useState(testSuite?.title || '');
    const [description, setDescription] = useState(testSuite?.description || '');
    const [timeLimit, setTimeLimit] = useState(
        testSuite?.timeLimitMinutes ? String(testSuite.timeLimitMinutes) : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Please give the test suite a title');
            return;
        }
        let timeLimitMinutes: number | null = null;
        if (timeLimit.trim()) {
            const value = Number(timeLimit);
            if (!Number.isInteger(value) || value < 1 || value > MAX_TIME_LIMIT_MINUTES) {
                setError(`Time limit must be a whole number between 1 and ${MAX_TIME_LIMIT_MINUTES} minutes`);
                return;
            }
            timeLimitMinutes = value;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim() || undefined,
                timeLimitMinutes,
                isActive: testSuite?.isActive ?? true,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the test suite');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            data-testid="test-suite-modal"
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-100 dark:border-stone-800 flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-emerald-600">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">
                                {testSuite ? 'Edit Test Suite' : 'New Test Suite'}
                            </h2>
                            <p className="text-xs text-stone-500">
                                A set of questions you write yourself
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-test-suite-modal-close"
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="py-5 space-y-4 text-xs">
                    <div>
                        <label htmlFor="test-suite-title" className="font-bold block mb-1">
                            Title
                        </label>
                        <input
                            id="test-suite-title"
                            type="text"
                            data-testid="test-suite-title-input"
                            maxLength={255}
                            placeholder="e.g. Midterm practice, Chapter 3 quiz"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="test-suite-description" className="font-bold block mb-1">
                            Description
                        </label>
                        <textarea
                            id="test-suite-description"
                            data-testid="test-suite-description-input"
                            rows={2}
                            maxLength={2000}
                            placeholder="What does this test cover?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="test-suite-time-limit" className="font-bold block mb-1">
                            Time limit (minutes, optional)
                        </label>
                        <input
                            id="test-suite-time-limit"
                            type="number"
                            min={1}
                            max={MAX_TIME_LIMIT_MINUTES}
                            data-testid="test-suite-time-limit-input"
                            placeholder="No limit"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                        />
                    </div>

                    {error && (
                        <p data-testid="test-suite-modal-error" className="text-rose-600 font-semibold">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-save-test-suite"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-5 py-2 bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {isSubmitting ? 'Saving...' : 'Save Test Suite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
