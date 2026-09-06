import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    THEME_OPTIONS,
    applyTheme,
    getSavedTheme,
    saveTheme,
} from '@/utils/theme';

describe('theme utilities', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.body.className = '';
        localStorage.clear();
    });

    it('saves and reads valid themes, falling back for unknown values', () => {
        expect(getSavedTheme()).toBe('ghibli-meadow');
        saveTheme('obsidian');
        expect(getSavedTheme()).toBe('obsidian');
        localStorage.setItem('oopsly_theme', 'not-a-theme');
        expect(getSavedTheme()).toBe('ghibli-meadow');
    });

    it('applies a light theme to the document and dispatches an event', () => {
        const listener = vi.fn();
        window.addEventListener('oopsly-theme-applied', listener);
        applyTheme('ghibli-meadow');
        const option = THEME_OPTIONS.find(
            (theme) => theme.id === 'ghibli-meadow'
        )!;
        expect(document.documentElement.dataset.theme).toBe('ghibli-meadow');
        expect(document.body.dataset.theme).toBe('ghibli-meadow');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(
            document.documentElement.style.getPropertyValue('--theme-accent')
        ).toBe(option.accentColor);
        expect(localStorage.getItem('oopsly_theme')).toBe('ghibli-meadow');
        expect(listener).toHaveBeenCalledOnce();
        window.removeEventListener('oopsly-theme-applied', listener);
    });

    it('applies dark themes and falls back to the first option for an invalid runtime id', () => {
        applyTheme('obsidian');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(true);
        applyTheme('invalid-theme' as never);
        expect(document.documentElement.dataset.theme).toBe('invalid-theme');
        expect(
            document.documentElement.style.getPropertyValue('--theme-accent')
        ).toBe(THEME_OPTIONS[0].accentColor);
    });
});
