import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '@/components/shared/Pagination';

describe('Pagination', () => {
    it('renders nothing when everything fits on one page', () => {
        const { container } = render(
            <Pagination page={1} totalPages={1} onChange={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows where you are and moves one page at a time', () => {
        const onChange = vi.fn();
        render(
            <Pagination
                page={2}
                totalPages={3}
                onChange={onChange}
                testId="p"
            />
        );
        expect(screen.getByTestId('p-status')).toHaveTextContent('Page 2 of 3');
        fireEvent.click(screen.getByTestId('p-prev'));
        fireEvent.click(screen.getByTestId('p-next'));
        expect(onChange).toHaveBeenNthCalledWith(1, 1);
        expect(onChange).toHaveBeenNthCalledWith(2, 3);
    });

    it('disables previous on the first page and next on the last', () => {
        const { rerender } = render(
            <Pagination page={1} totalPages={3} onChange={vi.fn()} testId="p" />
        );
        expect(screen.getByTestId('p-prev')).toBeDisabled();
        expect(screen.getByTestId('p-next')).toBeEnabled();
        rerender(
            <Pagination page={3} totalPages={3} onChange={vi.fn()} testId="p" />
        );
        expect(screen.getByTestId('p-prev')).toBeEnabled();
        expect(screen.getByTestId('p-next')).toBeDisabled();
    });
});
