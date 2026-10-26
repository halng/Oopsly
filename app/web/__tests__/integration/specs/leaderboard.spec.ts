import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { envelope } from '../support/wiremock';

test.describe('Leaderboard screen (communities)', () => {
    test('lists every community and flags the ones the user has not joined', async ({
        page,
    }) => {
        await page.goto('/leaderboard');
        await expect(page.getByTestId('leaderboard-page')).toBeVisible();
        await expect(page.getByTestId('community-card-comm-1')).toContainText(
            'Night Owls'
        );
        await expect(page.getByTestId('community-card-comm-2')).toContainText(
            'Biology Club'
        );
        await expect(page.getByTestId('btn-join-comm-1')).toBeVisible();
        await expect(page.getByTestId('btn-join-comm-2')).toHaveCount(0);
    });

    test('viewing a community ranks members by XP and can re-sort', async ({
        page,
    }) => {
        await page.goto('/leaderboard');
        await page.getByTestId('btn-select-community-comm-2').click();

        const rows = page.locator('[data-testid^="member-row-"]');
        await expect(rows).toHaveCount(3);
        await expect(rows.first()).toContainText('#1 Ada');

        await page.getByTestId('btn-sort-streak').click();
        await expect(rows.first()).toContainText('#1 Bo');
        await page.getByTestId('btn-sort-weekly').click();
        await expect(rows.first()).toContainText('#1 Ada');
    });

    test('owners see invite and requests controls', async ({ page }) => {
        await page.goto('/leaderboard');
        await page.getByTestId('btn-select-community-comm-2').click();
        await expect(page.getByTestId('btn-open-invite')).toBeVisible();
        await expect(page.getByTestId('btn-open-requests')).toBeVisible();
    });

    test('regular communities hide the owner controls', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/api/communities/comm-1/leaderboard`,
            body: envelope({ community: {}, members: [] }),
        });
        await page.goto('/leaderboard');
        await page.getByTestId('btn-select-community-comm-1').click();
        await expect(page.getByText('No members yet.')).toBeVisible();
        await expect(page.getByTestId('btn-open-invite')).toHaveCount(0);
    });

    test('joining posts to the API and reloads the communities', async ({
        page,
        mock,
    }) => {
        await page.goto('/leaderboard');
        await page.getByTestId('btn-join-comm-1').click();
        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'POST',
                            `${API}/api/communities/comm-1/join`
                        )
                    ).length
            )
            .toBe(1);
        await expect
            .poll(
                async () =>
                    (await mock.requests('GET', `${API}/api/communities`))
                        .length
            )
            .toBeGreaterThan(1);
    });

    test('searching filters the community cards', async ({ page }) => {
        await page.goto('/leaderboard');
        await page.getByTestId('input-community-search').fill('owls');
        await expect(page.getByTestId('community-card-comm-1')).toBeVisible();
        await expect(page.getByTestId('community-card-comm-2')).toHaveCount(0);
    });

    test('invites a member by email', async ({ page, mock }) => {
        await page.goto('/leaderboard');
        await page.getByTestId('btn-select-community-comm-2').click();
        await page.getByTestId('btn-open-invite').click();
        await page.getByTestId('input-invite-email').fill('friend@oopsly.app');
        await page.getByTestId('btn-confirm-invite').click();
        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'POST',
                            `${API}/api/communities/comm-2/invite`
                        )
                    ).length
            )
            .toBe(1);
        const [invite] = await mock.requests(
            'POST',
            `${API}/api/communities/comm-2/invite`
        );
        expect(invite.json).toEqual({ emailOrName: 'friend@oopsly.app' });
    });

    test('with no communities it explains how leaderboards work', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/api/communities`,
            body: envelope([]),
        });
        await mock.override({
            method: 'GET',
            path: `${API}/api/communities/my`,
            body: envelope([]),
        });
        await page.goto('/leaderboard');
        await expect(
            page.getByText('Leaderboards live inside study communities')
        ).toBeVisible();
    });
});
