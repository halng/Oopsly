import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    PlayerFinished,
    PlayerNameForm,
    PlayerQuestion,
    PlayerReveal,
} from '@/components/game/PlayerScreens';
import { question, ranks, roomView } from '../../helpers/quizFixtures';

const open = (q = question) =>
    roomView({ state: 'QUESTION', questionIndex: 0, question: q });

describe('Player screens', () => {
    it('name form submits a trimmed nickname and shows errors', () => {
        const onSubmit = vi.fn();
        render(
            <PlayerNameForm
                code="123456"
                error="That name is already taken"
                onSubmit={onSubmit}
            />
        );

        expect(screen.getByRole('alert')).toHaveTextContent('already taken');
        expect(screen.getByTestId('player-name-submit')).toBeDisabled();
        fireEvent.change(screen.getByTestId('player-name-input'), {
            target: { value: '  Ana ' },
        });
        fireEvent.click(screen.getByTestId('player-name-submit'));
        expect(onSubmit).toHaveBeenCalledWith('Ana');
    });

    it('single choice answers on tap', () => {
        const onAnswer = vi.fn();
        render(
            <PlayerQuestion
                view={open()}
                remainingMs={9_000}
                hasAnswered={false}
                error={null}
                onAnswer={onAnswer}
            />
        );
        fireEvent.click(screen.getByTestId('game-option-1'));
        expect(onAnswer).toHaveBeenCalledWith({ index: 1 });
    });

    it('multiple choice toggles options and submits them together', () => {
        const onAnswer = vi.fn();
        render(
            <PlayerQuestion
                view={open({ ...question, type: 'MULTIPLE_CHOICE' })}
                remainingMs={9_000}
                hasAnswered={false}
                error="Try again"
                onAnswer={onAnswer}
            />
        );
        expect(screen.getByTestId('player-submit')).toBeDisabled();
        fireEvent.click(screen.getByTestId('game-option-0'));
        fireEvent.click(screen.getByTestId('game-option-2'));
        fireEvent.click(screen.getByTestId('game-option-0'));
        fireEvent.click(screen.getByTestId('player-submit'));
        expect(onAnswer).toHaveBeenCalledWith({ indexes: [2] });
        expect(screen.getByRole('alert')).toHaveTextContent('Try again');
    });

    it('fill in the blank submits typed text', () => {
        const onAnswer = vi.fn();
        render(
            <PlayerQuestion
                view={open({
                    ...question,
                    type: 'FILL_IN_THE_BLANK',
                    options: [],
                })}
                remainingMs={9_000}
                hasAnswered={false}
                error={null}
                onAnswer={onAnswer}
            />
        );
        fireEvent.change(screen.getByTestId('player-text-input'), {
            target: { value: 'Paris' },
        });
        fireEvent.submit(
            screen.getByTestId('player-text-input').closest('form')!
        );
        expect(onAnswer).toHaveBeenCalledWith({ text: 'Paris' });
    });

    it('locks the screen after answering and ignores empty questions', () => {
        const { container, rerender } = render(
            <PlayerQuestion
                view={open()}
                remainingMs={0}
                hasAnswered
                error={null}
                onAnswer={vi.fn()}
            />
        );
        expect(screen.getByTestId('player-waiting')).toBeInTheDocument();
        rerender(
            <PlayerQuestion
                view={roomView()}
                remainingMs={0}
                hasAnswered={false}
                error={null}
                onAnswer={vi.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('reveal reflects correct, wrong and missed answers', () => {
        const view = roomView({
            state: 'REVEAL',
            reveal: {
                correctIndexes: [1],
                correctText: 'b',
                explanation: null,
                distribution: [],
                correctCount: 1,
                answeredCount: 1,
                averageSeconds: 1,
            },
        });
        const base = {
            answered: true,
            correct: true,
            points: 800,
            score: 800,
            rank: 2,
            streak: 3,
        };
        const { rerender } = render(<PlayerReveal view={view} result={null} />);
        expect(screen.getByTestId('player-reveal-pending')).toBeInTheDocument();

        rerender(<PlayerReveal view={view} result={base} />);
        expect(screen.getByTestId('player-reveal-headline')).toHaveTextContent(
            'Correct!'
        );
        expect(screen.getByText('+800')).toBeInTheDocument();
        expect(screen.getByText(/3 in a row/)).toBeInTheDocument();

        rerender(
            <PlayerReveal
                view={view}
                result={{ ...base, correct: false, points: 0, streak: 0 }}
            />
        );
        expect(screen.getByTestId('player-reveal-headline')).toHaveTextContent(
            'Incorrect'
        );
        expect(screen.getByText('Answer: b')).toBeInTheDocument();

        rerender(
            <PlayerReveal
                view={view}
                result={{ ...base, answered: false, correct: false, points: 0 }}
            />
        );
        expect(screen.getByTestId('player-reveal-headline')).toHaveTextContent(
            "Time's up"
        );
    });

    it('finished highlights the player and can leave', () => {
        const onExit = vi.fn();
        const view = roomView({ state: 'FINISHED', leaderboard: ranks });
        const { rerender } = render(
            <PlayerFinished
                view={view}
                playerId="p2"
                result={{
                    answered: true,
                    correct: true,
                    points: 0,
                    score: 500,
                    rank: 2,
                    streak: 0,
                }}
                onExit={onExit}
            />
        );
        expect(screen.getByText('You finished #2')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('player-exit'));
        expect(onExit).toHaveBeenCalled();

        rerender(
            <PlayerFinished
                view={view}
                playerId={null}
                result={null}
                onExit={onExit}
            />
        );
        expect(screen.getByText('Game over')).toBeInTheDocument();
    });
});
