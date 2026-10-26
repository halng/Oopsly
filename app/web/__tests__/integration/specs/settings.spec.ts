import { expect, test } from '../support/fixtures';
import { AUTH } from '../support/data';
import { failure } from '../support/wiremock';

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

    test('saving sends the edited profile and settings', async ({
        page,
        mock,
    }) => {
        await page.goto('/settings');
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
        await page.goto('/settings');
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
        await page.goto('/settings');
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
