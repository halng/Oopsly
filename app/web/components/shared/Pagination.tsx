'use client';
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
    /** Prefix of the data-testid values: `<id>`, `<id>-prev`, `<id>-next`, `<id>-status`. */
    testId?: string;
}

const BUTTON =
    'flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-bold text-stone-700 dark:text-stone-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/** Previous / next controls. Renders nothing when everything fits on one page. */
export default function Pagination({
    page,
    totalPages,
    onChange,
    testId = 'pagination',
}: Readonly<PaginationProps>) {
    if (totalPages <= 1) return null;
    return (
        <nav
            aria-label="Pagination"
            data-testid={testId}
            className="flex items-center justify-center gap-3 pt-2"
        >
            <button
                type="button"
                data-testid={`${testId}-prev`}
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                className={BUTTON}
            >
                <ChevronLeft className="w-4 h-4" />
                Previous
            </button>
            <span
                data-testid={`${testId}-status`}
                className="text-xs font-semibold text-stone-500 dark:text-stone-400"
            >
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                data-testid={`${testId}-next`}
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                className={BUTTON}
            >
                Next
                <ChevronRight className="w-4 h-4" />
            </button>
        </nav>
    );
}
