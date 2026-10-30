import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { API, AUTH, subject } from '../support/data';
import { failure } from '../support/wiremock';

const PROFILE = `${AUTH}/v1/user-profiles`;
const CARDS = `${API}/v1/shelves/shelf-1/subjects/subject-1/cards`;

async function openLoadedSettings(page: Page) {
    await page.goto('/settings');
    await expect(page.getByTestId('input-display-name')).toHaveValue('Lena');
}

test.describe('Success notifications', () => {
    test('saving settings confirms with a toast', async ({ page }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('toast-success')).toContainText(
            'Settings saved'
        );
    });

    test('adding a card confirms with a toast', async ({ page }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-add-card').click();
        await page.getByTestId('input-card-front').fill('What is a ribosome?');
        await page.getByTestId('input-card-back').fill('Makes proteins');
        await page.getByTestId('btn-save-card').click();
        await expect(page.getByTestId('toast-success')).toContainText(
            'Card added'
        );
    });

    test('a toast can be dismissed', async ({ page }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('toast-success')).toBeVisible();
        await page.getByTestId('btn-toast-dismiss').click();
        await expect(page.getByTestId('toast-success')).toHaveCount(0);
    });

    test('a toast clears itself after a few seconds', async ({ page }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('toast-success')).toBeVisible();
        await expect(page.getByTestId('toast-success')).toHaveCount(0, {
            timeout: 8000,
        });
    });
});

test.describe('Failure notifications', () => {
    test('a server error says what failed and why, without technical text', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'PATCH',
            path: PROFILE,
            status: 500,
            body: failure('java.lang.NullPointerException at Foo.bar', 500),
        });
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();

        const toast = page.getByTestId('toast-error');
        await expect(toast).toContainText("Couldn't save your changes");
        await expect(toast).toContainText('Something went wrong on our side');
        await expect(toast).not.toContainText('NullPointer');
        await expect(page.getByTestId('toast-success')).toHaveCount(0);
    });

    test('a validation message from the API is shown to the user', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'PATCH',
            path: PROFILE,
            status: 400,
            body: failure('Display name is too long', 400),
        });
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('toast-error')).toContainText(
            'Display name is too long.'
        );
    });

    test('a permission error is explained', async ({ page, mock }) => {
        await mock.override({
            method: 'POST',
            path: CARDS,
            status: 403,
            body: failure('Forbidden', 403),
        });
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-add-card').click();
        await page.getByTestId('input-card-front').fill('Q');
        await page.getByTestId('input-card-back').fill('A');
        await page.getByTestId('btn-save-card').click();
        const toast = page.getByTestId('toast-error');
        await expect(toast).toContainText("Couldn't create that");
        await expect(toast).toContainText("don't have permission");
        await expect(page.getByTestId('toast-success')).toHaveCount(0);
    });

    test('an unreachable server is reported as a connection problem', async ({
        page,
    }) => {
        await openLoadedSettings(page);
        await page.route(`**${PROFILE}`, (route) =>
            route.request().method() === 'PATCH'
                ? route.abort('connectionrefused')
                : route.fallback()
        );
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('toast-error')).toContainText(
            "couldn't reach the server"
        );
    });

    test('failed reads stay quiet', async ({ page, mock }) => {
        await mock.override({
            method: 'GET',
            path: CARDS,
            status: 500,
            body: failure('boom', 500),
        });
        await page.goto('/home/biology/subjects/cell-biology');
        await expect(page.getByTestId('subject-details-page')).toBeVisible();
        await expect(page.getByTestId('toast-error')).toHaveCount(0);
    });

    test('repeating the same failure does not stack identical toasts', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'PATCH',
            path: PROFILE,
            status: 500,
            body: failure('x', 500),
        });
        await openLoadedSettings(page);
        const save = page.getByTestId('btn-save-settings');
        await save.click();
        await expect(page.getByTestId('toast-error')).toHaveCount(1);
        await save.click();
        await expect(page.getByTestId('toast-error')).toHaveCount(1);
    });
});

test.describe('Empty subjects', () => {
    test('study buttons on the subject page are disabled without cards', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: CARDS,
            body: {
                isSuccess: true,
                statusCode: 200,
                message: 'ok',
                timestamp: '2026-01-01T00:00:00Z',
                data: {
                    entities: [],
                    currentPage: 1,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                },
            },
        });
        await page.goto('/home/biology/subjects/cell-biology');
        for (const mode of ['review', 'learn', 'match']) {
            const button = page.getByTestId(`btn-subject-${mode}`);
            await expect(button).toBeDisabled();
            await expect(button).toHaveAttribute(
                'title',
                'Add cards to start practising'
            );
        }
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });

    test('the subject card on the shelf disables practice without cards', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/shelves/shelf-1/subjects`,
            body: {
                isSuccess: true,
                statusCode: 200,
                message: 'ok',
                timestamp: '2026-01-01T00:00:00Z',
                data: {
                    entities: [{ ...subject, cardCount: 0, dueCount: 0 }],
                    currentPage: 1,
                    totalItems: 1,
                    totalPages: 1,
                    hasNextPage: false,
                },
            },
        });
        await page.goto('/home/biology');
        await expect(
            page.getByTestId(`btn-review-${subject.id}`)
        ).toBeDisabled();
        await expect(
            page.getByTestId(`btn-learn-${subject.id}`)
        ).toBeDisabled();
        await expect(
            page.getByTestId(`btn-match-${subject.id}`)
        ).toBeDisabled();
    });

    test('the subject card keeps practice enabled when there are cards', async ({
        page,
    }) => {
        await page.goto('/home/biology');
        await expect(
            page.getByTestId(`btn-review-${subject.id}`)
        ).toBeEnabled();
        await expect(page.getByTestId(`btn-learn-${subject.id}`)).toBeEnabled();
    });
});
