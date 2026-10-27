import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JoinGameModal from '@/components/shared/JoinGameModal';
import { useUserProfileStore } from '@/store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('JoinGameModal', () => {
    beforeEach(() => {
        push.mockClear();
        useUserProfileStore.setState({ profile: null });
    });

    it('keeps only six digits and enables join once the PIN is complete', () => {
        render(<JoinGameModal onClose={vi.fn()} />);
        const input = screen.getByTestId('join-game-code-input');
        const submit = screen.getByTestId('btn-join-game-submit');

        fireEvent.change(input, { target: { value: '12ab34' } });
        expect(input).toHaveValue('1234');
        expect(submit).toBeDisabled();

        fireEvent.change(input, { target: { value: '1234567' } });
        expect(input).toHaveValue('123456');
        expect(submit).toBeEnabled();
    });

    it('opens the player screen with the chosen nickname', () => {
        const onClose = vi.fn();
        render(<JoinGameModal onClose={onClose} />);
        fireEvent.change(screen.getByTestId('join-game-code-input'), {
            target: { value: '123456' },
        });
        fireEvent.change(screen.getByTestId('join-game-name-input'), {
            target: { value: 'Ana B' },
        });
        fireEvent.click(screen.getByTestId('btn-join-game-submit'));

        expect(push).toHaveBeenCalledWith('/game/123456?name=Ana%20B');
        expect(onClose).toHaveBeenCalled();
    });

    it('falls back to the profile name, or none, and ignores incomplete PINs', () => {
        useUserProfileStore.setState({
            profile: { displayName: 'Hao' } as never,
        });
        const { unmount } = render(<JoinGameModal onClose={vi.fn()} />);
        fireEvent.submit(
            screen.getByTestId('join-game-modal').querySelector('form')!
        );
        expect(push).not.toHaveBeenCalled();

        fireEvent.change(screen.getByTestId('join-game-code-input'), {
            target: { value: '654321' },
        });
        fireEvent.click(screen.getByTestId('btn-join-game-submit'));
        expect(push).toHaveBeenCalledWith('/game/654321?name=Hao');
        unmount();

        useUserProfileStore.setState({ profile: null });
        render(<JoinGameModal onClose={vi.fn()} />);
        fireEvent.change(screen.getByTestId('join-game-code-input'), {
            target: { value: '111111' },
        });
        fireEvent.click(screen.getByTestId('btn-join-game-submit'));
        expect(push).toHaveBeenLastCalledWith('/game/111111');
    });

    it('closes from the header button', () => {
        const onClose = vi.fn();
        render(<JoinGameModal onClose={onClose} />);
        fireEvent.click(screen.getByTestId('btn-join-game-close'));
        expect(onClose).toHaveBeenCalled();
    });
});
