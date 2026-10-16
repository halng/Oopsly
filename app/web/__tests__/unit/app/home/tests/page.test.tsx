import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TestSuiteDetailsPage from '@/app/(user)/home/[slug]/tests/[testSlug]/page';
import { ApiService } from '@/services/api';
import { testSuiteContext } from '@/__tests__/unit/helpers/studyFixtures';
import { Question } from '@/types';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science', testSlug: 'midterm' }),
}));
vi.mock('@/hooks/useTestSuiteContext', () => ({
    useTestSuiteContext: () => testSuiteContext,
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getQuestions: vi.fn(),
        createQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        deleteQuestion: vi.fn(),
    },
}));

const question: Question = {
    id: 'q1',
    text: '2+2?',
    type: 'SINGLE_CHOICE',
    options: ['3', '4'],
    correctOptionIndex: 1,
};

describe('TestSuiteDetailsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getQuestions).mockResolvedValue({
            isSuccess: true,
            data: [question],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('lists questions and can start the attempt', async () => {
        render(<TestSuiteDetailsPage />);
        await waitFor(() => expect(screen.getByText('2+2?')).toBeInTheDocument());
        fireEvent.click(screen.getByTestId('btn-take-test'));
        expect(push).toHaveBeenCalledWith('/home/science/tests/midterm/take');
    });
});
