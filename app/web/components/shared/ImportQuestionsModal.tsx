'use client';
import React, { useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    ClipboardPaste,
    Download,
    FileSpreadsheet,
    UploadCloud,
    X,
} from 'lucide-react';
import { ApiService } from '@/services/api';
import { toast } from '@/store/ToastStore';
import { humanizeResponse } from '@/utils/apiError';
import { parseFileToTable } from '@/utils/fileImporter';
import {
    MAX_IMPORT_QUESTIONS,
    QuestionColumnMapping,
    downloadQuestionCsvTemplate,
    downloadQuestionExcelTemplate,
    extractQuestionsFromTable,
    guessQuestionMapping,
    looksLikeQuestionHeader,
    parsePastedRows,
} from '@/utils/questionImporter';
import { QUESTION_TYPE_LABELS } from '@/utils/questionForm';

interface ImportQuestionsModalProps {
    isOpen: boolean;
    shelfId: string;
    testSuiteId: string;
    testSuiteTitle: string;
    onClose: () => void;
    /** Called after any questions were created so the page can refresh. */
    onImported: (count: number) => void;
}

type Tab = 'upload' | 'paste';
type Filter = 'all' | 'valid' | 'invalid';

const PASTE_PLACEHOLDER = `Question\tType\tOption A\tOption B\tCorrect
Capital of France?\tsingle\tParis\tRome\tA
The sky is green\ttrue/false\t\t\tFalse`;

const selectClass =
    'w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs';

export default function ImportQuestionsModal({
    isOpen,
    shelfId,
    testSuiteId,
    testSuiteTitle,
    onClose,
    onImported,
}: Readonly<ImportQuestionsModalProps>) {
    const [tab, setTab] = useState<Tab>('upload');
    const [pasteText, setPasteText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [rawRows, setRawRows] = useState<string[][] | null>(null);
    const [sourceName, setSourceName] = useState('');
    const [hasHeader, setHasHeader] = useState(true);
    const [mapping, setMapping] = useState<QuestionColumnMapping | null>(null);
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [done, setDone] = useState<Set<number>>(new Set());
    const [filter, setFilter] = useState<Filter>('all');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const headers = useMemo(() => {
        if (!rawRows) return [];
        const width = Math.max(...rawRows.map((r) => r.length), 2);
        return Array.from({ length: width }, (_, i) =>
            hasHeader && rawRows[0][i] ? rawRows[0][i] : `Column ${i + 1}`
        );
    }, [rawRows, hasHeader]);

    const items = useMemo(() => {
        if (!rawRows || !mapping) return [];
        const data = hasHeader ? rawRows.slice(1) : rawRows;
        return extractQuestionsFromTable(data, mapping, hasHeader ? 2 : 1);
    }, [rawRows, mapping, hasHeader]);

    const isIncluded = (i: number) =>
        items[i]?.isValid && !skipped.has(i) && !done.has(i);
    const includedIndexes = items.map((_, i) => i).filter((i) => isIncluded(i));
    const validCount = items.filter((q) => q.isValid).length;
    const invalidCount = items.length - validCount;
    const overLimit = includedIndexes.length > MAX_IMPORT_QUESTIONS;

    const reset = () => {
        setRawRows(null);
        setMapping(null);
        setSkipped(new Set());
        setDone(new Set());
        setErrorMsg(null);
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const load = (rows: string[][], name: string) => {
        const header = looksLikeQuestionHeader(rows[0]);
        setRawRows(rows);
        setSourceName(name);
        setHasHeader(header);
        setMapping(
            guessQuestionMapping(
                header
                    ? rows[0]
                    : Array.from({ length: rows[0].length }, () => '')
            )
        );
        setSkipped(new Set());
        setDone(new Set());
        setFilter('all');
        setErrorMsg(null);
    };

    const handleFile = async (file: File) => {
        setErrorMsg(null);
        setIsLoadingFile(true);
        try {
            const table = await parseFileToTable(file);
            const rows = table.hasDetectedHeader
                ? [table.headers, ...table.rows]
                : table.rows;
            load(rows, file.name);
        } catch (err) {
            setErrorMsg(
                err instanceof Error
                    ? err.message
                    : 'Could not read that file. Please check its format.'
            );
        } finally {
            setIsLoadingFile(false);
        }
    };

    const handlePaste = () => {
        const rows = parsePastedRows(pasteText);
        if (rows.length === 0) {
            setErrorMsg('Paste at least one row of questions first.');
            return;
        }
        load(rows, 'Pasted text');
    };

    const toggleHeader = (checked: boolean) => {
        if (!rawRows) return;
        setHasHeader(checked);
        setMapping(
            guessQuestionMapping(
                checked
                    ? rawRows[0]
                    : Array.from({ length: rawRows[0].length }, () => '')
            )
        );
        setSkipped(new Set());
    };

    const updateMapping = (patch: Partial<QuestionColumnMapping>) =>
        setMapping((m) => (m ? { ...m, ...patch } : m));

    const toggleOptionCol = (col: number) =>
        setMapping((m) => {
            if (!m) return m;
            const has = m.optionCols.includes(col);
            return {
                ...m,
                optionCols: has
                    ? m.optionCols.filter((c) => c !== col)
                    : [...m.optionCols, col].sort((a, b) => a - b),
            };
        });

    const toggleRow = (i: number) =>
        setSkipped((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });

    const allValidSelected =
        validCount > 0 &&
        items.every((q, i) => !q.isValid || done.has(i) || !skipped.has(i));
    const toggleAll = () =>
        setSkipped(
            allValidSelected ? new Set(items.map((_, i) => i)) : new Set()
        );

    const runImport = async () => {
        const queue = includedIndexes.slice(0, MAX_IMPORT_QUESTIONS);
        const inputs = queue.flatMap((i) => items[i].input ?? []);
        if (inputs.length === 0) return;
        setErrorMsg(null);
        setIsImporting(true);

        const res = await ApiService.createQuestionsBulk(
            shelfId,
            testSuiteId,
            inputs,
            { silent: true }
        );
        setIsImporting(false);

        if (!res.isSuccess) {
            const reason = humanizeResponse(res);
            toast.error('No questions were added', reason);
            setErrorMsg(`No questions were added. ${reason}`);
            return;
        }
        setDone((prev) => new Set([...prev, ...queue]));
        onImported(inputs.length);
        toast.success(
            `${inputs.length} question${inputs.length === 1 ? '' : 's'} added`,
            testSuiteTitle
        );
        reset();
        onClose();
    };

    const displayed = items
        .map((q, i) => ({ q, i }))
        .filter(({ q, i }) => {
            if (done.has(i)) return false;
            if (filter === 'valid') return q.isValid;
            if (filter === 'invalid') return !q.isValid;
            return true;
        });

    const colLabel = (i: number) => `${i + 1}. ${headers[i]}`;
    const close = () => {
        if (isImporting) return;
        reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            data-testid="import-questions-modal"
            className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-stone-100 dark:border-stone-800 flex flex-col max-h-[92vh] overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold">
                                Bulk add questions
                            </h2>
                            <p className="text-xs text-stone-500">
                                Target test suite:{' '}
                                <span className="font-semibold text-stone-700 dark:text-stone-300">
                                    {testSuiteTitle}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        data-testid="btn-close-import-questions"
                        onClick={close}
                        className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
                    {errorMsg && (
                        <div
                            role="alert"
                            data-testid="import-questions-error"
                            className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-2.5 text-red-700 dark:text-red-300"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    {!rawRows || !mapping ? (
                        <div className="space-y-4">
                            <div
                                role="tablist"
                                className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold"
                            >
                                {(
                                    [
                                        ['upload', 'Upload file', UploadCloud],
                                        ['paste', 'Paste text', ClipboardPaste],
                                    ] as const
                                ).map(([id, label, Icon]) => (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === id}
                                        data-testid={`tab-import-${id}`}
                                        onClick={() => setTab(id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer ${
                                            tab === id
                                                ? 'bg-white dark:bg-stone-900 shadow-xs'
                                                : 'text-stone-500'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {tab === 'upload' ? (
                                <div
                                    data-testid="import-questions-dropzone"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) void handleFile(file);
                                    }}
                                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center ${
                                        isDragging
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                            : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        data-testid="import-questions-file"
                                        accept=".csv,.xlsx,.xls,.tsv,.txt"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) void handleFile(file);
                                        }}
                                    />
                                    <UploadCloud className="w-8 h-8 text-emerald-600 mb-2" />
                                    <p className="text-sm font-bold mb-1">
                                        Drag and drop your spreadsheet here
                                    </p>
                                    <p className="text-stone-500 mb-4">
                                        .CSV, .XLSX, .XLS or tab-delimited
                                        files.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isLoadingFile}
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold cursor-pointer disabled:opacity-50"
                                    >
                                        {isLoadingFile
                                            ? 'Reading file...'
                                            : 'Browse Files'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <textarea
                                        data-testid="import-questions-paste"
                                        rows={8}
                                        value={pasteText}
                                        placeholder={PASTE_PLACEHOLDER}
                                        onChange={(e) =>
                                            setPasteText(e.target.value)
                                        }
                                        className="w-full p-3 font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-stone-500">
                                            Paste rows copied from a
                                            spreadsheet, or CSV text.
                                        </p>
                                        <button
                                            type="button"
                                            data-testid="btn-parse-pasted"
                                            disabled={!pasteText.trim()}
                                            onClick={handlePaste}
                                            className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white font-bold cursor-pointer disabled:opacity-40"
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-2xl space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold flex items-center gap-1.5">
                                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                                        Starter template
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            data-testid="btn-question-template-csv"
                                            onClick={
                                                downloadQuestionCsvTemplate
                                            }
                                            className="px-3 py-1.5 rounded-lg border font-bold cursor-pointer"
                                        >
                                            CSV
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="btn-question-template-xlsx"
                                            onClick={() =>
                                                void downloadQuestionExcelTemplate()
                                            }
                                            className="px-3 py-1.5 rounded-lg border font-bold cursor-pointer"
                                        >
                                            Excel
                                        </button>
                                    </div>
                                </div>
                                <ul className="text-stone-500 list-disc pl-4 space-y-0.5">
                                    <li>
                                        Columns: Question, Type (optional),
                                        Option A–F, Correct, Explanation
                                        (optional).
                                    </li>
                                    <li>
                                        Correct is a letter (A), several (A,C),
                                        the option text, True/False, or accepted
                                        answers split with | for
                                        fill-in-the-blank.
                                    </li>
                                    <li>
                                        Type is guessed when blank: options →
                                        choice, True/False → true/false, a ___
                                        in the question → fill in the blank.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold">
                                    {sourceName} · {items.length} rows
                                </p>
                                <div className="flex items-center gap-3">
                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            data-testid="chk-first-row-header"
                                            checked={hasHeader}
                                            onChange={(e) =>
                                                toggleHeader(e.target.checked)
                                            }
                                        />
                                        First row is header
                                    </label>
                                    <button
                                        type="button"
                                        data-testid="btn-import-choose-another"
                                        disabled={isImporting}
                                        onClick={reset}
                                        className="font-bold underline cursor-pointer disabled:opacity-40"
                                    >
                                        Choose another
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700">
                                <label className="space-y-1 font-bold">
                                    Question
                                    <select
                                        data-testid="map-question"
                                        className={selectClass}
                                        value={mapping.questionCol}
                                        onChange={(e) =>
                                            updateMapping({
                                                questionCol: Number(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                    >
                                        {headers.map((_, i) => (
                                            <option key={i} value={i}>
                                                {colLabel(i)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 font-bold">
                                    Correct answer
                                    <select
                                        data-testid="map-correct"
                                        className={selectClass}
                                        value={mapping.correctCol ?? ''}
                                        onChange={(e) =>
                                            updateMapping({
                                                correctCol:
                                                    e.target.value === ''
                                                        ? null
                                                        : Number(
                                                              e.target.value
                                                          ),
                                            })
                                        }
                                    >
                                        <option value="">— none —</option>
                                        {headers.map((_, i) => (
                                            <option key={i} value={i}>
                                                {colLabel(i)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 font-bold">
                                    Type (optional)
                                    <select
                                        data-testid="map-type"
                                        className={selectClass}
                                        value={mapping.typeCol ?? ''}
                                        onChange={(e) =>
                                            updateMapping({
                                                typeCol:
                                                    e.target.value === ''
                                                        ? null
                                                        : Number(
                                                              e.target.value
                                                          ),
                                            })
                                        }
                                    >
                                        <option value="">— guess —</option>
                                        {headers.map((_, i) => (
                                            <option key={i} value={i}>
                                                {colLabel(i)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 font-bold">
                                    Explanation
                                    <select
                                        data-testid="map-explanation"
                                        className={selectClass}
                                        value={mapping.explanationCol ?? ''}
                                        onChange={(e) =>
                                            updateMapping({
                                                explanationCol:
                                                    e.target.value === ''
                                                        ? null
                                                        : Number(
                                                              e.target.value
                                                          ),
                                            })
                                        }
                                    >
                                        <option value="">— none —</option>
                                        {headers.map((_, i) => (
                                            <option key={i} value={i}>
                                                {colLabel(i)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <fieldset className="col-span-2 sm:col-span-4">
                                    <legend className="font-bold mb-1">
                                        Option columns
                                    </legend>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {headers.map((_, i) => (
                                            <label
                                                key={i}
                                                className="inline-flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    data-testid={`map-option-${i}`}
                                                    checked={mapping.optionCols.includes(
                                                        i
                                                    )}
                                                    onChange={() =>
                                                        toggleOptionCol(i)
                                                    }
                                                />
                                                {colLabel(i)}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
                                        <input
                                            type="checkbox"
                                            data-testid="chk-select-all-questions"
                                            checked={allValidSelected}
                                            onChange={toggleAll}
                                        />
                                        Select all valid
                                    </label>
                                    <span
                                        data-testid="import-questions-summary"
                                        className="text-stone-500"
                                    >
                                        {validCount} valid · {invalidCount} with
                                        issues
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {(['all', 'valid', 'invalid'] as const).map(
                                        (f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                data-testid={`filter-import-${f}`}
                                                onClick={() => setFilter(f)}
                                                className={`px-2.5 py-1 rounded-lg font-bold capitalize cursor-pointer ${
                                                    filter === f
                                                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                                                        : 'bg-stone-100 dark:bg-stone-800'
                                                }`}
                                            >
                                                {f === 'invalid' ? 'Issues' : f}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            <ul
                                data-testid="import-questions-preview"
                                className="space-y-1.5"
                            >
                                {displayed.map(({ q, i }) => (
                                    <li
                                        key={i}
                                        data-testid={`import-question-row-${i}`}
                                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                                            q.isValid
                                                ? 'border-stone-200 dark:border-stone-800'
                                                : 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            aria-label={`Include row ${q.rowNumber}`}
                                            disabled={!q.isValid}
                                            checked={isIncluded(i)}
                                            onChange={() => toggleRow(i)}
                                            className="mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold break-words">
                                                <span className="text-stone-400 mr-1.5">
                                                    #{q.rowNumber}
                                                </span>
                                                {q.text || '(blank)'}
                                            </p>
                                            {q.isValid && q.type ? (
                                                <p className="text-stone-500 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    {
                                                        QUESTION_TYPE_LABELS[
                                                            q.type
                                                        ]
                                                    }
                                                </p>
                                            ) : (
                                                <p className="text-red-600 dark:text-red-400 font-semibold">
                                                    {q.validationError}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                                {displayed.length === 0 && (
                                    <li className="text-center text-stone-500 py-6">
                                        Nothing to show here.
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {rawRows && mapping && (
                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                        <p className="text-stone-500">
                            {overLimit
                                ? `Only the first ${MAX_IMPORT_QUESTIONS} selected questions are imported at once.`
                                : `${includedIndexes.length} selected`}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                data-testid="btn-cancel-import-questions"
                                disabled={isImporting}
                                onClick={close}
                                className="px-4 py-2 rounded-xl border font-bold cursor-pointer disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                data-testid="btn-run-import-questions"
                                disabled={
                                    isImporting || includedIndexes.length === 0
                                }
                                onClick={() => void runImport()}
                                className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-white font-bold cursor-pointer disabled:opacity-40"
                            >
                                {isImporting
                                    ? 'Importing...'
                                    : `Import ${Math.min(includedIndexes.length, MAX_IMPORT_QUESTIONS)} questions`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
