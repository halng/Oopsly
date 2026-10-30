import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SubjectCard from '@/components/home/SubjectCard';
import { Subject } from '@/types';

const renderCard = (overrides: Partial<Subject>) => {
    const onStartReview = vi.fn();
    const onStartLearn = vi.fn();
    const onStartMatch = vi.fn();
    render(
        <SubjectCard
            subject={
                {
                    id: 's1',
                    name: 'Biology',
                    cardCount: 0,
                    dueCount: 0,
                    tags: '',
                    ...overrides,
                } as Subject
            }
            isMenuOpen={false}
            onToggleMenu={vi.fn()}
            onViewDetails={vi.fn()}
            onStartReview={onStartReview}
            onStartLearn={onStartLearn}
            onStartMatch={onStartMatch}
            onImport={vi.fn()}
            onClone={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
        />
    );
    return { onStartReview, onStartLearn, onStartMatch };
};

describe('SubjectCard practice buttons', () => {
    it('disables practice, learn and match when there are no cards', () => {
        const { onStartReview } = renderCard({ cardCount: 0 });
        const review = screen.getByTestId('btn-review-s1');
        expect(review).toBeDisabled();
        expect(review).toHaveAttribute(
            'title',
            'Add cards to start practising'
        );
        expect(screen.getByTestId('btn-learn-s1')).toBeDisabled();
        expect(screen.getByTestId('btn-match-s1')).toBeDisabled();
        fireEvent.click(review);
        expect(onStartReview).not.toHaveBeenCalled();
    });

    it('keeps them enabled when the subject has cards', () => {
        const { onStartReview } = renderCard({ cardCount: 3 });
        const review = screen.getByTestId('btn-review-s1');
        expect(review).toBeEnabled();
        fireEvent.click(review);
        expect(onStartReview).toHaveBeenCalled();
        expect(screen.getByTestId('btn-learn-s1')).toBeEnabled();
        expect(screen.getByTestId('btn-match-s1')).toBeEnabled();
    });
});
