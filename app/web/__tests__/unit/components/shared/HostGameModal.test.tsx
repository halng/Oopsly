import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HostGameModal from '@/components/shared/HostGameModal';
import { ApiService } from '@/services/api';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: { getTestSuites: vi.fn(), createQuizRoom: vi.fn() },
}));

const suite = (id: string, questionCount: number) => ({
    id,
    title: `Suite ${id}`,
    slug: id,
    questionCount,
});

const res = (data: unknown, isSuccess = true, message = '') =>
    ({ isSuccess, data, message }) as never;

describe('HostGameModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('explains when the deck has no hostable test', async () => {
        vi.mocked(ApiService.getTestSuites).mockResolvedValue(
            res([suite('empty', 0)])
        );
        render(<HostGameModal shelfId="shelf-1" onClose={vi.fn()} />);

        expect(
            await screen.findByTestId('host-game-empty')
        ).toBeInTheDocument();
        expect(screen.getByTestId('btn-host-game-submit')).toBeDisabled();
    });

    it('creates a room with the chosen options and opens the host screen', async () => {
        vi.mocked(ApiService.getTestSuites).mockResolvedValue(
            res([suite('a', 3), suite('b', 5), suite('skip', 0)])
        );
        vi.mocked(ApiService.createQuizRoom).mockResolvedValue(
            res({ code: '123456' })
        );
        const onClose = vi.fn();
        render(<HostGameModal shelfId="shelf-1" onClose={onClose} />);

        fireEvent.click(await screen.findByTestId('host-suite-b'));
        fireEvent.change(screen.getByTestId('host-mode-select'), {
            target: { value: 'AUTO' },
        });
        fireEvent.change(screen.getByTestId('host-seconds-select'), {
            target: { value: '30' },
        });
        expect(screen.queryByTestId('host-suite-skip')).toBeNull();
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
        vi.mocked(ApiService.getTestSuites).mockResolvedValue(
            res([suite('a', 3)])
        );
        vi.mocked(ApiService.createQuizRoom).mockResolvedValue(
            res(null, false, 'Test suite not found')
        );
        render(<HostGameModal shelfId="shelf-1" onClose={vi.fn()} />);

        fireEvent.click(await screen.findByTestId('btn-host-game-submit'));

        expect(await screen.findByTestId('host-game-error')).toHaveTextContent(
            'Test suite not found'
        );
        expect(push).not.toHaveBeenCalled();
        expect(screen.getByTestId('btn-host-game-submit')).toBeEnabled();
    });

    it('treats a failed list call as empty and closes from the header', async () => {
        vi.mocked(ApiService.getTestSuites).mockResolvedValue(res(null, false));
        const onClose = vi.fn();
        render(<HostGameModal shelfId="shelf-1" onClose={onClose} />);

        expect(
            await screen.findByTestId('host-game-empty')
        ).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-host-game-close'));
        expect(onClose).toHaveBeenCalled();
    });
});
