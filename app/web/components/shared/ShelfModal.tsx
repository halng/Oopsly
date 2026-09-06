import React, { useState } from 'react';
import { X, Folder, Palette, Save } from 'lucide-react';
import { Shelf } from '@/types';

interface ShelfModalProps {
    shelf?: Shelf | null;
    onClose: () => void;
    onSave: (data: {
        name: string;
        description?: string;
        color?: string;
        icon?: string;
    }) => Promise<void>;
}

const PRESET_COLORS = [
    '#8BC34A', // Light Green
    '#4CAF50', // Green
    '#009688', // Teal
    '#03A9F4', // Light Blue
    '#3F51B5', // Indigo
    '#9C27B0', // Purple
    '#E91E63', // Pink
    '#FF9800', // Orange
    '#795548', // Brown
    '#607D8B', // Blue Grey
];

export default function ShelfModal({
    shelf,
    onClose,
    onSave,
}: ShelfModalProps) {
    const [name, setName] = useState(shelf?.name || '');
    const [description, setDescription] = useState(shelf?.description || '');
    const [color, setColor] = useState(shelf?.color || 'var(--theme-accent)');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim() || undefined,
                color,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            id="shelf-modal"
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-100 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: color }}
                        >
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">
                                {shelf ? 'Edit Shelf' : 'Create New Shelf'}
                            </h2>
                            <p className="text-xs text-stone-500">
                                Group related decks and subjects
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="py-5 space-y-4 text-xs"
                >
                    <div>
                        <label className="font-bold text-stone-700 block mb-1">
                            Shelf Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Computer Science, Medical School, Languages"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-stone-700 block mb-1">
                            Description
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Optional overview of subjects stored in this shelf..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-[var(--theme-accent)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-stone-700 block mb-2">
                            Shelf Color
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    type="button"
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                                        color === c
                                            ? 'ring-2 ring-stone-900 ring-offset-2 scale-110'
                                            : 'hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-stone-200 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="flex items-center gap-1.5 px-5 py-2 bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>
                                {isSubmitting ? 'Saving...' : 'Save Shelf'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
