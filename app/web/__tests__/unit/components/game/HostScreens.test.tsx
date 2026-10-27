import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    HostFinished,
    HostLobby,
    HostQuestion,
    HostReveal,
} from '@/components/game/HostScreens';
import { question, ranks, roomView } from '../../helpers/quizFixtures';

vi.mock('qrcode.react', () => ({
    QRCodeSVG: ({ value }: { value: string }) => (
        <svg data-testid="qr" data-value={value} />
    ),
}));

const handlers = () => ({
    onStart: vi.fn(),
    onNext: vi.fn(),
    onEnd: vi.fn(),
    onMode: vi.fn(),
});

describe('Host screens', () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    it('lobby shows the PIN, QR, player count and starts the game', () => {
        const h = handlers();
        const view = roomView({
            maxPlayers: 50,
            playerCount: 2,
            players: [
                { id: 'a', name: 'Ana', connected: true, answered: false },
                { id: 'b', name: 'Ben', connected: false, answered: false },
            ],
        });
        render(<HostLobby view={view} remainingMs={0} {...h} />);

        expect(screen.getByTestId('host-room-code')).toHaveTextContent(
            '123456'
        );
        expect(screen.getByTestId('qr').dataset.value).toMatch(
            /\/game\/123456$/
        );
        expect(screen.getByTestId('host-player-count')).toHaveTextContent(
            '2 / 50'
        );
        expect(screen.getByText('Ana')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('host-mode-auto'));
        expect(h.onMode).toHaveBeenCalledWith('AUTO');
        fireEvent.click(screen.getByTestId('host-start'));
        expect(h.onStart).toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('host-cancel'));
        expect(h.onEnd).toHaveBeenCalled();
        fireEvent.click(screen.getByText('Copy join link'));
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('lobby blocks start until someone joins', () => {
        render(<HostLobby view={roomView()} remainingMs={0} {...handlers()} />);
        expect(screen.getByTestId('host-start')).toBeDisabled();
        expect(screen.getByText(/Waiting for players/)).toBeInTheDocument();
    });

    it('question shows options, answer progress, and the host controls', () => {
        const h = handlers();
        const view = roomView({
            state: 'QUESTION',
            questionIndex: 0,
            question,
            playerCount: 4,
            answeredCount: 3,
        });
        render(<HostQuestion view={view} remainingMs={12_000} {...h} />);

        expect(screen.getByTestId('host-answered-count')).toHaveTextContent(
            '3 / 4'
        );
        expect(screen.getByTestId('game-countdown')).toHaveTextContent('12');
        expect(screen.getAllByTestId(/game-option-/)).toHaveLength(3);
        fireEvent.click(screen.getByTestId('host-next'));
        fireEvent.click(screen.getByTestId('host-end'));
        expect(h.onNext).toHaveBeenCalled();
        expect(h.onEnd).toHaveBeenCalled();
    });

    it('question handles typed answers', () => {
        const view = roomView({
            state: 'QUESTION',
            questionIndex: 0,
            question: { ...question, type: 'FILL_IN_THE_BLANK', options: [] },
        });
        render(<HostQuestion view={view} remainingMs={0} {...handlers()} />);
        expect(screen.getByText(/typing their answers/)).toBeInTheDocument();
    });

    it('reveal shows statistics, the leaderboard and the auto countdown', () => {
        const h = handlers();
        const view = roomView({
            state: 'REVEAL',
            mode: 'AUTO',
            questionIndex: 1,
            question,
            playerCount: 4,
            leaderboard: ranks,
            reveal: {
                correctIndexes: [1],
                correctText: 'b',
                explanation: 'because',
                distribution: [1, 3, 0],
                correctCount: 3,
                answeredCount: 4,
                averageSeconds: 4.2,
            },
        });
        render(<HostReveal view={view} remainingMs={5_000} {...h} />);

        expect(screen.getByTestId('host-stats')).toHaveTextContent('75%');
        expect(screen.getByTestId('host-stats')).toHaveTextContent('4.2s');
        expect(screen.getByTestId('host-auto-next')).toHaveTextContent(
            'Next in 5s'
        );
        expect(screen.getByText(/because/)).toBeInTheDocument();
        expect(screen.getByTestId('game-leaderboard').children).toHaveLength(3);
        expect(screen.getByText('Final results')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('host-next'));
        expect(h.onNext).toHaveBeenCalled();
    });

    it('reveal copes with typed answers and nobody answering', () => {
        const view = roomView({
            state: 'REVEAL',
            questionIndex: 0,
            totalQuestions: 3,
            question: { ...question, type: 'FILL_IN_THE_BLANK', options: [] },
            reveal: {
                correctIndexes: [],
                correctText: 'x / y',
                explanation: null,
                distribution: [],
                correctCount: 0,
                answeredCount: 0,
                averageSeconds: 0,
            },
        });
        render(<HostReveal view={view} remainingMs={0} {...handlers()} />);
        expect(screen.getByText(/Accepted: x \/ y/)).toBeInTheDocument();
        expect(screen.getByTestId('host-stats')).toHaveTextContent('0%');
        expect(screen.getByText('Next question')).toBeInTheDocument();
    });

    it('renders nothing for a question or reveal without data', () => {
        const { container } = render(
            <>
                <HostQuestion
                    view={roomView()}
                    remainingMs={0}
                    {...handlers()}
                />
                <HostReveal view={roomView()} remainingMs={0} {...handlers()} />
            </>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('finished shows the podium, standings and a per-question report', () => {
        const onExit = vi.fn();
        const view = roomView({
            state: 'FINISHED',
            leaderboard: ranks,
            summary: [
                { text: 'Q1', correct: 1, answered: 2 },
                { text: 'Q2', correct: 0, answered: 0 },
            ],
        });
        render(<HostFinished view={view} onExit={onExit} />);

        expect(screen.getByTestId('game-podium')).toBeInTheDocument();
        expect(screen.getByTestId('host-summary')).toHaveTextContent('50%');
        expect(screen.getByTestId('host-summary')).toHaveTextContent('0%');
        fireEvent.click(screen.getByTestId('host-exit'));
        expect(onExit).toHaveBeenCalled();
    });
});
