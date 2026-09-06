import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ShelfModal from '@/components/shared/ShelfModal';

describe('ShelfModal', () => {
    it('renders create mode and matches its snapshot', () => {
        const { container } = render(
            <ShelfModal onClose={vi.fn()} onSave={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', { name: 'Create New Shelf' })
        ).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    it('prevents blank names and saves trimmed values with the selected color', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        render(<ShelfModal onClose={onClose} onSave={onSave} />);
        const name = screen.getByPlaceholderText(
            'e.g. Computer Science, Medical School, Languages'
        );
        fireEvent.change(name, { target: { value: '   ' } });
        expect(
            screen.getByRole('button', { name: 'Save Shelf' })
        ).toBeDisabled();
        fireEvent.change(name, { target: { value: '  Biology  ' } });
        fireEvent.change(
            screen.getByPlaceholderText(
                'Optional overview of subjects stored in this shelf...'
            ),
            { target: { value: '  Cells  ' } }
        );
        fireEvent.click(
            screen
                .getAllByRole('button')
                .find((button) =>
                    button.getAttribute('style')?.includes('rgb(76, 175, 80)')
                )!
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save Shelf' }));
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                name: 'Biology',
                description: 'Cells',
                color: '#4CAF50',
            })
        );
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('loads edit values and supports cancelling without saving', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();
        render(
            <ShelfModal
                shelf={
                    {
                        id: 's1',
                        name: 'Physics',
                        description: 'Motion',
                        color: '#123456',
                    } as never
                }
                onClose={onClose}
                onSave={onSave}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Edit Shelf' })
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('Physics')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledOnce();
        expect(onSave).not.toHaveBeenCalled();
    });
});
