import { test, expect } from '@playwright/test';

test('has rendered correctly main content', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(
        /Oopsly — Active Recall & Spaced Repetition Flashcards/
    );
    await expect(page.getByTestId('brand-logo')).toBeVisible();
    await expect(page.getByTestId('brand-logo')).toHaveClass(
        'font-black text-stone-900 tracking-tight text-xl'
    );
    await expect(page.getByTestId('get-started-button')).toBeVisible();
    await expect(page.getByTestId('get-started-button')).toHaveClass(
        'hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-secondary)] text-white text-sm font-bold shadow-md shadow-stone-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95'
    );
    await expect(page.getByTestId('start-learning-button')).toBeVisible();
    await expect(page.getByTestId('start-learning-button')).toHaveClass(
        'flex items-center gap-2 px-8 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-lg font-bold shadow-xl shadow-stone-900/20 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300'
    );
});

test('navigates to /login when the header "Get Started" button is clicked', async ({
    page,
}) => {
    await page.goto('/');

    // Locate the specific button in the header
    const headerButton = page.getByTestId('get-started-button');
    await expect(headerButton).toBeVisible();

    // Simulate a real user click
    await headerButton.click();

    // Verify the router was called with the correct path
    await expect(page).toHaveURL('/login');
});

test('navigates to /login when the hero "Start Learning for Free" button is clicked', async ({
    page,
}) => {
    await page.goto('/');

    // Locate the specific button in the hero section
    const heroButton = page.getByTestId('start-learning-button');
    await expect(heroButton).toBeVisible();

    // Simulate a real user click
    await heroButton.click();

    // Verify the router was called with the correct path
    await expect(page).toHaveURL('/login');
});

test('renders the hero content and feature highlights', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Learn Faster, Remember Longer')).toBeVisible();
    await expect(
        page.getByRole('heading', { name: /Master any subject with/i })
    ).toBeVisible();
    await expect(
        page.getByText(
            'Oopsly combines the scientifically-proven FSRS algorithm'
        )
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Why choose Oopsly?' })
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'FSRS Algorithm' })
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Gamified Garden' })
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Learn Anywhere' })
    ).toBeVisible();
});

test('shows the primary CTA labels and footer branding', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('get-started-button')).toHaveText(
        /Get Started/i
    );
    await expect(page.getByTestId('start-learning-button')).toHaveText(
        /Start Learning for Free/i
    );
    await expect(page.getByText('Made with')).toBeVisible();
    await expect(page.getByText('for lifelong learners.')).toBeVisible();
    await expect(page.locator('footer')).toContainText('Oopsly');
});
