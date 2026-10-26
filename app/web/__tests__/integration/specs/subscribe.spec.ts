import { expect, test } from '../support/fixtures';

test.describe('Subscribe screen', () => {
    test('defaults to yearly billing and switches to monthly pricing', async ({
        page,
    }) => {
        await page.goto('/subscribe');
        await expect(page.getByTestId('subscribe-page')).toBeVisible();
        await expect(page.getByText('$7.99')).toBeVisible();
        await page.getByTestId('btn-billing-monthly').click();
        await expect(page.getByText('$9.99')).toBeVisible();
        await page.getByTestId('btn-billing-yearly').click();
        await expect(page.getByText('$7.99')).toBeVisible();
    });

    test('choosing a plan explains that checkout is a demo', async ({
        page,
    }) => {
        await page.goto('/subscribe');
        await page.getByTestId('btn-subscribe-pro').click();
        await expect(page.getByTestId('subscribe-demo-message')).toContainText(
            'not connected yet'
        );
    });

    test('lifetime plan shows the same demo notice', async ({ page }) => {
        await page.goto('/subscribe');
        await page.getByTestId('btn-subscribe-lifetime').click();
        await expect(page.getByTestId('subscribe-demo-message')).toContainText(
            'lifetime'
        );
    });

    test('back returns home', async ({ page }) => {
        await page.goto('/subscribe');
        await page.getByTestId('btn-subscribe-back').click();
        await expect(page).toHaveURL(/\/home$/);
    });
});
