import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SubjectModal from '@/components/shared/SubjectModal';

const titlePh = /Distributed Systems/;
const descPh = /Brief summary/;
const tagsPh = /algorithms, cs/;

const fill = async (name: string, desc: string, tags = '') => {
    await userEvent.type(screen.getByPlaceholderText(titlePh), name);
    if (desc) await userEvent.type(screen.getByPlaceholderText(descPh), desc);
    if (tags) await userEvent.type(screen.getByPlaceholderText(tagsPh), tags);
};

const submit = () => userEvent.click(screen.getByTestId('btn-save-subject'));

describe('SubjectModal', () => {
    it('renders create mode', () => {
        render(<SubjectModal onClose={vi.fn()} onSave={vi.fn()} />);
        expect(
            screen.getByRole('heading', { name: 'Create New Subject' })
        ).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('validates the description once a name is given', async () => {
        const onSave = vi.fn();
        render(<SubjectModal onClose={vi.fn()} onSave={onSave} />);
        await fill('Math', '');
        await submit();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('rejects a whitespace-only name', async () => {
        const onSave = vi.fn();
        render(<SubjectModal onClose={vi.fn()} onSave={onSave} />);
        await fill('   ', 'desc');
        await submit();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('rejects empty tag entries', async () => {
        const onSave = vi.fn();
        render(<SubjectModal onClose={vi.fn()} onSave={onSave} />);
        await fill('Math', 'desc', 'algebra,,geometry');
        await submit();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('saves normalised values, chosen colour and public flag, then closes', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        render(<SubjectModal onClose={onClose} onSave={onSave} />);
        await fill('  Math  ', '  Numbers  ', ' Algebra , GEOMETRY ');
        const swatches = screen
            .getAllByRole('button')
            .filter((b) => b.getAttribute('style')?.includes('background'));
        await userEvent.click(swatches[swatches.length - 1]);
        await userEvent.click(screen.getByRole('checkbox'));
        await submit();
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onSave).toHaveBeenCalledWith({
            name: 'Math',
            description: 'Numbers',
            color: '#607D8B',
            tags: 'algebra,geometry',
            isPublic: true,
        });
    });

    it('saves empty tags as an empty string with the default colour', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<SubjectModal onClose={vi.fn()} onSave={onSave} />);
        await fill('Math', 'Numbers');
        await submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                name: 'Math',
                description: 'Numbers',
                color: 'var(--theme-accent)',
                tags: '',
                isPublic: false,
            })
        );
    });

    it('loads edit values from the subject', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <SubjectModal
                subject={
                    {
                        id: 's1',
                        name: 'Chem',
                        description: 'Atoms',
                        color: '#03A9F4',
                        tags: 'a,b',
                        isPublic: true,
                    } as never
                }
                onClose={vi.fn()}
                onSave={onSave}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Edit Subject' })
        ).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeChecked();
        await submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                name: 'Chem',
                description: 'Atoms',
                color: '#03A9F4',
                tags: 'a,b',
                isPublic: true,
            })
        );
    });

    it('shows Saving... and disables the button while pending', async () => {
        let resolve!: () => void;
        const onSave = vi.fn(() => new Promise<void>((r) => (resolve = r)));
        render(<SubjectModal onClose={vi.fn()} onSave={onSave} />);
        await fill('Math', 'Numbers');
        await submit();
        expect(await screen.findByText('Saving...')).toBeInTheDocument();
        expect(screen.getByTestId('btn-save-subject')).toBeDisabled();
        resolve();
        await waitFor(() =>
            expect(screen.getByTestId('btn-save-subject')).toBeEnabled()
        );
    });

    it('closes from the X and Cancel buttons', async () => {
        const onClose = vi.fn();
        render(<SubjectModal onClose={onClose} onSave={vi.fn()} />);
        await userEvent.click(screen.getByTestId('btn-subject-modal-close'));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
