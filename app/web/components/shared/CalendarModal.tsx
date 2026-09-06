'use client';
import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';
import { Subject } from '@/types';
import { ApiService } from '@/services/api';

interface CalendarModalProps {
    onClose: () => void;
}

const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

const CalendarModal: React.FC<CalendarModalProps> = ({ onClose }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const res = await ApiService.getShelves();
            if (res.isSuccess && res.data) {
                // Fetch subjects for all shelves
                const allSubjects: Subject[] = [];
                for (const shelf of res.data) {
                    const subRes = await ApiService.getShelfSubjects(shelf.id);
                    if (subRes.isSuccess && subRes.data) {
                        allSubjects.push(...subRes.data);
                    }
                }
                setSubjects(allSubjects.filter((s) => s.schedule?.enabled));
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
                className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                                Study Calendar
                            </h2>
                            <p className="text-xs font-medium text-stone-500">
                                Your scheduled learning times
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-3xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4 text-stone-400">
                                <CalendarIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
                                No Scheduled Studies
                            </h3>
                            <p className="text-stone-500 text-sm max-w-xs mx-auto">
                                You haven&apos;t scheduled any subjects yet.
                                Open a subject and click &quot;Schedule&quot; to
                                set reminders.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                                const daySubjects = subjects.filter((s) =>
                                    s.schedule?.days.includes(dayIndex)
                                );

                                // Sort subjects by time
                                daySubjects.sort((a, b) => {
                                    const timeA = a.schedule?.time || '00:00';
                                    const timeB = b.schedule?.time || '00:00';
                                    return timeA.localeCompare(timeB);
                                });

                                if (daySubjects.length === 0) return null;

                                return (
                                    <div
                                        key={dayIndex}
                                        className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-700"
                                    >
                                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {dayName}
                                        </h3>
                                        <div className="space-y-2">
                                            {daySubjects.map((subject) => (
                                                <div
                                                    key={subject.id}
                                                    className="flex items-center justify-between bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-100 dark:border-stone-800 shadow-xs"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    subject.color ||
                                                                    'var(--theme-accent)',
                                                            }}
                                                        >
                                                            <Layers className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                                                                {subject.title}
                                                            </p>
                                                            <p className="text-[10px] text-stone-500 font-medium">
                                                                {
                                                                    subject.cardCount
                                                                }{' '}
                                                                cards •{' '}
                                                                {
                                                                    subject.dueCount
                                                                }{' '}
                                                                due
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold shrink-0">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {subject.schedule?.time}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarModal;
