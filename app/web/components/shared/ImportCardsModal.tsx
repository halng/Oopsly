'use client';
import React, { useState, useRef, useMemo } from 'react';
import {
    X,
    UploadCloud,
    FileSpreadsheet,
    AlertCircle,
    Download,
    Check,
    RefreshCw,
} from 'lucide-react';
import { Subject, ImportCardItem } from '@/types';
import {
    parseFileToTable,
    extractCardsFromTable,
    ColumnMapping,
    ParsedTableData,
    downloadCsvTemplate,
    downloadExcelTemplate,
} from '@/utils/fileImporter';
import { ApiService } from '@/services/api';

interface ImportCardsModalProps {
  shelfId: string;
  subject: Subject;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
}

export default function ImportCardsModal({
  shelfId,
  subject,
  isOpen,
  onClose,
  onImportSuccess,
}: ImportCardsModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed File State
  const [tableData, setTableData] = useState<ParsedTableData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    frontCol: 0,
    backCol: 1,
    hintCol: null,
    tagsCol: null,
  });
  const [treatFirstRowAsHeader, setTreatFirstRowAsHeader] = useState(true);

  // Selected Cards to import (indices in extracted array)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Importing State
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process a selected file
  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoadingFile(true);

    try {
      const data = await parseFileToTable(file);
      setTableData(data);
      setTreatFirstRowAsHeader(data.hasDetectedHeader);
      setColumnMapping(data.suggestedMapping);

      // Extract initial cards
      const cards = extractCardsFromTable(data.rows, data.suggestedMapping);
      const validIndices = new Set<number>();
      cards.forEach((c, idx) => {
        if (c.isValid) validIndices.add(idx);
      });
      setSelectedIndices(validIndices);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to parse file. Please verify format.');
      setTableData(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // Re-compute extracted cards when tableData or columnMapping changes
  const extractedCards: ImportCardItem[] = useMemo(() => {
    if (!tableData) return [];
    const rows = tableData.rows;
    return extractCardsFromTable(rows, columnMapping);
  }, [tableData, columnMapping]);

  // Filtered list of extracted cards for display
  const displayedCards = useMemo(() => {
    return extractedCards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => {
        if (filterMode === 'valid' && !card.isValid) return false;
        if (filterMode === 'invalid' && card.isValid) return false;

        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          const matches =
            card.front.toLowerCase().includes(q) ||
            card.back.toLowerCase().includes(q) ||
            (card.hint && card.hint.toLowerCase().includes(q))
          if (!matches) return false;
        }

        return true;
      });
  }, [extractedCards, filterMode, searchFilter]);

  const validCount = useMemo(() => extractedCards.filter((c) => c.isValid).length, [extractedCards]);
  const invalidCount = useMemo(() => extractedCards.filter((c) => !c.isValid).length, [extractedCards]);

  const toggleSelectCard = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === validCount && validCount > 0) {
      setSelectedIndices(new Set());
    } else {
      const valid = new Set<number>();
      extractedCards.forEach((c, idx) => {
        if (c.isValid) valid.add(idx);
      });
      setSelectedIndices(valid);
    }
  };

  const handleExecuteImport = async () => {
    if (selectedIndices.size === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const cardsToImport = Array.from(selectedIndices)
      .map((idx) => extractedCards[idx])
      .filter((c) => c && c.isValid);

    try {
      const res = await ApiService.createCards(shelfId, subject.id, cardsToImport);
      if (res.isSuccess) {
        onImportSuccess(cardsToImport.length);
        onClose();
      } else {
        setErrorMsg(res.message || 'Import failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while importing cards.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setTableData(null);
    setErrorMsg(null);
    setSelectedIndices(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="import-cards-modal"
      data-testid="import-cards-modal"
      className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-stone-100 dark:border-stone-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  Import Flashcards
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  CSV / Excel
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Target subject:{' '}
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {subject.name}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Import Notice</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {!tableData ? (
            /* Upload Step */
            <div className="space-y-4">
              {/* Drag & Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 bg-stone-50/50 dark:bg-stone-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-3xl bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Drag and drop your spreadsheet here
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mb-4">
                  Supports <span className="font-semibold">.CSV, .XLSX, .XLS</span>, TSV, or tab-delimited files.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Browse Files
                </button>
              </div>

              {/* Template Download & Instructions */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Need a starter spreadsheet template?
                  </span>
                  <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                    Download a formatted template with example flashcard questions, answers, hints, and tags.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadCsvTemplate('full')}
                    className="px-3 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl font-bold text-stone-700 dark:text-stone-200 text-xs hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate('full')}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.XLSX)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Mapping & Preview Step */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {tableData.fileName}
                  </span>
                  <span className="text-stone-400 text-[11px]">
                    ({(tableData.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {extractedCards.length} rows parsed
                  </span>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Change file
                  </button>
                </div>
              </div>

              {/* Column Mapping Selectors */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                    Match Columns to Card Fields
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Select which spreadsheet columns represent each field
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Front Column */}
                  <div>
                    <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Front / Prompt <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping.frontCol}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, frontCol: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Back Column */}
                  <div>
                    <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Back / Answer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping.backCol}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, backCol: Number(e.target.value) })
                      }
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hint Column */}
                  <div>
                    <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Hint (Optional)
                    </label>
                    <select
                      value={columnMapping.hintCol === null ? -1 : columnMapping.hintCol}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setColumnMapping({ ...columnMapping, hintCol: val === -1 ? null : val });
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={-1}>-- None --</option>
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags Column */}
                  <div>
                    <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Tags (Optional)
                    </label>
                    <select
                      value={columnMapping.tagsCol === null ? -1 : columnMapping.tagsCol}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setColumnMapping({ ...columnMapping, tagsCol: val === -1 ? null : val });
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={-1}>-- None --</option>
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview Filter & Summary Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    Preview Cards ({displayedCards.length})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                    {validCount} ready
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
                      {invalidCount} invalid
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl bg-stone-100 dark:bg-stone-800 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterMode === 'all'
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      All ({extractedCards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('valid')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        filterMode === 'valid'
                          ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      Valid ({validCount})
                    </button>
                    {invalidCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterMode('invalid')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          filterMode === 'invalid'
                            ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                            : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Invalid ({invalidCount})
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 underline decoration-stone-300 cursor-pointer"
                  >
                    {selectedIndices.size === validCount && validCount > 0 ? 'Deselect All' : 'Select All Ready'}
                  </button>
                </div>
              </div>

              {/* Scrollable Preview Table */}
              <div className="border border-stone-200 dark:border-stone-750 rounded-2xl overflow-hidden max-h-64 overflow-y-auto text-xs bg-white dark:bg-stone-900">
                {displayedCards.length === 0 ? (
                  <div className="py-8 text-center text-stone-400">
                    No cards match current filter.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50 dark:bg-stone-800 text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 sticky top-0 border-b border-stone-200 dark:border-stone-700">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3 w-10 text-center">Import</th>
                        <th className="py-2 px-3 w-5/12">Prompt (Front)</th>
                        <th className="py-2 px-3 w-5/12">Answer (Back)</th>
                        <th className="py-2 px-3">Hint / Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {displayedCards.map(({ card, index }) => (
                        <tr
                          key={index}
                          className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                            !card.isValid
                              ? 'bg-amber-50/40 dark:bg-amber-950/20'
                              : selectedIndices.has(index)
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-stone-400 text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!card.isValid}
                              checked={selectedIndices.has(index)}
                              onChange={() => toggleSelectCard(index)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-stone-900 dark:text-stone-100">
                              {card.front || (
                                <span className="text-red-500 italic text-[11px]">
                                  [Empty Front]
                                </span>
                              )}
                            </div>
                            {card.validationError && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                ⚠ {card.validationError}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-stone-700 dark:text-stone-300">
                              {card.back || (
                                <span className="text-red-500 italic text-[11px]">
                                  [Empty Back]
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 space-y-1">
                            {card.hint && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 italic block">
                                Hint: {card.hint}
                              </span>
                            )}
                            {/* {card.tags && card.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {card.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[9px] px-1.5 py-0.2 rounded"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )} */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            Cancel
          </button>

          {tableData && (
            <button
              type="button"
              disabled={selectedIndices.size === 0 || isSubmitting}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Importing...'
                  : `Import ${selectedIndices.size} Flashcard${
                      selectedIndices.size === 1 ? '' : 's'
                    }`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
