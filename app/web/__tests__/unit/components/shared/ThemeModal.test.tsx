import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThemeModal from '@/components/shared/ThemeModal';
import { THEME_OPTIONS } from '@/utils/theme';

vi.mock('@/utils/theme', async () => {
    const actual =
        await vi.importActual<typeof import('@/utils/theme')>('@/utils/theme');
    return { ...actual, applyTheme: vi.fn() };
});

describe('ThemeModal', () => {
    it('does not render when closed', () => {
        const { container } = render(
            <ThemeModal
                isOpen={false}
                currentTheme="ghibli-meadow"
                onSelectTheme={vi.fn()}
                onClose={vi.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders all themes, snapshots the open state, and selects a theme', () => {
        const onSelectTheme = vi.fn();
        const onClose = vi.fn();
        const { container } = render(
            <ThemeModal
                isOpen
                currentTheme="ghibli-meadow"
                onSelectTheme={onSelectTheme}
                onClose={onClose}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Visual Themes' })
        ).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(
            THEME_OPTIONS.length + 2
        );
        expect(container).toMatchSnapshot();
        fireEvent.click(screen.getByTestId('theme-option-ghibli-night'));
        expect(onSelectTheme).toHaveBeenCalledWith('ghibli-night');
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('closes only when the overlay itself is clicked', () => {
        const onClose = vi.fn();
        render(
            <ThemeModal
                isOpen
                currentTheme="ghibli-meadow"
                onSelectTheme={vi.fn()}
                onClose={onClose}
            />
        );
        fireEvent.click(screen.getByTestId('theme-modal'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(document.getElementById('theme-modal-overlay')!);
        expect(onClose).toHaveBeenCalledOnce();
    });
});
