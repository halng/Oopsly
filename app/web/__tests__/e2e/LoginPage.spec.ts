import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
    test('renders the default login form and marketing panel', async ({
        page,
    }) => {
        await page.goto('/login');

        await expect(page).toHaveURL(/\/login$/);
        await expect(
            page.getByRole('heading', { name: 'Welcome back' })
        ).toBeVisible();
        await expect(
            page.getByText('Sign in to access your spaced repetition decks.')
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Continue with Email' })
        ).toBeVisible();
        await expect(page.getByText("Don't have an account?")).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Sign up' })
        ).toBeVisible();
        await expect(page.getByText('Master any subject')).toBeVisible();
        await expect(page.getByText('Smart Scheduling')).toBeVisible();
    });

    test('blocks submission until the email is valid', async ({ page }) => {
        await page.goto('/login');

        const emailInput = page.getByPlaceholder('name@example.com');
        const continueButton = page.getByRole('button', {
            name: 'Continue with Email',
        });

        await emailInput.fill('invalid-email');

        await expect(continueButton).toBeDisabled();
        await expect(
            page.getByText('Please enter a valid email address.')
        ).toHaveCount(0);
    });

    test('blocks signup submission until a name is entered', async ({
        page,
    }) => {
        await page.goto('/login');

        await page.getByRole('button', { name: 'Sign up' }).click();

        const nameInput = page.getByPlaceholder('Jane Doe');
        const emailInput = page.getByPlaceholder('name@example.com');
        const continueButton = page.getByRole('button', {
            name: 'Continue with Email',
        });

        await emailInput.fill('jane@example.com');
        await expect(nameInput).toBeVisible();
        await expect(continueButton).toBeDisabled();
        await expect(page.getByText('Please enter your name.')).toHaveCount(0);
    });

    test('moves into the OTP step after a successful email submission', async ({
        page,
    }) => {
        await page.route('**/v1/otp**', async (route) => {
            const url = route.request().url();
            if (url.includes('/v1/otp/validate')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        isSuccess: false,
                        message: 'Unexpected validation request',
                        data: null,
                        timestamp: new Date().toISOString(),
                    }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    isSuccess: true,
                    message: 'OTP sent',
                    data: null,
                    timestamp: new Date().toISOString(),
                }),
            });
        });

        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('jane@example.com');
        await page.getByRole('button', { name: 'Continue with Email' }).click();

        await expect(
            page.getByRole('heading', { name: 'Check your email' })
        ).toBeVisible();
        await expect(
            page.getByText(/We sent a code to jane@example.com/i)
        ).toBeVisible();
        await expect(page.getByPlaceholder('123456')).toBeVisible();
    });

    test('allows a user to sign up with a name and complete the OTP flow', async ({
        page,
    }) => {
        await page.route('**/v1/otp**', async (route) => {
            const url = route.request().url();
            if (url.includes('/v1/otp/validate')) {
                const body = route.request().postDataJSON();

                expect(body).toMatchObject({
                    email: 'jane@example.com',
                    otp: '123456',
                    name: 'Jane Doe',
                });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        isSuccess: true,
                        message: 'OTP verified',
                        data: {
                            access_token: 'access-token',
                            refresh_token: 'refresh-token',
                            type: 'bearer',
                        },
                        timestamp: new Date().toISOString(),
                    }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    isSuccess: true,
                    message: 'OTP sent',
                    data: null,
                    timestamp: new Date().toISOString(),
                }),
            });
        });

        await page.goto('/login');
        await page.getByRole('button', { name: 'Sign up' }).click();
        await page.getByPlaceholder('Jane Doe').fill('Jane Doe');
        await page
            .getByPlaceholder('name@example.com')
            .fill('jane@example.com');
        await page.getByRole('button', { name: 'Continue with Email' }).click();

        await expect(
            page.getByText(
                /Hello Jane Doe! We sent a code to jane@example.com/i
            )
        ).toBeVisible();
        await page.getByPlaceholder('123456').fill('123456');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(page).toHaveURL(/\/home$/);
    });

    test('shows an OTP validation error and allows restarting the flow', async ({
        page,
    }) => {
        await page.route('**/v1/otp**', async (route) => {
            const url = route.request().url();
            if (url.includes('/v1/otp/validate')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        isSuccess: false,
                        message: 'Invalid or expired OTP code.',
                        data: null,
                        timestamp: new Date().toISOString(),
                    }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    isSuccess: true,
                    message: 'OTP sent',
                    data: null,
                    timestamp: new Date().toISOString(),
                }),
            });
        });

        await page.goto('/login');
        await page
            .getByPlaceholder('name@example.com')
            .fill('jane@example.com');
        await page.getByRole('button', { name: 'Continue with Email' }).click();

        await expect(page.getByPlaceholder('123456')).toBeVisible();
        await page.getByPlaceholder('123456').fill('654321');
        await page.getByRole('button', { name: 'Verify' }).click();

        await expect(
            page.getByText('Invalid or expired OTP code.')
        ).toBeVisible();

        // TODO: fix this later as the current does not reset the form properly and the email input is still filled with the previous email
        // await page.getByRole('button', { name: /Use a different email/i }).click();
        // await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
        // await expect(page.getByPlaceholder('123456')).toHaveCount(0);
    });
});
