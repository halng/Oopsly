import { Shelf } from '@/types';
import { ArrowLeft, Edit2, Folder, Plus, Search, Tag } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function ShelfPage() {
    const params = useParams();
    const shelfId = params.id;
    const router = useRouter();

    const [activeShelf, setActiveShelf] = useState<Shelf | null>(null);

    const fetchShelfDetails = async () => {
        // todo: implement the API call to fetch shelf details by shelfId
    };

    useEffect(() => {
        // todo: fetch details for the shelf with the given shelfId
        fetchShelfDetails();
    }, [shelfId]);




    return (

    <div id="shelf-detail-view" className="space-y-6 animate-fade-in">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              id="back-to-shelves-btn"
              data-testid="btn-back-to-shelves"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer shadow-2xs group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>All Shelves</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                id="edit-shelf-btn"
                onClick={() => onOpenEditShelf(activeShelf)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Edit Shelf</span>
              </button>
              <button
                id="create-subject-in-shelf-btn"
                data-testid="btn-create-subject-in-shelf"
                onClick={() => onOpenNewSubject(activeShelf.id)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Subject</span>
              </button>
            </div>
          </div>

          {/* Shelf Banner Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-2 h-full"
              style={{ backgroundColor: activeShelf.color || 'var(--theme-accent)' }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs shrink-0 text-lg"
                  style={{ backgroundColor: activeShelf.color || 'var(--theme-accent)' }}
                >
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                      {activeShelf.name}
                    </h1>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold">
                      Shelf
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
                    {activeShelf.description || 'Collection of subjects, flashcard decks, and practice tests.'}
                  </p>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center gap-3 self-start md:self-center">
                <div className="px-3.5 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60 text-center min-w-[75px]">
                  <div className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    {stats.subjectCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Subjects
                  </div>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60 text-center min-w-[75px]">
                  <div className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    {stats.cardCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Cards
                  </div>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-center min-w-[75px]">
                  <div className="text-base font-extrabold text-amber-800 dark:text-amber-400">
                    {stats.dueCount}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">
                    Due FSRS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Due Cards Active Recall Alert Banner if cards need review in this shelf */}
          {activeShelfTotalDue > 0 && (
            <div
              id="due-cards-alert-banner"
              className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_40%,transparent)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs"
            >
              <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent)] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>{activeShelfTotalDue} Cards Due in {activeShelf.name}</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      FSRS Review
                    </span>
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Maintain your memory retention curve with active recall practice.
                  </p>
                </div>
              </div>

              <button
                id="quick-start-shelf-review-btn"
                data-testid="btn-quick-shelf-review"
                onClick={() => {
                  const firstDueSubject = filteredSubjectsInActiveShelf.find((s) => s.dueCount > 0);
                  if (firstDueSubject) onStartReview(firstDueSubject);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold shadow-sm shadow-stone-500/30 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Review Session</span>
              </button>
            </div>
          )}

          {/* Subjects Search & Tag Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-subjects-in-shelf-input"
                data-testid="search-subjects-input"
                type="text"
                placeholder={`Search ${stats.subjectCount} subjects in this shelf...`}
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent transition-all"
              />
              {subjectSearchQuery && (
                <button
                  onClick={() => setSubjectSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Tag Filters */}
          {activeShelfTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedTag === null
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300'
                  }`}
              >
                All
              </button>
              {activeShelfTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedTag === tag
                    ? 'bg-[var(--theme-accent)] text-white'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300'
                    }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Subjects Grid (1:n) */}
          {filteredSubjectsInActiveShelf.length === 0 ? (
            <div
              id="empty-shelf-subjects-state"
              className="bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                  No subjects in this shelf yet
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mt-1">
                  Create a subject deck to start adding flashcards, test suites, and adaptive quizzes.
                </p>
              </div>
              <button
                onClick={() => onOpenNewSubject(activeShelf.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Subject</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjectsInActiveShelf.map(renderSubjectCard)}
            </div>
          )}
        </div>
  );
}


export default ShelfPage;