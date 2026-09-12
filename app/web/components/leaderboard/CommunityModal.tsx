'use client';
import React, { useState } from 'react';
import { Users, X, Lock, Globe } from 'lucide-react';

interface CommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        name: string;
        description: string;
        icon: string;
        color: string;
        isPrivate: boolean;
        tags: string[];
    }) => Promise<void>;
}

const COLOR_PRESETS = [
    '#8BC34A',
    '#03A9F4',
    '#FF9800',
    '#E91E63',
    '#9C27B0',
    '#009688',
    '#F44336',
    '#3F51B5',
];

export default function CommunityModal({
    isOpen,
    onClose,
    onSubmit,
}: CommunityModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLOR_PRESETS[0]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(['study-group']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddTag = () => {
        const cleaned = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (cleaned && !tags.includes(cleaned)) {
            setTags([...tags, cleaned]);
            setTagInput('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please provide a community name');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim(),
                icon: 'Users',
                color,
                isPrivate,
                tags,
            });
            onClose();
        } catch {
            setError('Failed to create community');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                data-testid="create-community-modal"
                className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200/80 dark:border-stone-800 space-y-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                            style={{ backgroundColor: color }}
                        >
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                                Create Learning Community
                            </h2>
                            <p className="text-xs text-stone-500">
                                Study together and climb leaderboards
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-community-modal-close"
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Community Name *
                        </label>
                        <input
                            data-testid="input-community-name"
                            type="text"
                            required
                            placeholder="e.g. Distributed Systems Guild"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Purpose & Focus
                        </label>
                        <textarea
                            data-testid="input-community-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What will this community study together?"
                            className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Color
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setColor(preset)}
                                    className={`w-7 h-7 rounded-full cursor-pointer ${
                                        color === preset
                                            ? 'ring-2 ring-offset-2 ring-stone-900'
                                            : ''
                                    }`}
                                    style={{ backgroundColor: preset }}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-community-privacy"
                        onClick={() => setIsPrivate((prev) => !prev)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer"
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300">
                            {isPrivate ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <Globe className="w-4 h-4" />
                            )}
                            {isPrivate ? 'Private (approval required)' : 'Public (open join)'}
                        </span>
                    </button>
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Tags
                        </label>
                        <div className="flex gap-2">
                            <input
                                data-testid="input-community-tag"
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[10px] font-bold"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <button
                        data-testid="btn-community-submit"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Community'}
                    </button>
                </form>
            </div>
        </div>
    );
}
