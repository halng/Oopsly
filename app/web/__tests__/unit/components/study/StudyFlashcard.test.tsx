import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudyFlashcard from '@/components/study/StudyFlashcard';
import StudyMotion from '@/components/study/StudyMotion';
import StudyProgress from '@/components/study/StudyProgress';
import StudyShell from '@/components/study/StudyShell';
import StudyHeader from '@/components/study/StudyHeader';
import StudyResultCard from '@/components/study/StudyResultCard';

describe('study presentation components', () => {
    it('flips on click, enter, and space without bubbling space', () => {
        const onFlip = vi.fn();
        const onWindowKey = vi.fn();
        window.addEventListener('keydown', onWindowKey);
        render(
            <StudyFlashcard
                front="Q"
                back="A"
                flipped={false}
                onFlip={onFlip}
                toolbar={<button type="button">tts</button>}
                frontExtra={<span>hint</span>}
            />
        );
        expect(screen.getByText('Q')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-flip-hint')).toBeInTheDocument();
        expect(
            screen
                .getByTestId('flashcard-box')
                .querySelector('.study-flip-inner')
        ).not.toHaveClass('is-flipped');
        expect(screen.getByTestId('flashcard-answer')).toHaveTextContent('A');
        fireEvent.click(screen.getByTestId('flashcard-box'));
        fireEvent.keyDown(screen.getByTestId('flashcard-box'), {
            key: 'Enter',
        });
        fireEvent.keyDown(screen.getByTestId('flashcard-box'), { key: ' ' });
        expect(onFlip).toHaveBeenCalledTimes(3);
        expect(onWindowKey).not.toHaveBeenCalled();
        window.removeEventListener('keydown', onWindowKey);
    });

    it('applies the vertical flip class when the back is showing', () => {
        render(<StudyFlashcard front="Q" back="A" flipped onFlip={vi.fn()} />);
        expect(
            screen
                .getByTestId('flashcard-box')
                .querySelector('.study-flip-inner')
        ).toHaveClass('is-flipped');
    });

    it('applies motion classes, shell chrome, header extras, and result stats', () => {
        const onClose = vi.fn();
        render(
            <>
                <StudyMotion fx="shake" testId="motion-shake">
                    shaken
                </StudyMotion>
                <StudyMotion fx="enter">in</StudyMotion>
                <StudyMotion fx="fade">fade</StudyMotion>
                <StudyMotion fx="pop">pop</StudyMotion>
                <StudyMotion fx="glow">glow</StudyMotion>
                <StudyMotion fx="none">still</StudyMotion>
                <StudyProgress
                    testId="progress"
                    segments={[
                        { width: 40, testId: 'progress-main' },
                        { width: 20, className: 'bg-sky-500' },
                    ]}
                />
                <StudyShell testId="shell" className="p-2">
                    body
                </StudyShell>
                <StudyHeader
                    icon={<span>i</span>}
                    title="Review"
                    subtitle="cards"
                    seconds={12}
                    extra={<span>xp</span>}
                    onClose={onClose}
                    closeTestId="btn-close"
                />
                <StudyResultCard
                    testId="result"
                    title="Done"
                    description="Nice"
                    xpGained={15}
                    stats={[{ label: 'Cards', value: 3 }]}
                    actions={<button type="button">again</button>}
                />
            </>
        );
        expect(screen.getByTestId('motion-shake')).toHaveClass('study-shake');
        expect(screen.getByTestId('progress-main')).toHaveStyle({
            width: '40%',
        });
        expect(screen.getByTestId('shell')).toHaveClass('p-2');
        expect(screen.getByTestId('study-timer')).toHaveTextContent('00:12');
        fireEvent.click(screen.getByTestId('btn-close'));
        expect(onClose).toHaveBeenCalledOnce();
        expect(screen.getByTestId('study-result-xp')).toHaveTextContent(
            '+15 XP'
        );
        expect(screen.getByTestId('study-confetti')).toBeInTheDocument();
        expect(screen.getByText('Cards')).toBeInTheDocument();
        render(
            <>
                <StudyHeader
                    icon={<span>i</span>}
                    title="Quiet"
                    onClose={onClose}
                />
                <StudyResultCard title="Bare" />
            </>
        );
        expect(screen.getByText('Quiet')).toBeInTheDocument();
        expect(screen.getByText('Bare')).toBeInTheDocument();
    });
});
