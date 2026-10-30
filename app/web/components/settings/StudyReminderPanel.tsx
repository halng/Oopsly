'use client';
import React, { useState } from 'react';
import { CalendarPlus, Clock, Download } from 'lucide-react';
import { ApiService } from '@/services/api';
import { toast } from '@/store/ToastStore';

const STORAGE_KEY = 'oopsly.studyReminder';

const DAYS = [
    { value: 0, label: 'S', name: 'Sunday' },
    { value: 1, label: 'M', name: 'Monday' },
    { value: 2, label: 'T', name: 'Tuesday' },
    { value: 3, label: 'W', name: 'Wednesday' },
    { value: 4, label: 'T', name: 'Thursday' },
    { value: 5, label: 'F', name: 'Friday' },
    { value: 6, label: 'S', name: 'Saturday' },
];

interface Choice {
    days: number[];
    time: string;
}

const DEFAULT_CHOICE: Choice = { days: [1, 2, 3, 4, 5], time: '18:00' };

// Only a per-browser convenience, so every storage access is guarded.
function loadChoice(): Choice {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.days) && typeof parsed.time === 'string') {
                return { days: parsed.days, time: parsed.time };
            }
        }
    } catch {
        // fall through to the default
    }
    return DEFAULT_CHOICE;
}

function saveChoice(choice: Choice) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
        // storage unavailable; the choice just won't be remembered
    }
}

/**
 * Lets the user pick study days and a time, then emails them a recurring
 * calendar event (.ics) they can add to Google Calendar.
 */
export default function StudyReminderPanel() {
    const [choice, setChoice] = useState<Choice>(loadChoice);
    const [isSending, setIsSending] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const update = (next: Choice) => {
        setChoice(next);
        saveChoice(next);
    };

    const toggleDay = (day: number) =>
        update({
            ...choice,
            days: choice.days.includes(day)
                ? choice.days.filter((d) => d !== day)
                : [...choice.days, day].sort(),
        });

    const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

    const download = async () => {
        setIsDownloading(true);
        const res = await ApiService.getStudyReminderCalendar(
            choice.days,
            choice.time,
            timezone()
        );
        setIsDownloading(false);
        if (!res.isSuccess || !res.data) return;
        const url = URL.createObjectURL(
            new Blob([res.data.ics], { type: 'text/calendar' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = res.data.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(
            'Calendar file downloaded',
            'Import it in Google Calendar via Settings > Import & export.'
        );
    };

    const send = async () => {
        setIsSending(true);
        const res = await ApiService.sendStudyReminder(
            choice.days,
            choice.time,
            timezone()
        );
        setIsSending(false);
        if (res.isSuccess) {
            toast.success(
                'Reminder sent',
                'Open the email and add the event to your Google Calendar.'
            );
        }
    };

    return (
        <div
            data-testid="study-reminder-panel"
            className="p-4 bg-stone-50 rounded-2xl border space-y-4"
        >
            <div>
                <p className="font-bold text-sm">Study schedule</p>
                <p className="text-xs text-stone-500 mt-0.5">
                    Choose when you want to study. We email you a calendar event
                    that repeats weekly, or you can download the file and import
                    it into Google Calendar yourself.
                </p>
            </div>
            <div className="flex justify-between gap-1">
                {DAYS.map((day) => (
                    <button
                        key={day.value}
                        type="button"
                        title={day.name}
                        aria-label={day.name}
                        aria-pressed={choice.days.includes(day.value)}
                        data-testid={`btn-reminder-day-${day.value}`}
                        onClick={() => toggleDay(day.value)}
                        className={`w-10 h-10 rounded-full text-xs font-bold cursor-pointer ${
                            choice.days.includes(day.value)
                                ? 'bg-[var(--theme-accent)] text-white'
                                : 'bg-white border text-stone-600'
                        }`}
                    >
                        {day.label}
                    </button>
                ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
                <Clock className="w-4 h-4" />
                Time
                <input
                    data-testid="input-reminder-time"
                    type="time"
                    value={choice.time}
                    onChange={(e) =>
                        update({ ...choice, time: e.target.value })
                    }
                    className="ml-auto p-2 bg-white border rounded-xl text-sm"
                />
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    data-testid="btn-send-reminder"
                    onClick={send}
                    disabled={
                        isSending || choice.days.length === 0 || !choice.time
                    }
                    title={
                        choice.days.length === 0
                            ? 'Pick at least one day'
                            : undefined
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CalendarPlus className="w-4 h-4" />
                    {isSending ? 'Sending...' : 'Email me the calendar event'}
                </button>
                <button
                    type="button"
                    data-testid="btn-download-reminder"
                    onClick={download}
                    disabled={
                        isDownloading ||
                        choice.days.length === 0 ||
                        !choice.time
                    }
                    title="Download the .ics file and import it into any calendar"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border text-stone-900 text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Preparing...' : 'Download .ics file'}
                </button>
            </div>
        </div>
    );
}
