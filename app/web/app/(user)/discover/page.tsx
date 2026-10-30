'use client';
import React, { useEffect, useState } from 'react';
import { ClipboardList, Compass, Search } from 'lucide-react';
import { Card, Shelf, Subject, TestSuite } from '@/types';
import { ApiService } from '@/services/api';
import { useShelfStore } from '@/store';
import { CloneSubjectModal, CloneTestSuiteModal } from '@/components/shared';

type CatalogItem = Subject & { cardsPreview: Partial<Card>[] };
type Tab = 'decks' | 'tests';

export default function DiscoverPage() {
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedSubjectToClone, setSelectedSubjectToClone] =
        useState<CatalogItem | null>(null);
    const [tab, setTab] = useState<Tab>('decks');
    const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
    const [suiteToClone, setSuiteToClone] = useState<TestSuite | null>(null);

    useEffect(() => {
        Promise.all([
            ApiService.getDiscoverCatalog(),
            ApiService.getDiscoverTestSuites(),
            ApiService.getShelves(1, 100),
        ]).then(([catalogRes, suitesRes, shelvesRes]) => {
            if (catalogRes.isSuccess && catalogRes.data) {
                setCatalog(
                    catalogRes.data.entities as unknown as CatalogItem[]
                );
            }
            if (suitesRes.isSuccess && suitesRes.data) {
                setTestSuites(suitesRes.data.entities);
            }
            if (shelvesRes.isSuccess && shelvesRes.data) {
                const list = shelvesRes.data.entities;
                setShelves(list);
                // The deck clone modal reads the shelves from the shared store.
                useShelfStore.getState().setShelves(list);
            }
            setIsLoading(false);
        });
    }, []);

    // Subject.tags is a comma-separated string; tolerate arrays and missing values.
    const tagsOf = (tags: unknown): string[] => {
        const list = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
              ? tags.split(',')
              : [];
        return list.map((t) => String(t).trim()).filter(Boolean);
    };

    const allTags = Array.from(
        new Set(catalog.flatMap((item) => tagsOf(item.tags)))
    );
    const filteredCatalog = catalog.filter((item) => {
        const q = searchQuery.toLowerCase();
        const title = (
            item.name ||
            (item as { title?: string }).title ||
            ''
        ).toLowerCase();
        const matchesSearch =
            title.includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            tagsOf(item.tags).some((t) => t.toLowerCase().includes(q));
        const matchesTag = selectedTag
            ? tagsOf(item.tags).includes(selectedTag)
            : true;
        return matchesSearch && matchesTag;
    });

    const q = searchQuery.toLowerCase();
    const filteredSuites = testSuites.filter(
        (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q)
    );
    const isDecks = tab === 'decks';
    const visibleCount = isDecks
        ? filteredCatalog.length
        : filteredSuites.length;

    return (
        <div data-testid="discover-page" className="space-y-6">
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[var(--theme-accent)] text-xs font-extrabold uppercase">
                    <Compass className="w-3.5 h-3.5" />
                    Community Library
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">
                    Discover Decks and Test Suites
                </h1>
                <p className="text-sm text-stone-300 mt-2">
                    Browse what others have shared and clone a copy into your
                    own shelves.
                </p>
            </div>

            <div
                role="tablist"
                className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold"
            >
                {(
                    [
                        ['decks', 'Decks'],
                        ['tests', 'Test suites'],
                    ] as const
                ).map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        data-testid={`tab-discover-${id}`}
                        onClick={() => setTab(id)}
                        className={`px-4 py-1.5 rounded-lg cursor-pointer ${
                            tab === id
                                ? 'bg-white dark:bg-stone-900 shadow-2xs'
                                : 'text-stone-500'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="relative max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    data-testid="input-discover-search"
                    type="text"
                    placeholder={
                        isDecks ? 'Search decks...' : 'Search test suites...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs"
                />
            </div>

            {isDecks && allTags.length > 0 && (
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
            ) : visibleCount === 0 ? (
                <div
                    data-testid="discover-empty"
                    className="py-16 text-center text-xs text-stone-400"
                >
                    {isDecks ? 'No decks found.' : 'No test suites found.'}
                </div>
            ) : !isDecks ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuites.map((suite) => (
                        <div
                            key={suite.id}
                            data-testid={`discover-suite-${suite.id}`}
                            className="bg-white dark:bg-stone-900 rounded-2xl border p-5 space-y-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <h2 className="font-bold">{suite.title}</h2>
                            <p className="text-xs text-stone-500 line-clamp-2">
                                {suite.description}
                            </p>
                            <p className="text-[11px] font-semibold text-stone-400">
                                {suite.questionCount} questions
                                {suite.timeLimitMinutes
                                    ? ` · ${suite.timeLimitMinutes} min`
                                    : ''}
                            </p>
                            <button
                                type="button"
                                data-testid={`btn-clone-suite-${suite.id}`}
                                onClick={() => setSuiteToClone(suite)}
                                className="w-full py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                            >
                                Clone to shelf
                            </button>
                        </div>
                    ))}
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
                                {(item.name || '').slice(0, 1).toUpperCase()}
                            </div>
                            <h2 className="font-bold">{item.name}</h2>
                            <p className="text-xs text-stone-500 line-clamp-2">
                                {item.description}
                            </p>
                            <button
                                type="button"
                                data-testid={`btn-clone-${item.id}`}
                                onClick={() => setSelectedSubjectToClone(item)}
                                className="w-full py-2 rounded-xl bg-[var(--theme-accent)] text-white text-xs font-bold cursor-pointer"
                            >
                                Clone to shelf
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CloneTestSuiteModal
                testSuite={suiteToClone}
                shelves={shelves}
                onClose={() => setSuiteToClone(null)}
                onCloned={() => {
                    // A cloned suite is now yours, so it leaves the catalog.
                    setTestSuites((prev) =>
                        prev.filter((t) => t.id !== suiteToClone?.id)
                    );
                }}
            />

            <CloneSubjectModal
                isOpen={!!selectedSubjectToClone}
                onClose={() => setSelectedSubjectToClone(null)}
                subject={selectedSubjectToClone}
                shelves={shelves}
                onCloneSuccess={() => {
                    // A cloned deck is now yours, so it leaves the catalog.
                    setCatalog((prev) =>
                        prev.filter((d) => d.id !== selectedSubjectToClone?.id)
                    );
                    setSelectedSubjectToClone(null);
                }}
            />
        </div>
    );
}
