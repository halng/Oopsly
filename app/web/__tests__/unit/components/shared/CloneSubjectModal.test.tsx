import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CloneSubjectModal from '@/components/shared/CloneSubjectModal';
import { ApiService } from '@/services/api';
import { useShelfStore } from '@/store';

vi.mock('@/services/api', () => ({
    ApiService: {
        cloneSubject: vi.fn(),
        updateSubject: vi.fn(),
        createShelf: vi.fn(),
    },
}));

const shelves = [
    { id: 'sh1', name: 'Science', color: '#111111' },
    { id: 'sh2', name: 'Languages', color: '' },
];

const makeSubject = (extra: Record<string, unknown> = {}) =>
    ({
        id: 'sub1',
        name: 'Biology',
        description: 'Cells and more',
        color: '#222222',
        cardCount: 12,
        ...extra,
    }) as never;

const setup = (props: Record<string, unknown> = {}) => {
    const onClose = vi.fn();
    const onCloneSuccess = vi.fn();
    const utils = render(
        <CloneSubjectModal
            isOpen
            onClose={onClose}
            subject={makeSubject()}
            shelves={shelves as never}
            onCloneSuccess={onCloneSuccess}
            {...props}
        />
    );
    return { onClose, onCloneSuccess, ...utils };
};

describe('CloneSubjectModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useShelfStore.setState({ shelves: shelves as never });
    });

    it('renders nothing when closed or without a subject', () => {
        const { rerender } = setup({ isOpen: false });
        expect(screen.queryByTestId('clone-subject-modal')).toBeNull();
        rerender(
            <CloneSubjectModal
                isOpen
                onClose={vi.fn()}
                subject={null}
                shelves={[]}
                onCloneSuccess={vi.fn()}
            />
        );
        expect(screen.queryByTestId('clone-subject-modal')).toBeNull();
    });

    it('shows the source deck summary and the shelf options', () => {
        setup();
        expect(screen.getByText('Source Deck')).toBeInTheDocument();
        expect(screen.getByText('Cells and more')).toBeInTheDocument();
        expect(screen.getByText('12 Cards')).toBeInTheDocument();
        expect(screen.getByTestId('clone-shelf-sh1')).toHaveTextContent(
            'Science'
        );
        expect(screen.getByTestId('clone-shelf-sh2')).toHaveTextContent(
            'Languages'
        );
        expect(screen.getByTestId('clone-title-input')).toHaveValue('Biology');
    });

    it('falls back to placeholder description and sample card count', () => {
        setup({
            subject: makeSubject({
                description: '',
                cardCount: 0,
                cardsPreview: [{ front: 'a' }, { front: 'b' }],
            }),
        });
        expect(
            screen.getByText('No description provided for this flashcard deck.')
        ).toBeInTheDocument();
        expect(screen.getByText('2 Cards')).toBeInTheDocument();
    });

    it('toggles the cards preview button when sample cards exist', async () => {
        setup({ subject: makeSubject({ cardsPreview: [{ front: 'a' }] }) });
        const toggle = screen.getByRole('button', {
            name: /Preview Cards in Deck/,
        });
        expect(toggle).toHaveTextContent('1 sample cards');
        await userEvent.click(toggle);
        await userEvent.click(toggle);
        expect(toggle).toBeInTheDocument();
    });

    it('disables confirm until a shelf is chosen and a title exists', async () => {
        setup();
        const confirm = screen.getByTestId('btn-confirm-clone');
        expect(confirm).toBeDisabled();
        await userEvent.click(screen.getByTestId('clone-shelf-sh1'));
        expect(confirm).toBeEnabled();
        await userEvent.clear(screen.getByTestId('clone-title-input'));
        expect(confirm).toBeDisabled();
    });

    it('clones into the selected shelf keeping the original name', async () => {
        const cloned = { id: 'new1', name: 'Biology', color: '#222222' };
        vi.mocked(ApiService.cloneSubject).mockResolvedValue({
            isSuccess: true,
            data: cloned,
        } as never);
        const { onClose, onCloneSuccess } = setup();
        await userEvent.click(screen.getByTestId('clone-shelf-sh2'));
        await userEvent.click(screen.getByTestId('btn-confirm-clone'));
        await waitFor(() =>
            expect(onCloneSuccess).toHaveBeenCalledWith(cloned, 'sh2')
        );
        expect(ApiService.cloneSubject).toHaveBeenCalledWith('sub1', 'sh2');
        expect(ApiService.updateSubject).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renames the clone when the title was customised', async () => {
        const cloned = { id: 'new1', name: 'Biology', color: '#000' };
        vi.mocked(ApiService.cloneSubject).mockResolvedValue({
            isSuccess: true,
            data: cloned,
        } as never);
        const { onCloneSuccess } = setup();
        await userEvent.click(screen.getByTestId('clone-shelf-sh1'));
        const title = screen.getByTestId('clone-title-input');
        await userEvent.clear(title);
        await userEvent.type(title, '  My Bio  ');
        await userEvent.click(screen.getByTestId('btn-confirm-clone'));
        await waitFor(() => expect(onCloneSuccess).toHaveBeenCalled());
        expect(ApiService.updateSubject).toHaveBeenCalledWith('new1', {
            name: 'My Bio',
            description: 'Cells and more',
            color: '#222222',
        });
        expect(onCloneSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'new1', name: 'My Bio' }),
            'sh1'
        );
    });

    it('shows the API error message when cloning fails', async () => {
        vi.mocked(ApiService.cloneSubject).mockResolvedValue({
            isSuccess: false,
            message: 'Already cloned',
        } as never);
        const { onClose, onCloneSuccess } = setup();
        await userEvent.click(screen.getByTestId('clone-shelf-sh1'));
        await userEvent.click(screen.getByTestId('btn-confirm-clone'));
        expect(await screen.findByText('Already cloned')).toBeInTheDocument();
        expect(onCloneSuccess).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('uses fallback messages for empty failure and thrown errors', async () => {
        vi.mocked(ApiService.cloneSubject)
            .mockResolvedValueOnce({ isSuccess: false } as never)
            .mockRejectedValueOnce(new Error('Network down'))
            .mockRejectedValueOnce('weird');
        setup();
        await userEvent.click(screen.getByTestId('clone-shelf-sh1'));
        const confirm = screen.getByTestId('btn-confirm-clone');
        await userEvent.click(confirm);
        expect(
            await screen.findByText('Failed to clone deck. Please try again.')
        ).toBeInTheDocument();
        await userEvent.click(confirm);
        expect(await screen.findByText('Network down')).toBeInTheDocument();
        await userEvent.click(confirm);
        expect(
            await screen.findByText(
                'Error occurred while cloning the subject deck.'
            )
        ).toBeInTheDocument();
    });

    it('creates a new shelf through onCreateNewShelf and selects it', async () => {
        const onCreateNewShelf = vi
            .fn()
            .mockResolvedValue({ id: 'shNew', name: 'Fresh' });
        setup({ onCreateNewShelf });
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        expect(screen.queryByTestId('btn-clone-new-shelf')).toBeNull();
        const input = screen.getByPlaceholderText(/Shelf name/);
        const save = screen.getByRole('button', { name: 'Save & Select' });
        expect(save).toBeDisabled();
        await userEvent.type(input, '  Fresh  ');
        await userEvent.click(save);
        await waitFor(() =>
            expect(screen.getByTestId('btn-clone-new-shelf')).toBeVisible()
        );
        expect(onCreateNewShelf).toHaveBeenCalledWith({
            name: 'Fresh',
            color: '#8BC34A',
            description: 'Created for cloned flashcard decks',
        });
        // back to list, and the new shelf id is selected so confirm is enabled
        expect(screen.getByTestId('btn-confirm-clone')).toBeEnabled();
    });

    it('keeps the form open when onCreateNewShelf returns null', async () => {
        const onCreateNewShelf = vi.fn().mockResolvedValue(null);
        setup({ onCreateNewShelf });
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        await userEvent.type(screen.getByPlaceholderText(/Shelf name/), 'X');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save & Select' })
        );
        await waitFor(() => expect(onCreateNewShelf).toHaveBeenCalled());
        expect(screen.getByPlaceholderText(/Shelf name/)).toHaveValue('X');
    });

    it('creates a shelf via the API when no callback is provided', async () => {
        vi.mocked(ApiService.createShelf).mockResolvedValue({
            isSuccess: true,
            data: { id: 'apiShelf' },
        } as never);
        setup();
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        await userEvent.type(screen.getByPlaceholderText(/Shelf name/), 'API');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save & Select' })
        );
        await waitFor(() =>
            expect(screen.getByTestId('btn-confirm-clone')).toBeEnabled()
        );
        expect(ApiService.createShelf).toHaveBeenCalledWith({
            name: 'API',
            color: '#8BC34A',
            description: 'Created for cloned flashcard decks',
            icon: 'folder',
        });
    });

    it('does not select a shelf when the API reports failure', async () => {
        vi.mocked(ApiService.createShelf).mockResolvedValue({
            isSuccess: false,
        } as never);
        setup();
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        await userEvent.type(screen.getByPlaceholderText(/Shelf name/), 'API');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save & Select' })
        );
        await waitFor(() => expect(ApiService.createShelf).toHaveBeenCalled());
        expect(screen.getByPlaceholderText(/Shelf name/)).toBeInTheDocument();
    });

    it('shows an error when shelf creation throws', async () => {
        vi.mocked(ApiService.createShelf)
            .mockRejectedValueOnce(new Error('No quota'))
            .mockRejectedValueOnce('bad');
        setup();
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        await userEvent.type(screen.getByPlaceholderText(/Shelf name/), 'A');
        const save = screen.getByRole('button', { name: 'Save & Select' });
        await userEvent.click(save);
        expect(await screen.findByText('No quota')).toBeInTheDocument();
        await userEvent.click(save);
        expect(
            await screen.findByText('Failed to create new shelf')
        ).toBeInTheDocument();
    });

    it('ignores a blank shelf name on submit', async () => {
        const onCreateNewShelf = vi.fn();
        setup({ onCreateNewShelf });
        await userEvent.click(screen.getByTestId('btn-clone-new-shelf'));
        const input = screen.getByPlaceholderText(/Shelf name/);
        await userEvent.type(input, '   {enter}');
        expect(onCreateNewShelf).not.toHaveBeenCalled();
    });

    it('closes from the X, Cancel and overlay but not from inside the dialog', async () => {
        const { onClose } = setup();
        await userEvent.click(screen.getByTestId('clone-subject-modal'));
        expect(onClose).not.toHaveBeenCalled();
        await userEvent.click(screen.getByTestId('btn-clone-modal-close'));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await userEvent.click(
            screen.getByTestId('clone-subject-modal-overlay')
        );
        expect(onClose).toHaveBeenCalledTimes(3);
    });
});
