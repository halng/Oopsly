'use client';
import React, { useState } from 'react';
import { Check, ClipboardList, X } from 'lucide-react';
import { Shelf, TestSuite } from '@/types';
import { ApiService } from '@/services/api';
import { toast } from '@/store/ToastStore';

interface CloneTestSuiteModalProps {
    testSuite: TestSuite | null;
    shelves: Shelf[];
    onClose: () => void;
    onCloned: (cloned: TestSuite) => void;
}

export default function CloneTestSuiteModal({
    testSuite,
    shelves,
    onClose,
    onCloned,
}: Readonly<CloneTestSuiteModalProps>) {
    const [shelfId, setShelfId] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!testSuite) return null;

    const handleClone = async () => {
        if (!shelfId) return;
        setIsCloning(true);
        setError(null);
        const res = await ApiService.cloneTestSuite(testSuite.id, shelfId);
        setIsCloning(false);
        if (res.isSuccess && res.data) {
            toast.success('Test suite cloned', res.data.title);
            onCloned(res.data);
            onClose();
        } else {
            setError(res.message || 'Could not clone the test suite.');
        }
    };

    return (
        <div
            data-testid="clone-test-suite-modal"
            className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 dark:border-stone-800 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-emerald-600 shrink-0">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold">
                                Clone test suite
                            </h2>
                            <p className="text-xs text-stone-500 truncate">
                                {testSuite.title} · {testSuite.questionCount}{' '}
                                questions
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        data-testid="btn-close-clone-test-suite"
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2 text-xs">
                    <p className="font-bold">Choose a shelf</p>
                    {shelves.length === 0 ? (
                        <p className="text-stone-500">
                            You have no shelves yet. Create one first.
                        </p>
                    ) : (
                        <div className="grid gap-2 max-h-56 overflow-y-auto">
                            {shelves.map((shelf) => (
                                <button
                                    key={shelf.id}
                                    type="button"
                                    data-testid={`clone-suite-shelf-${shelf.id}`}
                                    aria-pressed={shelfId === shelf.id}
                                    onClick={() => setShelfId(shelf.id)}
                                    className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                                        shelfId === shelf.id
                                            ? 'border-[var(--theme-accent)] ring-2 ring-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)]'
                                            : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                                    }`}
                                >
                                    <span className="font-semibold truncate">
                                        {shelf.name}
                                    </span>
                                    {shelfId === shelf.id && (
                                        <Check className="w-4 h-4 text-[var(--theme-accent)] shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p
                        role="alert"
                        data-testid="clone-test-suite-error"
                        className="text-xs font-semibold text-rose-600"
                    >
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
                        type="button"
                        data-testid="btn-confirm-clone-test-suite"
                        disabled={!shelfId || isCloning}
                        onClick={() => void handleClone()}
                        className="px-5 py-2 bg-[var(--theme-accent)] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40"
                    >
                        {isCloning ? 'Cloning...' : 'Clone'}
                    </button>
                </div>
            </div>
        </div>
    );
}
