import { expect, test } from '../support/fixtures';
import { AUTH } from '../support/data';
import { envelope } from '../support/wiremock';

test.describe('Subscribe screen', () => {
    test('defaults to yearly billing and switches to monthly pricing', async ({
        page,
    }) => {
        await page.goto('/subscribe');
        await expect(page.getByTestId('subscribe-page')).toBeVisible();
        await expect(page.getByTestId('price-PRO')).toHaveText('$79.99');
        await page.getByTestId('btn-billing-monthly').click();
        await expect(page.getByTestId('price-PRO')).toHaveText('$9.99');
        await expect(page.getByTestId('price-PRO_PLUS')).toHaveText('$19.99');
        await page.getByTestId('btn-billing-yearly').click();
        await expect(page.getByTestId('price-PRO')).toHaveText('$79.99');
    });

    test('a free user can pick a paid plan and keeps the free one marked', async ({
        page,
    }) => {
        await page.goto('/subscribe');
        await expect(page.getByTestId('btn-plan-FREE')).toHaveText(
            'Current plan'
        );
        await expect(page.getByTestId('btn-subscribe-PRO')).toBeEnabled();
        await expect(page.getByTestId('btn-subscribe-PRO_PLUS')).toBeEnabled();
    });

    test('plans are not for sale while payments are off', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${AUTH}/v1/billing/plans`,
            body: envelope({ enabled: false, plans: [] }),
        });
        await page.goto('/subscribe');
        await expect(page.getByTestId('btn-subscribe-PRO')).toHaveText(
            'Coming soon'
        );
        await expect(page.getByTestId('btn-subscribe-PRO')).toBeDisabled();
    });

    test('back returns home', async ({ page }) => {
        await page.goto('/subscribe');
        await page.getByTestId('btn-subscribe-back').click();
        await expect(page).toHaveURL(/\/home$/);
    });
});
