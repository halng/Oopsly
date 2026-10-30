import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CloneTestSuiteModal from '@/components/shared/CloneTestSuiteModal';
import { ApiService } from '@/services/api';
import { useToastStore } from '@/store/ToastStore';

vi.mock('@/services/api', () => ({
    ApiService: { cloneTestSuite: vi.fn() },
}));

const suite = { id: 'ts1', title: 'Quiz', questionCount: 3 } as never;
const shelves = [
    { id: 's1', name: 'Science' },
    { id: 's2', name: 'Languages' },
] as never;

const setup = (list = shelves) => {
    const onClose = vi.fn();
    const onCloned = vi.fn();
    render(
        <CloneTestSuiteModal
            testSuite={suite}
            shelves={list}
            onClose={onClose}
            onCloned={onCloned}
        />
    );
    return { onClose, onCloned };
};

beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
});

describe('CloneTestSuiteModal', () => {
    it('renders nothing without a test suite', () => {
        render(
            <CloneTestSuiteModal
                testSuite={null}
                shelves={shelves}
                onClose={vi.fn()}
                onCloned={vi.fn()}
            />
        );
        expect(screen.queryByTestId('clone-test-suite-modal')).toBeNull();
    });

    it('needs a shelf before it can clone', () => {
        setup();
        expect(
            screen.getByTestId('btn-confirm-clone-test-suite')
        ).toBeDisabled();
    });

    it('clones into the chosen shelf and closes', async () => {
        vi.mocked(ApiService.cloneTestSuite).mockResolvedValue({
            isSuccess: true,
            statusCode: 201,
            message: '',
            data: { id: 'new', title: 'Quiz' },
        } as never);
        const { onClose, onCloned } = setup();
        await userEvent.click(screen.getByTestId('clone-suite-shelf-s2'));
        await userEvent.click(
            screen.getByTestId('btn-confirm-clone-test-suite')
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(ApiService.cloneTestSuite).toHaveBeenCalledWith('ts1', 's2');
        expect(onCloned).toHaveBeenCalledWith({ id: 'new', title: 'Quiz' });
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: 'Test suite cloned',
        });
    });

    it('shows the error and stays open when cloning fails', async () => {
        vi.mocked(ApiService.cloneTestSuite).mockResolvedValue({
            isSuccess: false,
            statusCode: 404,
            message: 'Public test suite not found',
            data: null,
        } as never);
        const { onClose } = setup();
        await userEvent.click(screen.getByTestId('clone-suite-shelf-s1'));
        await userEvent.click(
            screen.getByTestId('btn-confirm-clone-test-suite')
        );
        expect(
            await screen.findByTestId('clone-test-suite-error')
        ).toHaveTextContent('Public test suite not found');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('explains when the user has no shelves', () => {
        setup([] as never);
        expect(screen.getByText(/no shelves yet/i)).toBeInTheDocument();
    });
});
