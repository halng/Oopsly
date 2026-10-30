import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportQuestionsModal from '@/components/shared/ImportQuestionsModal';
import { ApiService } from '@/services/api';
import { useToastStore } from '@/store/ToastStore';
import { parseFileToTable } from '@/utils/fileImporter';
import {
    downloadQuestionCsvTemplate,
    downloadQuestionExcelTemplate,
} from '@/utils/questionImporter';

vi.mock('@/services/api', () => ({
    ApiService: { createQuestionsBulk: vi.fn() },
}));

vi.mock('@/utils/fileImporter', () => ({ parseFileToTable: vi.fn() }));
vi.mock('@/utils/questionImporter', async (orig) => ({
    ...(await orig<typeof import('@/utils/questionImporter')>()),
    downloadQuestionCsvTemplate: vi.fn(),
    downloadQuestionExcelTemplate: vi.fn(),
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
        vi.mocked(ApiService.createQuestionsBulk).mockResolvedValue(
            ok as never
        );
        const { onClose, onImported } = setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(ApiService.createQuestionsBulk).toHaveBeenCalledWith(
            's1',
            't1',
            [expect.objectContaining({ text: 'Capital of France?' })],
            { silent: true }
        );
        expect(onImported).toHaveBeenCalledWith(1);
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: '1 question added',
        });
    });

    it('adds nothing on a server error and reports why', async () => {
        vi.mocked(ApiService.createQuestionsBulk).mockResolvedValue({
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
        expect(alert).toHaveTextContent('No questions were added');
        expect(alert).toHaveTextContent(/something went wrong on our side/i);
        expect(alert).not.toHaveTextContent('NullPointer');
        expect(ApiService.createQuestionsBulk).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call the API when nothing is selected', async () => {
        setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('chk-select-all-questions'));
        expect(screen.getByTestId('btn-run-import-questions')).toBeDisabled();
    });

    it('reads an uploaded spreadsheet into the preview', async () => {
        vi.mocked(parseFileToTable).mockResolvedValue({
            fileName: 'q.csv',
            fileSize: 10,
            headers: ['Question', 'Option A', 'Option B', 'Correct'],
            rows: [['Capital?', 'Paris', 'Rome', 'A']],
            suggestedMapping: {},
            hasDetectedHeader: true,
        } as never);
        setup();
        const file = new File(['x'], 'q.csv', { type: 'text/csv' });
        await userEvent.upload(
            screen.getByTestId('import-questions-file'),
            file
        );
        expect(
            await screen.findByTestId('import-questions-summary')
        ).toHaveTextContent('1 valid · 0 with issues');
        expect(screen.getByText('q.csv · 1 rows')).toBeInTheDocument();
    });

    it('keeps a file without a header row intact', async () => {
        vi.mocked(parseFileToTable).mockResolvedValue({
            fileName: 'raw.csv',
            fileSize: 10,
            headers: ['Column 1', 'Column 2'],
            rows: [['2 + 2 = ?', '4']],
            suggestedMapping: {},
            hasDetectedHeader: false,
        } as never);
        setup();
        await userEvent.upload(
            screen.getByTestId('import-questions-file'),
            new File(['x'], 'raw.csv')
        );
        await screen.findByTestId('import-questions-preview');
        expect(screen.getByTestId('chk-first-row-header')).not.toBeChecked();
        // No options and a non-boolean answer: the type cannot be guessed.
        expect(
            screen.getByText(/add options, or set a type/i)
        ).toBeInTheDocument();
    });

    it('shows a readable error when the file cannot be parsed', async () => {
        vi.mocked(parseFileToTable).mockRejectedValue(new Error('Bad file'));
        setup();
        await userEvent.upload(
            screen.getByTestId('import-questions-file'),
            new File(['x'], 'bad.csv')
        );
        expect(
            await screen.findByTestId('import-questions-error')
        ).toHaveTextContent('Bad file');
    });

    it('accepts a dropped file', async () => {
        vi.mocked(parseFileToTable).mockResolvedValue({
            fileName: 'd.csv',
            fileSize: 1,
            headers: ['Question', 'Correct'],
            rows: [['Sky is blue', 'True']],
            suggestedMapping: {},
            hasDetectedHeader: true,
        } as never);
        setup();
        fireEvent.drop(screen.getByTestId('import-questions-dropzone'), {
            dataTransfer: { files: [new File(['x'], 'd.csv')] },
        });
        expect(
            await screen.findByTestId('import-questions-summary')
        ).toHaveTextContent('1 valid');
    });

    it('asks for something to paste before previewing', async () => {
        setup();
        await userEvent.click(screen.getByTestId('tab-import-paste'));
        expect(screen.getByTestId('btn-parse-pasted')).toBeDisabled();
    });

    it('re-reads the rows when the header toggle or a column changes', async () => {
        setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('chk-first-row-header'));
        // The header row is now data, so it becomes a (broken) question.
        expect(
            screen.getByTestId('import-questions-summary')
        ).toHaveTextContent('with issues');
        await userEvent.click(screen.getByTestId('chk-first-row-header'));
        await userEvent.selectOptions(screen.getByTestId('map-correct'), '');
        expect(
            screen.getByTestId('import-questions-summary')
        ).toHaveTextContent('0 valid');
    });

    it('filters the preview and lets rows be unticked', async () => {
        setup();
        await paste(TEXT);
        await userEvent.click(screen.getByTestId('filter-import-invalid'));
        expect(screen.queryByText('Capital of France?')).toBeNull();
        expect(screen.getByText('Broken')).toBeInTheDocument();
        await userEvent.click(screen.getByTestId('filter-import-valid'));
        expect(screen.queryByText('Broken')).toBeNull();
        await userEvent.click(screen.getByLabelText('Include row 2'));
        expect(screen.getByTestId('btn-run-import-questions')).toBeDisabled();
        await userEvent.click(screen.getByTestId('chk-select-all-questions'));
        expect(screen.getByTestId('btn-run-import-questions')).toBeEnabled();
    });

    it('lets the user toggle option columns and go back to choose another file', async () => {
        setup();
        await paste(TEXT);
        const optionB = screen.getByTestId('map-option-2');
        await userEvent.click(optionB);
        expect(optionB).not.toBeChecked();
        await userEvent.click(screen.getByTestId('btn-import-choose-another'));
        expect(screen.getByTestId('tab-import-paste')).toBeInTheDocument();
    });

    it('keeps every row for a retry when the batch is rejected', async () => {
        vi.mocked(ApiService.createQuestionsBulk).mockResolvedValue({
            isSuccess: false,
            statusCode: 400,
            message: 'Question 2: Question text is too long',
            data: null,
        } as never);
        const { onClose, onImported } = setup();
        await paste(
            'Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA\nQ2\ta\tb\tB'
        );
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        const alert = await screen.findByTestId('import-questions-error');
        expect(alert).toHaveTextContent('No questions were added');
        expect(alert).toHaveTextContent(
            'Question 2: Question text is too long'
        );
        expect(onImported).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'error',
            title: 'No questions were added',
        });
        expect(screen.getByText('Q1')).toBeInTheDocument();
        expect(
            screen.getByTestId('btn-run-import-questions')
        ).toHaveTextContent('Import 2 questions');
    });

    it('sends every valid row in one request and reports the plural count', async () => {
        vi.mocked(ApiService.createQuestionsBulk).mockResolvedValue(
            ok as never
        );
        const { onClose, onImported } = setup();
        await paste(
            'Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA\nQ2\ta\tb\tB'
        );
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(ApiService.createQuestionsBulk).toHaveBeenCalledTimes(1);
        const sent = vi.mocked(ApiService.createQuestionsBulk).mock.calls[0][2];
        expect(sent.map((q) => q.text)).toEqual(['Q1', 'Q2']);
        expect(onImported).toHaveBeenCalledWith(2);
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: '2 questions added',
        });
    });

    it('skips unticked rows when importing', async () => {
        vi.mocked(ApiService.createQuestionsBulk).mockResolvedValue(
            ok as never
        );
        setup();
        await paste(
            'Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA\nQ2\ta\tb\tB'
        );
        await userEvent.click(screen.getByLabelText('Include row 3'));
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await waitFor(() =>
            expect(ApiService.createQuestionsBulk).toHaveBeenCalled()
        );
        const sent = vi.mocked(ApiService.createQuestionsBulk).mock.calls[0][2];
        expect(sent).toHaveLength(1);
    });

    it('disables the controls and shows progress while the request is pending', async () => {
        let release: (v: unknown) => void = () => undefined;
        vi.mocked(ApiService.createQuestionsBulk).mockReturnValue(
            new Promise((r) => (release = r)) as never
        );
        const { onClose } = setup();
        await paste('Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA');
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        const run = await screen.findByTestId('btn-run-import-questions');
        await waitFor(() => expect(run).toHaveTextContent('Importing...'));
        expect(run).toBeDisabled();
        await userEvent.click(screen.getByTestId('btn-close-import-questions'));
        expect(onClose).not.toHaveBeenCalled();
        release(ok);
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('can be retried after a rejected batch', async () => {
        vi.mocked(ApiService.createQuestionsBulk)
            .mockResolvedValueOnce({
                isSuccess: false,
                statusCode: 400,
                message: 'Question 1: bad',
                data: null,
            } as never)
            .mockResolvedValueOnce(ok as never);
        const { onClose } = setup();
        await paste('Question\tOption A\tOption B\tCorrect\nQ1\ta\tb\tA');
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await screen.findByTestId('import-questions-error');
        await userEvent.click(screen.getByTestId('btn-run-import-questions'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(ApiService.createQuestionsBulk).toHaveBeenCalledTimes(2);
    });

    it('closes through the close and cancel buttons and resets', async () => {
        const { onClose } = setup();
        await userEvent.click(screen.getByTestId('btn-close-import-questions'));
        expect(onClose).toHaveBeenCalledTimes(1);
        await paste(TEXT);
        await userEvent.click(
            screen.getByTestId('btn-cancel-import-questions')
        );
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('downloads the CSV and Excel templates', async () => {
        setup();
        await userEvent.click(screen.getByTestId('btn-question-template-csv'));
        await userEvent.click(screen.getByTestId('btn-question-template-xlsx'));
        expect(downloadQuestionCsvTemplate).toHaveBeenCalled();
        expect(downloadQuestionExcelTemplate).toHaveBeenCalled();
    });

    it('renders nothing while closed', () => {
        render(
            <ImportQuestionsModal
                isOpen={false}
                shelfId="s"
                testSuiteId="t"
                testSuiteTitle="x"
                onClose={vi.fn()}
                onImported={vi.fn()}
            />
        );
        expect(screen.queryByTestId('import-questions-modal')).toBeNull();
    });
});
