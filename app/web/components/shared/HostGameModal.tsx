'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, X } from 'lucide-react';
import { ApiService } from '@/services/api';
import { QuizMode, TestSuite } from '@/types';

interface HostGameModalProps {
    shelfId: string;
    onClose: () => void;
}

const SECONDS = [10, 20, 30, 60];

export default function HostGameModal({
    shelfId,
    onClose,
}: HostGameModalProps) {
    const router = useRouter();
    const [suites, setSuites] = useState<TestSuite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [suiteId, setSuiteId] = useState('');
    const [mode, setMode] = useState<QuizMode>('MANUAL');
    const [seconds, setSeconds] = useState(20);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void ApiService.getTestSuites(shelfId).then((res) => {
            if (cancelled) return;
            const hostable = (res.isSuccess ? (res.data ?? []) : []).filter(
                (s) => s.questionCount > 0
            );
            setSuites(hostable);
            setSuiteId(hostable[0]?.id ?? '');
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [shelfId]);

    const host = async () => {
        setIsCreating(true);
        setError(null);
        const res = await ApiService.createQuizRoom({
            shelfId,
            testSuiteId: suiteId,
            mode,
            questionSeconds: seconds,
        });
        if (res.isSuccess && res.data) {
            onClose();
            router.push(`/game/${res.data.code}/host`);
            return;
        }
        setError(res.message || 'Could not create the room');
        setIsCreating(false);
    };

    return (
        <div
            data-testid="host-game-modal"
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                                Host a Live Game
                            </h2>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                Pick a test and let others join with a PIN or QR
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-host-game-close"
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="pt-5 space-y-5">
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" />
                    ) : suites.length === 0 ? (
                        <p
                            data-testid="host-game-empty"
                            className="text-sm text-stone-500 text-center"
                        >
                            This deck has no tests with questions yet. Create a
                            test first, then host it.
                        </p>
                    ) : (
                        <>
                            <fieldset className="space-y-2">
                                <legend className="text-xs font-bold text-stone-500 mb-1">
                                    Test
                                </legend>
                                <div className="max-h-44 overflow-y-auto space-y-2">
                                    {suites.map((suite) => (
                                        <label
                                            key={suite.id}
                                            className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-bold cursor-pointer ${
                                                suiteId === suite.id
                                                    ? 'border-[var(--theme-accent)] bg-stone-50 dark:bg-stone-800'
                                                    : 'border-stone-200 dark:border-stone-700'
                                            }`}
                                        >
                                            <span className="truncate text-stone-900 dark:text-stone-100">
                                                {suite.title}
                                            </span>
                                            <span className="text-xs text-stone-500 shrink-0">
                                                {suite.questionCount} questions
                                            </span>
                                            <input
                                                type="radio"
                                                name="host-suite"
                                                data-testid={`host-suite-${suite.id}`}
                                                className="sr-only"
                                                checked={suiteId === suite.id}
                                                onChange={() =>
                                                    setSuiteId(suite.id)
                                                }
                                            />
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold text-stone-500 mb-1">
                                        Progression
                                    </p>
                                    <select
                                        data-testid="host-mode-select"
                                        value={mode}
                                        onChange={(e) =>
                                            setMode(e.target.value as QuizMode)
                                        }
                                        className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2.5 text-sm font-bold text-stone-900 dark:text-stone-100"
                                    >
                                        <option value="MANUAL">
                                            Manual next
                                        </option>
                                        <option value="AUTO">
                                            Auto advance
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-stone-500 mb-1">
                                        Time per question
                                    </p>
                                    <select
                                        data-testid="host-seconds-select"
                                        value={seconds}
                                        onChange={(e) =>
                                            setSeconds(Number(e.target.value))
                                        }
                                        className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2.5 text-sm font-bold text-stone-900 dark:text-stone-100"
                                    >
                                        {SECONDS.map((s) => (
                                            <option key={s} value={s}>
                                                {s} seconds
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <p
                            className="text-xs font-bold text-red-600"
                            role="alert"
                            data-testid="host-game-error"
                        >
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-bold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            data-testid="btn-host-game-submit"
                            disabled={!suiteId || isCreating}
                            onClick={host}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
                        >
                            {isCreating ? 'Creating…' : 'Host Game'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
