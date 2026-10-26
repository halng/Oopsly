import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { envelope, failure, page as paged } from '../support/wiremock';

const CARDS = `${API}/v1/shelves/shelf-1/subjects/subject-1/cards`;

test.describe('Subject details screen', () => {
    test('lists the cards with their next interval', async ({ page }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await expect(page.getByTestId('subject-details-page')).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Cell Biology' })
        ).toBeVisible();
        for (const n of [1, 2, 3]) {
            await expect(page.getByTestId(`card-row-card-${n}`)).toContainText(
                `Question ${n}`
            );
        }
    });

    test('study buttons open review, learn and match', async ({ page }) => {
        for (const mode of ['review', 'learn', 'match']) {
            await page.goto('/home/biology/subjects/cell-biology');
            await page.getByTestId(`btn-subject-${mode}`).click();
            await expect(page).toHaveURL(
                new RegExp(`/subjects/cell-biology/${mode}$`)
            );
        }
    });

    test('back returns to the shelf', async ({ page }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-subject-back').click();
        await expect(page).toHaveURL(/\/home\/biology$/);
    });

    test('adds a card and reloads the list', async ({ page, mock }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-add-card').click();
        await page.getByTestId('input-card-front').fill('What is a ribosome?');
        await page.getByTestId('input-card-back').fill('Makes proteins');
        await page.getByTestId('input-card-hint').fill('Protein factory');
        await page.getByTestId('btn-save-card').click();

        await expect
            .poll(async () => (await mock.requests('POST', CARDS)).length)
            .toBe(1);
        const [created] = await mock.requests('POST', CARDS);
        expect(created.json).toEqual({
            cards: [
                {
                    front: 'What is a ribosome?',
                    back: 'Makes proteins',
                    hint: 'Protein factory',
                },
            ],
        });
        // The list is fetched again after the save.
        await expect
            .poll(async () => (await mock.requests('GET', CARDS)).length)
            .toBeGreaterThan(1);
    });

    test('edits a card through the card API', async ({ page, mock }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-edit-card-card-1').click();
        const row = page.getByTestId('card-row-card-1');
        await row.locator('textarea').first().fill('Edited question');
        await row.getByRole('button', { name: /save|update/i }).click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${API}/api/cards/card-1`))
                        .length
            )
            .toBe(1);
        const [patch] = await mock.requests('PATCH', `${API}/api/cards/card-1`);
        expect(patch.json).toMatchObject({
            front: 'Edited question',
            back: 'Answer 1',
        });
    });

    test('deletes a card', async ({ page, mock }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-delete-card-card-2').click();
        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'PATCH',
                            `${API}/api/cards/card-2/delete`
                        )
                    ).length
            )
            .toBe(1);
    });

    test('searches cards by text', async ({ page }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('input-card-search').fill('Question 2');
        await expect(page.getByTestId('card-row-card-2')).toBeVisible();
        await expect(page.getByTestId('card-row-card-1')).toHaveCount(0);
    });

    test('generates cards with AI and saves each one', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-generate-ai').click();
        await page.getByTestId('input-ai-topic').fill('Genetics');
        await page.getByTestId('btn-ai-generate').click();

        await expect
            .poll(async () => (await mock.requests('POST', CARDS)).length)
            .toBe(2);
        const [gen] = await mock.requests('POST', `${API}/api/generate-cards`);
        expect(gen.json).toMatchObject({ topic: 'Genetics', count: 5 });
        const saved = await mock.requests('POST', CARDS);
        expect(
            saved.map(
                (r) => (r.json as { cards: { front: string }[] }).cards[0].front
            )
        ).toEqual(['What is DNA?', 'What is RNA?']);
    });

    test('keeps the AI dialog open when generation fails', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${API}/api/generate-cards`,
            status: 503,
            body: failure('AI unavailable', 503),
        });
        await page.goto('/home/biology/subjects/cell-biology');
        await page.getByTestId('btn-generate-ai').click();
        await page.getByTestId('input-ai-topic').fill('Genetics');
        await page.getByTestId('btn-ai-generate').click();

        await expect(page.getByTestId('btn-ai-generate')).toBeEnabled();
        expect(await mock.requests('POST', CARDS)).toHaveLength(0);
    });

    test('shows the empty state when the subject has no cards', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: CARDS,
            body: envelope(paged([])),
        });
        await page.goto('/home/biology/subjects/cell-biology');
        await expect(page.getByTestId('cards-empty')).toBeVisible();
    });

    test('an unknown subject slug shows the not-found state', async ({
        page,
    }) => {
        await page.goto('/home/biology/subjects/nope');
        await expect(page.getByTestId('subject-details-empty')).toBeVisible();
    });
});
