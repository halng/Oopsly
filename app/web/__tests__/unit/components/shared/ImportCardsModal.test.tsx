import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportCardsModal from '@/components/shared/ImportCardsModal';
import { ApiService } from '@/services/api';
import {
    downloadCsvTemplate,
    downloadExcelTemplate,
    parseFileToTable,
} from '@/utils/fileImporter';

vi.mock('@/services/api', () => ({
    ApiService: { createCards: vi.fn() },
}));

vi.mock('@/utils/fileImporter', () => ({
    parseFileToTable: vi.fn(),
    downloadCsvTemplate: vi.fn(),
    downloadExcelTemplate: vi.fn(),
    extractCardsFromTable: vi.fn(
        (
            rows: string[][],
            m: {
                frontCol: number;
                backCol: number;
                hintCol: number | null;
            }
        ) =>
            rows.map((r) => {
                const front = r[m.frontCol] ?? '';
                const back = r[m.backCol] ?? '';
                const hint = m.hintCol === null ? '' : (r[m.hintCol] ?? '');
                const isValid = !!front && !!back;
                return {
                    front,
                    back,
                    hint,
                    isValid,
                    validationError: isValid ? undefined : 'Missing field',
                };
            })
    ),
}));

const subject = { id: 'sub1', name: 'Biology' } as never;

const table = {
    fileName: 'cards.csv',
    fileSize: 2048,
    headers: ['Question', 'Answer', 'Note'],
    rows: [
        ['Cell?', 'Unit of life', 'basic'],
        ['', 'Orphan answer', ''],
        ['DNA?', 'Genetic code', ''],
    ],
    suggestedMapping: { frontCol: 0, backCol: 1, hintCol: null, tagsCol: null },
    hasDetectedHeader: true,
};

const setup = (props: Record<string, unknown> = {}) => {
    const onClose = vi.fn();
    const onImportSuccess = vi.fn();
    const utils = render(
        <ImportCardsModal
            shelfId="shelf1"
            subject={subject}
            isOpen
            onClose={onClose}
            onImportSuccess={onImportSuccess}
            {...props}
        />
    );
    return { onClose, onImportSuccess, ...utils };
};

const uploadFile = async (name = 'cards.csv') => {
    const input = document.querySelector(
        'input[type="file"]'
    ) as HTMLInputElement;
    await userEvent.upload(input, new File(['a,b'], name));
};

describe('ImportCardsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(parseFileToTable).mockResolvedValue(table as never);
    });

    it('renders nothing when closed', () => {
        setup({ isOpen: false });
        expect(screen.queryByTestId('import-cards-modal')).toBeNull();
    });

    it('shows the upload step, template downloads and close buttons', async () => {
        const { onClose } = setup();
        expect(screen.getByText('Biology')).toBeInTheDocument();
        expect(
            screen.getByText('Drag and drop your spreadsheet here')
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Import \d+/ })).toBeNull();
        await userEvent.click(
            screen.getByRole('button', { name: /CSV Template/ })
        );
        expect(downloadCsvTemplate).toHaveBeenCalledWith('full');
        await userEvent.click(
            screen.getByRole('button', { name: /Excel \(\.XLSX\)/ })
        );
        expect(downloadExcelTemplate).toHaveBeenCalledWith('full');
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('opens the file chooser from the browse button and drop zone', async () => {
        setup();
        const input = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const click = vi.spyOn(input, 'click');
        await userEvent.click(
            screen.getByRole('button', { name: 'Browse Files' })
        );
        expect(click).toHaveBeenCalled();
        click.mockClear();
        await userEvent.click(
            screen.getByText('Drag and drop your spreadsheet here')
        );
        expect(click).toHaveBeenCalled();
    });

    it('closes via the header X button', async () => {
        const { onClose } = setup();
        const header = screen
            .getByRole('heading', { name: 'Import Flashcards' })
            .closest('div.flex.items-center.justify-between') as HTMLElement;
        await userEvent.click(header.querySelector(':scope > button')!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('parses an uploaded file and previews rows with validity counts', async () => {
        setup();
        await uploadFile();
        expect(await screen.findByText('cards.csv')).toBeInTheDocument();
        expect(parseFileToTable).toHaveBeenCalledTimes(1);
        expect(screen.getByText('(2.0 KB)')).toBeInTheDocument();
        expect(screen.getByText('3 rows parsed')).toBeInTheDocument();
        expect(screen.getByText('2 ready')).toBeInTheDocument();
        expect(screen.getByText('1 invalid')).toBeInTheDocument();
        expect(screen.getByText('[Empty Front]')).toBeInTheDocument();
        expect(screen.getByText(/Missing field/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Import 2 Flashcards/ })
        ).toBeEnabled();
        const boxes = screen.getAllByRole('checkbox');
        expect(boxes[0]).toBeChecked();
        expect(boxes[1]).toBeDisabled();
        expect(boxes[1]).not.toBeChecked();
    });

    it('handles drag over, leave and drop of a file', async () => {
        setup();
        const zone = screen
            .getByText('Drag and drop your spreadsheet here')
            .closest('div.border-dashed') as HTMLElement;
        fireEvent.dragOver(zone);
        expect(zone.className).toContain('border-emerald-500');
        fireEvent.dragLeave(zone);
        expect(zone.className).not.toContain('border-emerald-500');
        fireEvent.drop(zone, { dataTransfer: { files: [] } });
        expect(parseFileToTable).not.toHaveBeenCalled();
        const file = new File(['x'], 'dropped.csv');
        fireEvent.drop(zone, { dataTransfer: { files: [file] } });
        expect(await screen.findByText('cards.csv')).toBeInTheDocument();
        expect(parseFileToTable).toHaveBeenCalledWith(file);
    });

    it('shows the parser error message and stays on the upload step', async () => {
        vi.mocked(parseFileToTable).mockRejectedValueOnce(
            new Error('Bad sheet')
        );
        setup();
        await uploadFile();
        expect(await screen.findByText('Bad sheet')).toBeInTheDocument();
        expect(screen.getByText('Import Notice')).toBeInTheDocument();
        expect(
            screen.getByText('Drag and drop your spreadsheet here')
        ).toBeInTheDocument();
    });

    it('falls back to a generic parser error message', async () => {
        vi.mocked(parseFileToTable).mockRejectedValueOnce({});
        setup();
        await uploadFile();
        expect(
            await screen.findByText(
                'Failed to parse file. Please verify format.'
            )
        ).toBeInTheDocument();
    });

    it('filters by validity and search text, with an empty state', async () => {
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: 'Invalid (1)' })
        );
        expect(screen.getByText('Orphan answer')).toBeInTheDocument();
        expect(screen.queryByText('Cell?')).toBeNull();
        expect(screen.getByText('Preview Cards (1)')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Valid (2)' })
        );
        expect(screen.queryByText('Orphan answer')).toBeNull();
        expect(screen.getByText('DNA?')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /^All/ }));
        expect(screen.getByText('Preview Cards (3)')).toBeInTheDocument();
    });

    it('remaps columns and shows hints', async () => {
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        const [front, back, hint, tags] = screen.getAllByRole('combobox');
        await userEvent.selectOptions(hint, '2');
        expect(screen.getByText('Hint: basic')).toBeInTheDocument();
        await userEvent.selectOptions(hint, '-1');
        expect(screen.queryByText('Hint: basic')).toBeNull();
        await userEvent.selectOptions(tags, '2');
        expect(tags).toHaveValue('2');
        await userEvent.selectOptions(tags, '-1');
        expect(tags).toHaveValue('-1');
        // swap front/back: row 2 becomes valid-front "Orphan answer" w/o back
        await userEvent.selectOptions(front, '1');
        await userEvent.selectOptions(back, '0');
        expect(screen.getByText('2 ready')).toBeInTheDocument();
        expect(screen.getByText('1 invalid')).toBeInTheDocument();
    });

    it('toggles single selection and select all / deselect all', async () => {
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        const importBtn = () => screen.getByRole('button', { name: /^Import/ });
        const boxes = screen.getAllByRole('checkbox');
        await userEvent.click(boxes[0]);
        expect(importBtn()).toHaveTextContent('Import 1 Flashcard');
        expect(importBtn()).not.toHaveTextContent('Flashcards');
        await userEvent.click(boxes[0]);
        expect(importBtn()).toHaveTextContent('Import 2 Flashcards');
        await userEvent.click(
            screen.getByRole('button', { name: 'Deselect All' })
        );
        expect(importBtn()).toBeDisabled();
        expect(importBtn()).toHaveTextContent('Import 0 Flashcards');
        await userEvent.click(
            screen.getByRole('button', { name: 'Select All Ready' })
        );
        expect(importBtn()).toHaveTextContent('Import 2 Flashcards');
    });

    it('imports only valid selected cards and reports success', async () => {
        vi.mocked(ApiService.createCards).mockResolvedValue({
            isSuccess: true,
        } as never);
        const { onClose, onImportSuccess } = setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: /Import 2 Flashcards/ })
        );
        await waitFor(() => expect(onImportSuccess).toHaveBeenCalledWith(2));
        expect(ApiService.createCards).toHaveBeenCalledWith('shelf1', 'sub1', [
            expect.objectContaining({ front: 'Cell?', back: 'Unit of life' }),
            expect.objectContaining({ front: 'DNA?', back: 'Genetic code' }),
        ]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows Importing... while the request is pending', async () => {
        let resolve!: (v: unknown) => void;
        vi.mocked(ApiService.createCards).mockReturnValue(
            new Promise((r) => (resolve = r)) as never
        );
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: /Import 2 Flashcards/ })
        );
        const btn = await screen.findByRole('button', {
            name: /Importing/,
        });
        expect(btn).toBeDisabled();
        resolve({ isSuccess: false, message: 'x' });
        await screen.findByText('x');
    });

    it('shows the API failure message and keeps the modal open', async () => {
        vi.mocked(ApiService.createCards).mockResolvedValue({
            isSuccess: false,
            message: 'Quota exceeded',
        } as never);
        const { onClose, onImportSuccess } = setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: /Import 2 Flashcards/ })
        );
        expect(await screen.findByText('Quota exceeded')).toBeInTheDocument();
        expect(onImportSuccess).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: /Import 2 Flashcards/ })
        ).toBeEnabled();
    });

    it('falls back to default messages for failures without text', async () => {
        vi.mocked(ApiService.createCards)
            .mockResolvedValueOnce({ isSuccess: false } as never)
            .mockRejectedValueOnce(new Error('boom'))
            .mockRejectedValueOnce({});
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        const click = () =>
            userEvent.click(
                screen.getByRole('button', { name: /Import 2 Flashcards/ })
            );
        await click();
        expect(
            await screen.findByText('Import failed. Please try again.')
        ).toBeInTheDocument();
        await click();
        expect(await screen.findByText('boom')).toBeInTheDocument();
        await click();
        expect(
            await screen.findByText('Network error while importing cards.')
        ).toBeInTheDocument();
    });

    it('resets back to the upload step with Change file', async () => {
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: /Change file/ })
        );
        expect(
            screen.getByText('Drag and drop your spreadsheet here')
        ).toBeInTheDocument();
        expect(screen.queryByText('cards.csv')).toBeNull();
    });

    it('shows a no-match message when nothing is valid under the filter', async () => {
        vi.mocked(parseFileToTable).mockResolvedValue({
            ...table,
            rows: [['', '', '']],
        } as never);
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        expect(screen.getByText('0 ready')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Select All Ready' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Valid (0)' })
        );
        expect(
            screen.getByText('No cards match current filter.')
        ).toBeInTheDocument();
    });

    it('does not import when nothing is selected', async () => {
        setup();
        await uploadFile();
        await screen.findByText('cards.csv');
        await userEvent.click(
            screen.getByRole('button', { name: 'Deselect All' })
        );
        await userEvent.click(screen.getByRole('button', { name: /^Import/ }));
        expect(ApiService.createCards).not.toHaveBeenCalled();
    });
});
