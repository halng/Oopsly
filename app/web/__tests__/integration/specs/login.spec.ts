import { expect, test } from '../support/fixtures';
import { AUTH, API } from '../support/data';
import { failure } from '../support/wiremock';

test.describe('Login screen', () => {
    test.use({ signedIn: false });

    test('email OTP login stores the session and opens home', async ({
        page,
        mock,
    }) => {
        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('learner@oopsly.app');
        await page.getByRole('button', { name: 'Continue with Email' }).click();

        await expect(page.getByPlaceholder('123456')).toBeVisible();
        const otpRequests = await mock.requests('POST', `${AUTH}/v1/otp`);
        expect(otpRequests).toHaveLength(1);
        expect(otpRequests[0].url).toContain('email=learner@oopsly.app');

        await page.getByPlaceholder('123456').fill('123456');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(page).toHaveURL(/\/home$/);
        const [validate] = await mock.requests(
            'POST',
            `${AUTH}/v1/otp/validate`
        );
        expect(validate.json).toMatchObject({
            email: 'learner@oopsly.app',
            otp: '123456',
        });
        const stored = await page.evaluate(() =>
            localStorage.getItem('oopsly-auth')
        );
        expect(JSON.parse(stored ?? '{}').state).toMatchObject({
            isAuthenticated: true,
            accessToken: 'access-jwt',
            refreshToken: 'refresh-jwt',
        });
    });

    test('sign up asks for a name and forwards it with the code', async ({
        page,
        mock,
    }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Sign up' }).click();
        await page.getByPlaceholder('Jane Doe').fill('Lena Learner');
        await page
            .getByPlaceholder('name@example.com')
            .fill('learner@oopsly.app');
        await page.getByRole('button', { name: /Continue with Email/ }).click();
        await page.getByPlaceholder('123456').fill('654321');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(page).toHaveURL(/\/home$/);
        const [validate] = await mock.requests(
            'POST',
            `${AUTH}/v1/otp/validate`
        );
        expect(validate.json).toMatchObject({
            name: 'Lena Learner',
            otp: '654321',
        });
    });

    test('shows the server message when the code cannot be sent', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${AUTH}/v1/otp`,
            status: 429,
            body: failure('Too many requests, try again later', 429),
        });
        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('learner@oopsly.app');
        await page.getByRole('button', { name: 'Continue with Email' }).click();

        await expect(
            page.getByText('Too many requests, try again later')
        ).toBeVisible();
        await expect(page.getByPlaceholder('123456')).toHaveCount(0);
    });

    test('rejects a wrong code and keeps the user on login', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${AUTH}/v1/otp/validate`,
            status: 400,
            body: failure('Invalid or expired OTP code.'),
        });
        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('learner@oopsly.app');
        await page.getByRole('button', { name: 'Continue with Email' }).click();
        await page.getByPlaceholder('123456').fill('000000');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(
            page.getByText('Invalid or expired OTP code.')
        ).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test('can go back to change the email', async ({ page }) => {
        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('learner@oopsly.app');
        await page.getByRole('button', { name: 'Continue with Email' }).click();
        await page.getByTestId('btn-use-different-email').click();
        await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
    });
});

test.describe('Auth guard', () => {
    test.use({ signedIn: false });

    test('protected screens redirect anonymous visitors to login', async ({
        page,
        mock,
    }) => {
        await page.goto('/home');
        await expect(page).toHaveURL(/\/login$/);
        // The guard keeps the page mounted, so it may still fire requests,
        // but none may carry credentials.
        const calls = await mock.requests('GET', `${API}/v1/shelves`);
        for (const call of calls) {
            expect(call.headers.Authorization).toBeUndefined();
        }
    });
});
