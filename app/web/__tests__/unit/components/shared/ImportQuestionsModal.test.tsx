import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportQuestionsModal from '@/components/shared/ImportQuestionsModal';
import { ApiService } from '@/services/api';
import { useToastStore } from '@/store/ToastStore';

vi.mock('@/services/api', () => ({
    ApiService: { createQuestion: vi.fn() },
}));

const ok = { isSuccess: true, statusCode: 200, message: '', data: {} };

const setup = () => {
    const onClose = vi.fn();
    const onImported = vi.fn();
    render(
        <ImportQuestionsModal
            isOpen
            shelfId="s1"
            testSuiteId="t1"
            testSuiteTitle="Geo"
            onClose={onClose}
            onImported={onImported}
        />
    );
    return { onClose, onImported };
};

const paste = async (text: string) => {
    await userEvent.click(screen.getByTestId('tab-import-paste'));
    await userEvent.click(screen.getByTestId('import-questions-paste'));
    await userEvent.paste(text);
    await userEvent.click(screen.getByTestId('btn-parse-pasted'));
};

const TEXT =
    'Question\tOption A\tOption B\tCorrect\nCapital of France?\tParis\tRome\tA\nBroken\tx\ty\tZ';

beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
});

describe('ImportQuestionsModal', () => {
    it('previews pasted rows and flags invalid ones', async () => {
        setup();
        await paste(TEXT);
        expect(
            screen.getByTestId('import-questions-summary')
        ).toHaveTextContent('1 valid · 1 with issues');
        expect(
            screen.getByText(/doesn't match any option/i)
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('btn-run-import-questions')
        ).toHaveTextContent('Import 1 questions');
    });

    it('imports valid rows silently and shows a success toast', async () => {
        vi.mocked(ApiService.createQuestion).mockResolvedValue(ok as never);
        const { onClose, onImported } = setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(ApiService.createQuestion).toHaveBeenCalledWith(
            's1',
            't1',
            expect.objectContaining({ text: 'Capital of France?' }),
            { silent: true }
        );
        expect(onImported).toHaveBeenCalledWith(1);
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: '1 question added',
        });
    });

    it('stops on a server error and reports why', async () => {
        vi.mocked(ApiService.createQuestion).mockResolvedValue({
            isSuccess: false,
            statusCode: 500,
            message: 'java.lang.NullPointerException',
            data: null,
        } as never);
        const { onClose } = setup();
        await paste(
            'Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA\nQ2\ta\tb\tB'
        );
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        const alert = await screen.findByTestId('import-questions-error');
        expect(alert).toHaveTextContent('0 added, 2 not added');
        expect(alert).toHaveTextContent(/something went wrong on our side/i);
        expect(alert).not.toHaveTextContent('NullPointer');
        expect(ApiService.createQuestion).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call the API when nothing is selected', async () => {
        setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('chk-select-all-questions'));
        expect(screen.getByTestId('btn-run-import-questions')).toBeDisabled();
    });
});
