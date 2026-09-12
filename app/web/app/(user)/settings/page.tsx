'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Bell,
    LogOut,
    Moon,
    Save,
    Sliders,
    User,
    Volume2,
} from 'lucide-react';
import { ApiService } from '@/services/api';
import { useLogout } from '@/hooks/useLogout';
import { useUserProfileStore } from '@/store';
import { ThemeModal } from '@/components/shared';
import { ThemeId } from '@/types';

export default function SettingsPage() {
    const router = useRouter();
    const logout = useLogout();
    const profile = useUserProfileStore((s) => s.profile);
    const setProfile = useUserProfileStore((s) => s.setProfile);
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [targetRetention, setTargetRetention] = useState(
        profile?.settings?.targetRetentionRate ||
            profile?.settings?.fsrsTargetRetention ||
            0.9
    );
    const [dailyGoal, setDailyGoal] = useState(
        profile?.settings?.dailyGoal || 20
    );
    const [soundEffects, setSoundEffects] = useState(
        profile?.settings?.soundEffectsEnabled ??
            profile?.settings?.soundEffects ??
            true
    );
    const [allowReminders, setAllowReminders] = useState(
        profile?.settings?.allowReminders ?? false
    );
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [theme, setTheme] = useState<ThemeId>(
        (profile?.settings?.theme as ThemeId) || 'ghibli-meadow'
    );

    useEffect(() => {
        if (profile) return;
        ApiService.getProfile().then((res) => {
            if (res.isSuccess && res.data) {
                setProfile(res.data);
                setDisplayName(res.data.displayName);
                setEmail(res.data.email);
                setBio(res.data.bio || '');
                setDailyGoal(res.data.settings?.dailyGoal || 20);
            }
        });
    }, [profile, setProfile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const updated = {
            ...profile,
            displayName,
            email,
            bio,
            settings: {
                ...profile?.settings,
                dailyGoal,
                targetRetentionRate: targetRetention,
                soundEffectsEnabled: soundEffects,
                allowReminders,
                theme,
            },
        };
        const res = await ApiService.updateProfile(updated);
        if (res.isSuccess && res.data) {
            setProfile(res.data);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 2000);
        }
        setIsSaving(false);
    };

    return (
        <div data-testid="settings-page" className="max-w-2xl mx-auto space-y-6">
            <button
                type="button"
                data-testid="btn-settings-back"
                onClick={() => router.push('/home')}
                className="flex items-center gap-2 text-sm font-bold text-stone-500 cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] flex items-center justify-center">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">
                            Profile & FSRS Preferences
                        </h1>
                        <p className="text-sm text-stone-500">
                            Configure learning algorithm & account settings
                        </p>
                    </div>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="font-bold text-sm block mb-1.5">
                                Display Name
                            </label>
                            <input
                                data-testid="input-display-name"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full p-3 bg-stone-50 border rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="font-bold text-sm block mb-1.5">
                                Email
                            </label>
                            <input
                                data-testid="input-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 bg-stone-50 border rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="font-bold text-sm block mb-1.5">
                            Bio
                        </label>
                        <input
                            data-testid="input-bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full p-3 bg-stone-50 border rounded-xl text-sm"
                        />
                    </div>
                    <div className="p-5 bg-stone-50 rounded-2xl border space-y-3">
                        <div className="flex justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                                <Sliders className="w-4 h-4" />
                                Target Retention
                            </span>
                            <span>{Math.round(targetRetention * 100)}%</span>
                        </div>
                        <input
                            data-testid="input-retention"
                            type="range"
                            min="0.75"
                            max="0.97"
                            step="0.01"
                            value={targetRetention}
                            onChange={(e) =>
                                setTargetRetention(parseFloat(e.target.value))
                            }
                            className="w-full"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border">
                        <span className="font-bold">Daily Card Review Goal</span>
                        <input
                            data-testid="input-daily-goal"
                            type="number"
                            min={5}
                            max={100}
                            value={dailyGoal}
                            onChange={(e) =>
                                setDailyGoal(parseInt(e.target.value) || 20)
                            }
                            className="w-20 p-2 border rounded-xl text-center font-bold"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border">
                        <span className="flex items-center gap-2 font-bold">
                            <Moon className="w-5 h-5" />
                            Visual Theme
                        </span>
                        <button
                            type="button"
                            data-testid="btn-open-theme"
                            onClick={() => setIsThemeOpen(true)}
                            className="px-4 py-2 rounded-xl bg-stone-200 text-sm font-bold cursor-pointer"
                        >
                            Change Theme
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border">
                        <span className="flex items-center gap-2 font-bold">
                            <Volume2 className="w-5 h-5" />
                            Audio Synthesis
                        </span>
                        <button
                            type="button"
                            data-testid="btn-toggle-sound"
                            onClick={() => setSoundEffects((v) => !v)}
                            className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${
                                soundEffects
                                    ? 'bg-[var(--theme-accent)] justify-end'
                                    : 'bg-stone-300 justify-start'
                            }`}
                        >
                            <div className="w-4 h-4 rounded-full bg-white" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border">
                        <span className="flex items-center gap-2 font-bold">
                            <Bell className="w-5 h-5" />
                            Daily Study Reminders
                        </span>
                        <button
                            type="button"
                            data-testid="btn-toggle-reminders"
                            onClick={() => setAllowReminders((v) => !v)}
                            className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${
                                allowReminders
                                    ? 'bg-[var(--theme-accent)] justify-end'
                                    : 'bg-stone-300 justify-start'
                            }`}
                        >
                            <div className="w-4 h-4 rounded-full bg-white" />
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
                        <button
                            type="button"
                            data-testid="btn-logout"
                            onClick={logout}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 text-rose-600 font-bold cursor-pointer"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-save-settings"
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-8 py-3 bg-[var(--theme-accent)] text-white font-bold rounded-xl cursor-pointer"
                        >
                            <Save className="w-5 h-5" />
                            {savedSuccess
                                ? 'Saved!'
                                : isSaving
                                  ? 'Saving...'
                                  : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
            <ThemeModal
                isOpen={isThemeOpen}
                currentTheme={theme}
                onSelectTheme={setTheme}
                onClose={() => setIsThemeOpen(false)}
            />
        </div>
    );
}
