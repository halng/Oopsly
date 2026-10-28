import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HostGameModal from '@/components/shared/HostGameModal';
import { ApiService } from '@/services/api';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: { createQuizRoom: vi.fn() },
}));

const suite = {
    id: 'b',
    title: 'Suite b',
    slug: 'b',
    questionCount: 5,
} as never;

const res = (data: unknown, isSuccess = true, message = '') =>
    ({ isSuccess, data, message }) as never;

describe('HostGameModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a room for the given test with the chosen options', async () => {
        vi.mocked(ApiService.createQuizRoom).mockResolvedValue(
            res({ code: '123456' })
        );
        const onClose = vi.fn();
        render(
            <HostGameModal
                shelfId="shelf-1"
                testSuite={suite}
                onClose={onClose}
            />
        );

        expect(screen.getByText('Quizzly')).toBeInTheDocument();
        expect(screen.getByText('Suite b')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('host-mode-select'), {
            target: { value: 'AUTO' },
        });
        fireEvent.change(screen.getByTestId('host-seconds-select'), {
            target: { value: '30' },
        });
        fireEvent.click(screen.getByTestId('btn-host-game-submit'));

        await waitFor(() =>
            expect(push).toHaveBeenCalledWith('/game/123456/host')
        );
        expect(ApiService.createQuizRoom).toHaveBeenCalledWith({
            shelfId: 'shelf-1',
            testSuiteId: 'b',
            mode: 'AUTO',
            questionSeconds: 30,
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('shows the server error and stays open when creation fails', async () => {
        vi.mocked(ApiService.createQuizRoom).mockResolvedValue(
            res(null, false, 'Test suite not found')
        );
        render(
            <HostGameModal
                shelfId="shelf-1"
                testSuite={suite}
                onClose={vi.fn()}
            />
        );

        fireEvent.click(screen.getByTestId('btn-host-game-submit'));

        expect(await screen.findByTestId('host-game-error')).toHaveTextContent(
            'Test suite not found'
        );
        expect(push).not.toHaveBeenCalled();
        expect(screen.getByTestId('btn-host-game-submit')).toBeEnabled();
    });

    it('closes from the header', () => {
        const onClose = vi.fn();
        render(
            <HostGameModal
                shelfId="shelf-1"
                testSuite={suite}
                onClose={onClose}
            />
        );
        fireEvent.click(screen.getByTestId('btn-host-game-close'));
        expect(onClose).toHaveBeenCalled();
    });
});
