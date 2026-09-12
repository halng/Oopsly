'use client';
import React, { useState } from 'react';
import { Gamepad2, X } from 'lucide-react';

interface JoinGameModalProps {
    onClose: () => void;
}

export default function JoinGameModal({ onClose }: JoinGameModalProps) {
    const [roomCode, setRoomCode] = useState('');

    return (
        <div
            id="join-game-modal"
            data-testid="join-game-modal"
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                            <Gamepad2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                                Join Multiplayer Game
                            </h2>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                Enter a room code from a host
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-join-game-close"
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form
                    className="pt-5 space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                    }}
                >
                    <input
                        data-testid="join-game-code-input"
                        type="text"
                        value={roomCode}
                        onChange={(e) =>
                            setRoomCode(e.target.value.toUpperCase())
                        }
                        placeholder="ROOM CODE"
                        maxLength={8}
                        className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-center font-black tracking-[0.3em] text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                    />
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                        Live multiplayer lobby migrates in a later phase. Your
                        code is ready when hosting is available.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-join-game-submit"
                            disabled={!roomCode.trim()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
                        >
                            Join Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
