import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TestSuiteModal, {
    MAX_TIME_LIMIT_MINUTES,
} from '@/components/shared/TestSuiteModal';

const submit = () => userEvent.click(screen.getByTestId('btn-save-test-suite'));

describe('TestSuiteModal', () => {
    it('renders create mode with empty fields', () => {
        render(<TestSuiteModal onClose={vi.fn()} onSave={vi.fn()} />);
        expect(
            screen.getByRole('heading', { name: 'New Test Suite' })
        ).toBeInTheDocument();
        expect(screen.getByTestId('test-suite-title-input')).toHaveValue('');
        expect(screen.getByTestId('test-suite-time-limit-input')).toHaveValue(
            null
        );
    });

    it('requires a title', async () => {
        const onSave = vi.fn();
        render(<TestSuiteModal onClose={vi.fn()} onSave={onSave} />);
        await userEvent.type(
            screen.getByTestId('test-suite-title-input'),
            '  '
        );
        await submit();
        expect(screen.getByTestId('test-suite-modal-error')).toHaveTextContent(
            'Please give the test suite a title'
        );
        expect(onSave).not.toHaveBeenCalled();
    });

    it.each(['0', '601', '1.5'])(
        'rejects invalid time limit %s',
        async (value) => {
            const onSave = vi.fn();
            render(<TestSuiteModal onClose={vi.fn()} onSave={onSave} />);
            await userEvent.type(
                screen.getByTestId('test-suite-title-input'),
                'Quiz'
            );
            await userEvent.type(
                screen.getByTestId('test-suite-time-limit-input'),
                value
            );
            // bypass native min/max/step constraint validation
            fireEvent.submit(
                screen.getByTestId('test-suite-modal').querySelector('form')!
            );
            expect(
                screen.getByTestId('test-suite-modal-error')
            ).toHaveTextContent(
                `Time limit must be a whole number between 1 and ${MAX_TIME_LIMIT_MINUTES} minutes`
            );
            expect(onSave).not.toHaveBeenCalled();
        }
    );

    it('saves trimmed values with a time limit and closes', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();
        render(<TestSuiteModal onClose={onClose} onSave={onSave} />);
        await userEvent.type(
            screen.getByTestId('test-suite-title-input'),
            '  Midterm  '
        );
        await userEvent.type(
            screen.getByTestId('test-suite-description-input'),
            '  Chapters 1-3  '
        );
        await userEvent.type(
            screen.getByTestId('test-suite-time-limit-input'),
            '45'
        );
        await submit();
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onSave).toHaveBeenCalledWith({
            title: 'Midterm',
            description: 'Chapters 1-3',
            timeLimitMinutes: 45,
            isActive: true,
            isPublic: false,
        });
    });

    it('saves without description or limit as undefined / null', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<TestSuiteModal onClose={vi.fn()} onSave={onSave} />);
        await userEvent.type(screen.getByTestId('test-suite-title-input'), 'T');
        await submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                title: 'T',
                description: undefined,
                timeLimitMinutes: null,
                isActive: true,
                isPublic: false,
            })
        );
    });

    it('loads edit values and keeps isActive', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <TestSuiteModal
                testSuite={
                    {
                        id: 't1',
                        title: 'Old',
                        description: 'Desc',
                        timeLimitMinutes: 30,
                        isActive: false,
                    } as never
                }
                onClose={vi.fn()}
                onSave={onSave}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Edit Test Suite' })
        ).toBeInTheDocument();
        expect(screen.getByTestId('test-suite-time-limit-input')).toHaveValue(
            30
        );
        await submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith({
                title: 'Old',
                description: 'Desc',
                timeLimitMinutes: 30,
                isActive: false,
                isPublic: false,
            })
        );
    });

    it('shows save errors, keeps the modal open and re-enables the button', async () => {
        const onSave = vi
            .fn()
            .mockRejectedValueOnce(new Error('Server said no'))
            .mockRejectedValueOnce('x');
        const onClose = vi.fn();
        render(<TestSuiteModal onClose={onClose} onSave={onSave} />);
        await userEvent.type(screen.getByTestId('test-suite-title-input'), 'T');
        await submit();
        expect(await screen.findByText('Server said no')).toBeInTheDocument();
        expect(screen.getByTestId('btn-save-test-suite')).toBeEnabled();
        await submit();
        expect(
            await screen.findByText('Could not save the test suite')
        ).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('disables the save button while saving', async () => {
        let resolve!: () => void;
        const onSave = vi.fn(() => new Promise<void>((r) => (resolve = r)));
        render(<TestSuiteModal onClose={vi.fn()} onSave={onSave} />);
        await userEvent.type(screen.getByTestId('test-suite-title-input'), 'T');
        await submit();
        const btn = await screen.findByRole('button', { name: /Saving/ });
        expect(btn).toBeDisabled();
        resolve();
        await waitFor(() =>
            expect(screen.getByTestId('btn-save-test-suite')).toBeEnabled()
        );
    });

    it('closes from the X and Cancel buttons', async () => {
        const onClose = vi.fn();
        render(<TestSuiteModal onClose={onClose} onSave={vi.fn()} />);
        await userEvent.click(screen.getByTestId('btn-test-suite-modal-close'));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('shares the test suite when the Discover box is ticked', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<TestSuiteModal onClose={vi.fn()} onSave={onSave} />);
        await userEvent.type(screen.getByTestId('test-suite-title-input'), 'T');
        await userEvent.click(screen.getByTestId('test-suite-public-input'));
        await submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith(
                expect.objectContaining({ isPublic: true })
            )
        );
    });
});
