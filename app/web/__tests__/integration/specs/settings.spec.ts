import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { AUTH, profile } from '../support/data';
import { envelope, failure } from '../support/wiremock';

/**
 * The page re-fills the form when the profile response lands, which would
 * overwrite anything typed earlier. Wait for it before editing.
 */
async function openLoadedSettings(page: Page) {
    await page.goto('/settings');
    await expect(page.getByTestId('input-display-name')).toHaveValue('Lena');
}

test.describe('Settings screen', () => {
    test('prefills the form from the profile API', async ({ page, mock }) => {
        await page.goto('/settings');
        await expect(page.getByTestId('settings-page')).toBeVisible();
        await expect(page.getByTestId('input-display-name')).toHaveValue(
            'Lena'
        );
        await expect(page.getByTestId('input-email')).toHaveValue(
            'learner@oopsly.app'
        );
        await expect(page.getByTestId('input-daily-goal')).toHaveValue('20');
        expect(
            await mock.requests('GET', `${AUTH}/v1/user-profiles`)
        ).not.toHaveLength(0);
    });

    test('uploads a new profile photo to S3 and shows the presigned link', async ({
        page,
        mock,
    }) => {
        const s3Posts: string[] = [];
        await page.route('https://s3.test/**', (route) => {
            s3Posts.push(route.request().method());
            return route.fulfill({ status: 204 });
        });
        await mock.override({
            method: 'POST',
            path: `${AUTH}/v1/user-profiles/avatar/upload-url`,
            body: envelope({
                url: 'https://s3.test/oopsly-avatars',
                fields: { key: 'avatars/u1/a.png', policy: 'p' },
                key: 'avatars/u1/a.png',
                maxBytes: 2097152,
            }),
        });
        await mock.override({
            method: 'POST',
            path: `${AUTH}/v1/user-profiles/avatar/confirm`,
            body: envelope({
                ...profile,
                avatarUrl: 'https://s3.test/avatars/u1/a.png?sig=1',
            }),
        });
        await openLoadedSettings(page);
        // The page reloads the profile after it changes; the server now has the photo.
        await mock.override({
            method: 'GET',
            path: `${AUTH}/v1/user-profiles`,
            body: envelope({
                ...profile,
                avatarUrl: 'https://s3.test/avatars/u1/a.png?sig=1',
            }),
        });
        await page.getByTestId('input-avatar-file').setInputFiles({
            name: 'me.png',
            mimeType: 'image/png',
            buffer: Buffer.from('png-bytes'),
        });

        await expect(page.getByTestId('toast-success')).toContainText(
            'Profile photo updated'
        );
        await expect(page.getByTestId('avatar-preview')).toHaveAttribute(
            'src',
            'https://s3.test/avatars/u1/a.png?sig=1'
        );
        expect(s3Posts.filter((m) => m === 'POST')).toHaveLength(1);
        const [confirmed] = await mock.requests(
            'POST',
            `${AUTH}/v1/user-profiles/avatar/confirm`
        );
        expect(confirmed.json).toEqual({ key: 'avatars/u1/a.png' });
    });

    test('refuses a non-image before uploading anything', async ({
        page,
        mock,
    }) => {
        await openLoadedSettings(page);
        await page.getByTestId('input-avatar-file').setInputFiles({
            name: 'notes.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF'),
        });
        await expect(page.getByTestId('toast-error')).toContainText(
            'JPEG, PNG or WebP'
        );
        expect(
            await mock.requests(
                'POST',
                `${AUTH}/v1/user-profiles/avatar/upload-url`
            )
        ).toHaveLength(0);
    });

    test('the email is read-only', async ({ page }) => {
        await openLoadedSettings(page);
        await expect(page.getByTestId('input-email')).not.toBeEditable();
    });

    test('emails a calendar event for the chosen study times', async ({
        page,
        mock,
    }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-toggle-reminders').click();
        await page.getByTestId('btn-reminder-day-6').click();
        await page.getByTestId('input-reminder-time').fill('07:30');
        await page.getByTestId('btn-send-reminder').click();

        await expect(page.getByTestId('toast-success')).toContainText(
            'Reminder sent'
        );
        const [sent] = await mock.requests(
            'POST',
            `${AUTH}/v1/user-profiles/study-reminder`
        );
        expect(sent.json).toMatchObject({
            days: [1, 2, 3, 4, 5, 6],
            time: '07:30',
        });
    });

    test('downloads the calendar event as an .ics file', async ({ page }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-toggle-reminders').click();
        const download = page.waitForEvent('download');
        await page.getByTestId('btn-download-reminder').click();
        expect((await download).suggestedFilename()).toBe(
            'oopsly-study-reminder.ics'
        );
    });

    test('saving sends the edited profile and settings', async ({
        page,
        mock,
    }) => {
        await openLoadedSettings(page);
        await page.getByTestId('input-display-name').fill('Lena L.');
        await page.getByTestId('input-bio').fill('Studying cells');
        await page.getByTestId('input-daily-goal').fill('30');
        await page.getByTestId('btn-toggle-reminders').click();
        await page.getByTestId('btn-save-settings').click();

        await expect(page.getByTestId('btn-save-settings')).toContainText(
            'Saved!'
        );
        const [saved] = await mock.requests(
            'PATCH',
            `${AUTH}/v1/user-profiles`
        );
        expect(saved.json).toMatchObject({
            displayName: 'Lena L.',
            bio: 'Studying cells',
            settings: { dailyGoal: 30, allowReminders: true },
        });
    });

    test('picking a theme is included in the save', async ({ page, mock }) => {
        await openLoadedSettings(page);
        await page.getByTestId('btn-open-theme').click();
        await expect(page.getByTestId('theme-modal')).toBeVisible();
        await page.getByTestId('theme-option-ghibli-night').click();
        await page.getByRole('button', { name: 'Done' }).click();
        await page.getByTestId('btn-save-settings').click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${AUTH}/v1/user-profiles`))
                        .length
            )
            .toBe(1);
        const [saved] = await mock.requests(
            'PATCH',
            `${AUTH}/v1/user-profiles`
        );
        expect(saved.json).toMatchObject({
            settings: { theme: 'ghibli-night' },
        });
    });

    test('a rejected save does not claim success', async ({ page, mock }) => {
        await mock.override({
            method: 'PATCH',
            path: `${AUTH}/v1/user-profiles`,
            status: 500,
            body: failure('db down', 500),
        });
        await openLoadedSettings(page);
        await page.getByTestId('btn-save-settings').click();
        await expect(page.getByTestId('btn-save-settings')).not.toContainText(
            'Saved!'
        );
        await expect(page.getByTestId('btn-save-settings')).toBeEnabled();
    });

    test('back returns home', async ({ page }) => {
        await page.goto('/settings');
        await page.getByTestId('btn-settings-back').click();
        await expect(page).toHaveURL(/\/home$/);
    });

    test('log out clears the stored session and leaves the app', async ({
        page,
    }) => {
        await page.goto('/settings');
        await page.getByTestId('btn-logout').click();
        // The auth guard sees the cleared session and redirects before the
        // router push to the landing page completes.
        await expect(page).toHaveURL(/\/(login)?$/);
        const stored = await page.evaluate(() =>
            localStorage.getItem('oopsly-auth')
        );
        expect(JSON.parse(stored ?? '{}').state).toMatchObject({
            isAuthenticated: false,
            accessToken: '',
        });
        await page.goto('/home');
        await expect(page).toHaveURL(/\/login$/);
    });
});
