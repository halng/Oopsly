import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlayerGamePage from '@/app/game/[code]/page';
import HostGamePage from '@/app/game/[code]/host/page';
import { useAuthStore } from '@/store';
import { question, ranks, roomView } from '../../helpers/quizFixtures';

const push = vi.fn();
const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace }),
    useParams: () => ({ code: '123456' }),
    useSearchParams: () => new URLSearchParams(search),
}));

const room = {
    view: null as ReturnType<typeof roomView> | null,
    status: 'open',
    playerId: 'p1',
    error: null as string | null,
    clockSkew: 0,
    hasAnswered: false,
    result: null as unknown,
    start: vi.fn(),
    next: vi.fn(),
    end: vi.fn(),
    setMode: vi.fn(),
    answer: vi.fn(),
};
const useQuizRoom = vi.fn((_: unknown) => room);
vi.mock('@/hooks/useQuizRoom', () => ({
    useQuizRoom: (o: unknown) => useQuizRoom(o),
    useRemaining: () => 7_000,
}));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg /> }));

describe('player game page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        search = 'name=Ana';
        Object.assign(room, {
            view: null,
            status: 'open',
            error: null,
            hasAnswered: false,
            result: null,
        });
    });

    it('asks for a nickname when none was given, then connects with it', () => {
        search = '';
        render(<PlayerGamePage />);
        expect(screen.getByTestId('player-name-form')).toBeInTheDocument();
        expect(useQuizRoom).toHaveBeenLastCalledWith(
            expect.objectContaining({ enabled: false })
        );

        fireEvent.change(screen.getByTestId('player-name-input'), {
            target: { value: 'Ben' },
        });
        fireEvent.click(screen.getByTestId('player-name-submit'));
        expect(useQuizRoom).toHaveBeenLastCalledWith(
            expect.objectContaining({
                name: 'Ben',
                role: 'player',
                enabled: true,
            })
        );
    });

    it('shows connecting, then falls back to the name form on a join error', () => {
        const { unmount } = render(<PlayerGamePage />);
        expect(screen.getByTestId('player-connecting')).toHaveTextContent(
            'Joining'
        );
        unmount();

        room.error = 'Room not found';
        render(<PlayerGamePage />);
        expect(screen.getByTestId('player-name-form')).toBeInTheDocument();
    });

    it.each([
        ['LOBBY', 'player-lobby', {}],
        ['QUESTION', 'player-question', { question, questionIndex: 0 }],
        ['REVEAL', 'player-reveal-pending', { question, questionIndex: 0 }],
        ['FINISHED', 'player-finished', { leaderboard: ranks }],
    ])('renders the %s screen', (state, testId, extra) => {
        room.view = roomView({ state: state as never, ...extra });
        render(<PlayerGamePage />);
        expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('warns when the connection drops and leaves to the landing page', () => {
        room.status = 'closed';
        room.view = roomView({ state: 'FINISHED', leaderboard: ranks });
        render(<PlayerGamePage />);
        expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('player-exit'));
        expect(push).toHaveBeenCalledWith('/');
    });

    it('shows reconnecting while the first connection is down', () => {
        room.status = 'closed';
        render(<PlayerGamePage />);
        expect(screen.getByTestId('player-connecting')).toHaveTextContent(
            'Reconnecting'
        );
    });
});

describe('host game page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(room, { view: null, status: 'open', error: null });
        useAuthStore.setState({
            isAuthenticated: true,
            hasHydrated: true,
        } as never);
    });

    it('connects as host only for signed-in users', () => {
        render(<HostGamePage />);
        expect(useQuizRoom).toHaveBeenCalledWith(
            expect.objectContaining({ role: 'host', enabled: true })
        );
        expect(screen.getByTestId('host-connecting')).toBeInTheDocument();
    });

    it('shows a room error', () => {
        room.error = 'Room not found';
        render(<HostGamePage />);
        expect(screen.getByTestId('host-error')).toHaveTextContent(
            'Room not found'
        );
    });

    it.each([
        ['LOBBY', 'host-lobby', {}],
        ['QUESTION', 'host-question', { question, questionIndex: 0 }],
        [
            'REVEAL',
            'host-reveal',
            {
                question,
                questionIndex: 0,
                reveal: {
                    correctIndexes: [1],
                    correctText: 'b',
                    explanation: null,
                    distribution: [0, 1, 0],
                    correctCount: 1,
                    answeredCount: 1,
                    averageSeconds: 1,
                },
            },
        ],
        ['FINISHED', 'host-finished', { leaderboard: ranks }],
    ])('renders the %s screen', (state, testId, extra) => {
        room.view = roomView({ state: state as never, ...extra });
        render(<HostGamePage />);
        expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('closing the lobby ends the room and leaves; stopping mid game stays', () => {
        room.view = roomView({ state: 'LOBBY' });
        const { unmount } = render(<HostGamePage />);
        fireEvent.click(screen.getByTestId('host-cancel'));
        expect(room.end).toHaveBeenCalled();
        expect(push).toHaveBeenCalledWith('/home');
        unmount();

        push.mockClear();
        room.view = roomView({ state: 'QUESTION', question, questionIndex: 0 });
        render(<HostGamePage />);
        fireEvent.click(screen.getByTestId('host-end'));
        expect(push).not.toHaveBeenCalled();
    });

    it('can start and shows the reconnect banner', () => {
        room.status = 'closed';
        room.view = roomView({ state: 'LOBBY', playerCount: 1 });
        render(<HostGamePage />);
        expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('host-start'));
        expect(room.start).toHaveBeenCalled();
    });
});
