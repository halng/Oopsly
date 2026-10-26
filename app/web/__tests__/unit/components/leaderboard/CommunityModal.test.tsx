import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CommunityModal from '@/components/leaderboard/CommunityModal';

const setup = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
    const onClose = vi.fn();
    render(<CommunityModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    return { onClose, onSubmit };
};

const tagInput = () => screen.getByTestId('input-community-tag');
const submit = () =>
    userEvent.click(screen.getByTestId('btn-community-submit'));

describe('CommunityModal', () => {
    it('renders nothing when closed', () => {
        render(
            <CommunityModal
                isOpen={false}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        );
        expect(screen.queryByTestId('create-community-modal')).toBeNull();
    });

    it('shows the default public state and default tag', () => {
        setup();
        expect(screen.getByText('Public (open join)')).toBeInTheDocument();
        expect(screen.getByText('#study-group')).toBeInTheDocument();
    });

    it('toggles privacy', async () => {
        setup();
        await userEvent.click(screen.getByTestId('btn-community-privacy'));
        expect(
            screen.getByText('Private (approval required)')
        ).toBeInTheDocument();
        await userEvent.click(screen.getByTestId('btn-community-privacy'));
        expect(screen.getByText('Public (open join)')).toBeInTheDocument();
    });

    it('adds sanitised tags via Add and Enter, ignoring duplicates and blanks', async () => {
        setup();
        await userEvent.type(tagInput(), '  Web Dev!  ');
        await userEvent.click(screen.getByRole('button', { name: 'Add' }));
        expect(screen.getByText('#webdev')).toBeInTheDocument();
        expect(tagInput()).toHaveValue('');
        await userEvent.type(tagInput(), 'Cs-101{enter}');
        expect(screen.getByText('#cs-101')).toBeInTheDocument();
        await userEvent.type(tagInput(), 'study-group{enter}');
        expect(screen.getAllByText('#study-group')).toHaveLength(1);
        await userEvent.clear(tagInput());
        await userEvent.type(tagInput(), '!!!{enter}');
        expect(screen.getAllByText(/^#/)).toHaveLength(3);
    });

    it('requires a name', async () => {
        const { onSubmit } = setup();
        await userEvent.type(screen.getByTestId('input-community-name'), '   ');
        await submit();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows a validation error for a whitespace-only name', async () => {
        const { onSubmit } = setup();
        await userEvent.type(screen.getByTestId('input-community-name'), ' ');
        await submit();
        // native `required` accepts a space, so the component-level check runs
        expect(
            await screen.findByText('Please provide a community name')
        ).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits the full payload and closes', async () => {
        const { onSubmit, onClose } = setup();
        await userEvent.type(
            screen.getByTestId('input-community-name'),
            '  Guild  '
        );
        await userEvent.type(
            screen.getByTestId('input-community-description'),
            '  Study  '
        );
        const swatch = screen
            .getAllByRole('button')
            .find((b) =>
                b.getAttribute('style')?.includes('rgb(233, 30, 99)')
            )!;
        await userEvent.click(swatch);
        await userEvent.click(screen.getByTestId('btn-community-privacy'));
        await userEvent.type(tagInput(), 'math{enter}');
        await submit();
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith({
            name: 'Guild',
            description: 'Study',
            icon: 'Users',
            color: '#E91E63',
            isPrivate: true,
            tags: ['study-group', 'math'],
        });
    });

    it('shows an error and stays open when submission fails', async () => {
        const { onClose } = setup(vi.fn().mockRejectedValue(new Error('x')));
        await userEvent.type(screen.getByTestId('input-community-name'), 'G');
        await submit();
        expect(
            await screen.findByText('Failed to create community')
        ).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('btn-community-submit')).toBeEnabled();
    });

    it('shows Creating... while pending', async () => {
        let resolve!: () => void;
        setup(vi.fn(() => new Promise<void>((r) => (resolve = r))));
        await userEvent.type(screen.getByTestId('input-community-name'), 'G');
        await submit();
        expect(await screen.findByText('Creating...')).toBeInTheDocument();
        expect(screen.getByTestId('btn-community-submit')).toBeDisabled();
        resolve();
        await waitFor(() =>
            expect(screen.getByTestId('btn-community-submit')).toBeEnabled()
        );
    });

    it('closes via the X button and backdrop but not from inside', async () => {
        const { onClose } = setup();
        await userEvent.click(screen.getByTestId('create-community-modal'));
        expect(onClose).not.toHaveBeenCalled();
        await userEvent.click(screen.getByTestId('btn-community-modal-close'));
        await userEvent.click(
            screen.getByTestId('create-community-modal').parentElement!
        );
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
