'use client';
import React, { useEffect, useState } from 'react';
import { Compass, Search } from 'lucide-react';
import { Card, Shelf, Subject } from '@/types';
import { ApiService } from '@/services/api';
import { CloneSubjectModal } from '@/components/shared';

type CatalogItem = Subject & { cardsPreview: Partial<Card>[] };

export default function DiscoverPage() {
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedSubjectToClone, setSelectedSubjectToClone] =
        useState<CatalogItem | null>(null);
    const [clonedSuccessId, setClonedSuccessId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            ApiService.getDiscoverCatalog(),
            ApiService.getShelves(),
        ]).then(([catalogRes, shelvesRes]) => {
            if (catalogRes.isSuccess && catalogRes.data) {
                setCatalog(catalogRes.data);
            }
            if (shelvesRes.isSuccess && shelvesRes.data) {
                setShelves(shelvesRes.data.filter((s) => !s.isDeleted));
            }
            setIsLoading(false);
        });
    }, []);

    const allTags = Array.from(
        new Set(catalog.flatMap((item) => item.tags || []))
    );
    const filteredCatalog = catalog.filter((item) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            item.title.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (item.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTag = selectedTag
            ? (item.tags || []).includes(selectedTag)
            : true;
        return matchesSearch && matchesTag;
    });

    return (
        <div data-testid="discover-page" className="space-y-6">
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[var(--theme-accent)] text-xs font-extrabold uppercase">
                    <Compass className="w-3.5 h-3.5" />
                    Community Decks
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">
                    Discover High-Yield Flashcard Sets
                </h1>
                <p className="text-sm text-stone-300 mt-2">
                    Browse verified decks, preview cards, and clone into your
                    library.
                </p>
            </div>

            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    data-testid="input-discover-search"
                    type="text"
                    placeholder="Search verified decks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs"
                />
            </div>

            {allTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    <button
                        type="button"
                        data-testid="btn-tag-all"
                        onClick={() => setSelectedTag(null)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            selectedTag === null
                                ? 'bg-stone-900 text-white'
                                : 'bg-stone-100'
                        }`}
                    >
                        All Categories
                    </button>
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() =>
                                setSelectedTag(tag === selectedTag ? null : tag)
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                selectedTag === tag
                                    ? 'bg-[var(--theme-accent)] text-white'
                                    : 'bg-stone-100'
                            }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div
                    data-testid="discover-loading"
                    className="py-16 text-center text-xs text-stone-400"
                >
                    Loading catalog...
                </div>
            ) : filteredCatalog.length === 0 ? (
                <div
                    data-testid="discover-empty"
                    className="py-16 text-center text-xs text-stone-400"
                >
                    No decks found.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCatalog.map((item) => (
                        <div
                            key={item.id}
                            data-testid={`discover-card-${item.id}`}
                            className="bg-white dark:bg-stone-900 rounded-2xl border p-5 space-y-3"
                        >
                            <div
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold"
                                style={{
                                    backgroundColor:
                                        item.color || 'var(--theme-accent)',
                                }}
                            >
                                {item.title.slice(0, 1)}
                            </div>
                            <h2 className="font-bold">{item.title}</h2>
                            <p className="text-xs text-stone-500 line-clamp-2">
                                {item.description}
                            </p>
                            <button
                                type="button"
                                data-testid={`btn-clone-${item.id}`}
                                onClick={() => setSelectedSubjectToClone(item)}
                                className="w-full py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                            >
                                {clonedSuccessId === item.id
                                    ? 'Cloned!'
                                    : 'Clone to shelf'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CloneSubjectModal
                isOpen={!!selectedSubjectToClone}
                onClose={() => setSelectedSubjectToClone(null)}
                subject={selectedSubjectToClone}
                shelves={shelves}
                onCloneSuccess={(cloned) => {
                    setClonedSuccessId(cloned.id);
                    setSelectedSubjectToClone(null);
                    setTimeout(() => setClonedSuccessId(null), 3500);
                }}
            />
        </div>
    );
}
