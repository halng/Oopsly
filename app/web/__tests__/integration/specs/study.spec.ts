import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { GAME, garden, reward } from '../support/data';
import { envelope, failure } from '../support/wiremock';

// WireMock speaks HTTP only, so the garden WebSocket is answered in-browser.
test.beforeEach(async ({ page }) => {
    await page.routeWebSocket(/\/game\/v1\/game\/ws/, (ws) => {
        ws.send(
            JSON.stringify({
                type: 'ready',
                requestId: null,
                message: 'Garden socket open',
                data: null,
            })
        );
    });
});

test.describe('Study screen (focus timer and garden)', () => {
    test('starts on the timer with the default 25 minute session', async ({
        page,
    }) => {
        await page.goto('/study');
        await expect(page.getByTestId('study-page')).toBeVisible();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('25:00');
    });

    test('duration buttons reset the clock', async ({ page }) => {
        await page.goto('/study');
        await page.getByTestId('btn-duration-45').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('45:00');
        await page.getByTestId('btn-duration-15').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('15:00');
    });

    test('start counts down, pause stops it and reset restores it', async ({
        page,
    }) => {
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(5000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('14:55');

        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(5000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('14:55');

        await page.getByTestId('btn-pomodoro-reset').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('15:00');
    });

    test('finishing a focus session claims a seed pouch and opens the garden', async ({
        page,
        mock,
    }) => {
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(15 * 60 * 1000 + 1000);

        await expect(page.getByText('A seed pouch opened.')).toBeVisible();
        const [claim] = await mock.requests(
            'POST',
            `${GAME}/v1/game/rewards/focus`
        );
        expect(claim.json).toEqual({ focusMinutes: 15 });
    });

    test('a failed claim shows the server message and keeps the message for the garden tab', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${GAME}/v1/game/rewards/focus`,
            status: 400,
            body: failure('Focus session too short', 400),
        });
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(15 * 60 * 1000 + 1000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('00:00');
        await page.getByTestId('btn-tab-garden').click();
        await expect(page.getByText('Focus session too short')).toBeVisible();
    });

    test('the garden tab shows the resources loaded from the game API', async ({
        page,
        mock,
    }) => {
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(
            page.getByRole('heading', { name: 'Ghibli Garden' })
        ).toBeVisible();
        await expect(
            page.getByText(
                `Dew ${garden.dewDrops} · Coins ${garden.forestCoins} · Level ${garden.forestLevel}`
            )
        ).toBeVisible();
        const [fetched] = await mock.requests('GET', `${GAME}/v1/game/garden`);
        expect(fetched.headers.Authorization).toBe('Bearer access-jwt');
    });

    test('the garden tab reflects the rewards the API returns', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope({
                ...garden,
                dewDrops: 42,
                forestCoins: 7,
                forestLevel: 3,
            }),
        });
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(
            page.getByText('Dew 42 · Coins 7 · Level 3')
        ).toBeVisible();
    });

    test('shows a message when the garden cannot be loaded', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            status: 503,
            body: failure('Game service unavailable', 503),
        });
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(page.getByText('Game service unavailable')).toBeVisible();
    });
});

// The garden is a Phaser canvas: plots are clicked by position, and every
// action goes over the WebSocket to a small fake game server.
const CELL = (index: number) => ({
    x: 70 + (index % 3) * 136,
    y: 80 + Math.floor(index / 3) * 136,
});

async function clickPlot(page: Page, index: number) {
    // The Phaser scene boots asynchronously; keep clicking until the page
    // reacts with that plot's panel.
    await expect(async () => {
        const box = await page
            .getByTestId('garden-canvas')
            .locator('canvas')
            .last()
            .boundingBox();
        if (!box) throw new Error('garden canvas is not on the page');
        const { x, y } = CELL(index);
        await page.mouse.click(
            box.x + (x / 480) * box.width,
            box.y + (y / 480) * box.height
        );
        await expect(page.getByTestId('plot-panel')).toContainText(
            `Plot ${index + 1}`,
            { timeout: 750 }
        );
    }).toPass({ timeout: 15_000 });
}

// The shared fixture has no trees, so its `plantedTrees` is typed `never[]`.
type FakeGarden = Omit<typeof garden, 'plantedTrees'> & {
    plantedTrees: Record<string, unknown>[];
};

type Action = {
    action: string;
    requestId: string;
    treeId?: string;
    species?: string;
    plotIndex?: number;
};

/** Answers garden actions like the game service would and records them. */
async function fakeGameServer(
    page: Page,
    start: FakeGarden,
    failWith?: string
) {
    const state = structuredClone(start);
    const received: Action[] = [];
    await page.routeWebSocket(/\/game\/v1\/game\/ws/, (ws) => {
        ws.send(
            JSON.stringify({
                type: 'ready',
                requestId: null,
                message: 'open',
                data: null,
            })
        );
        ws.onMessage((raw) => {
            const msg = JSON.parse(String(raw)) as Action;
            received.push(msg);
            if (failWith) {
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        requestId: msg.requestId,
                        message: failWith,
                        data: null,
                    })
                );
                return;
            }
            if (msg.action === 'plant') {
                state.plantedTrees.push({
                    id: 'tree-1',
                    plotIndex: msg.plotIndex,
                    species: msg.species,
                    stage: 'seed',
                    waterLevel: 50,
                    growthProgress: 0,
                    plantedAt: '2026-01-01T00:00:00Z',
                    totalWaters: 0,
                });
                state.seedInventory = {
                    ...state.seedInventory,
                    [msg.species as string]: 0,
                };
            }
            if (msg.action === 'water') {
                const tree = state.plantedTrees.find(
                    (t) => t.id === msg.treeId
                );
                if (tree) tree.totalWaters = Number(tree.totalWaters) + 1;
                state.dewDrops -= 5;
            }
            if (msg.action === 'unlock') {
                const plot = state.plots.find((p) => p.index === msg.plotIndex);
                if (plot) plot.isUnlocked = true;
                state.forestCoins -= 50;
            }
            if (msg.action === 'harvest') {
                state.plantedTrees = state.plantedTrees.filter(
                    (t) => t.id !== msg.treeId
                );
                ws.send(
                    JSON.stringify({
                        type: 'reward',
                        requestId: msg.requestId,
                        message: 'Harvest gathered',
                        data: { ...reward, garden: state },
                    })
                );
                return;
            }
            ws.send(
                JSON.stringify({
                    type: 'garden',
                    requestId: msg.requestId,
                    message: 'ok',
                    data: state,
                })
            );
        });
    });
    return { received, state };
}

const richGarden: FakeGarden = { ...garden, forestCoins: 100 };

test.describe('Study screen garden (canvas + game socket)', () => {
    test('selecting an open plot offers the seeds in the inventory', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(richGarden),
        });
        await fakeGameServer(page, richGarden);
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await clickPlot(page, 0);
        await expect(page.getByTestId('plot-panel')).toContainText('Plot 1');
        await expect(page.getByTestId('btn-plant-camphor_tree')).toBeVisible();
    });

    test('plants a seed, waters it, and the socket receives each action', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(richGarden),
        });
        const server = await fakeGameServer(page, richGarden);
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(page.getByText('Dew 10')).toBeVisible();

        await clickPlot(page, 0);
        await page.getByTestId('btn-plant-camphor_tree').click();
        await expect(page.getByTestId('btn-water-tree')).toBeVisible();
        await page.getByTestId('btn-water-tree').click();

        await expect
            .poll(() => server.received.map((a) => a.action))
            .toEqual(['plant', 'water']);
        expect(server.received[0]).toMatchObject({
            species: 'camphor_tree',
            plotIndex: 0,
        });
        expect(server.received[1].treeId).toBeTruthy();
        await expect(page.getByText('Dew 5')).toBeVisible();
    });

    test('unlocking a locked plot spends coins', async ({ page, mock }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(richGarden),
        });
        const server = await fakeGameServer(page, richGarden);
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();

        await clickPlot(page, 3);
        await expect(page.getByTestId('btn-unlock-plot')).toContainText(
            'Unlock for 50 coins'
        );
        await page.getByTestId('btn-unlock-plot').click();

        await expect
            .poll(() => server.received)
            .toMatchObject([{ action: 'unlock', plotIndex: 3 }]);
        await expect(page.getByText('Coins 50')).toBeVisible();
    });

    test('a blooming tree can be harvested for a seed pouch', async ({
        page,
        mock,
    }) => {
        const blooming: FakeGarden = {
            ...richGarden,
            plantedTrees: [
                {
                    id: 'tree-9',
                    plotIndex: 1,
                    species: 'camphor_tree',
                    stage: 'blooming',
                    waterLevel: 80,
                    growthProgress: 10,
                    plantedAt: '2026-01-01T00:00:00Z',
                    totalWaters: 4,
                },
            ],
        };
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(blooming),
        });
        const server = await fakeGameServer(page, blooming);
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();

        await clickPlot(page, 1);
        await page.getByTestId('btn-harvest-tree').click();
        await expect
            .poll(() => server.received)
            .toMatchObject([{ action: 'harvest', treeId: 'tree-9' }]);
        await expect(page.getByTestId('btn-harvest-tree')).toHaveCount(0);
    });

    test('a young tree has no harvest button', async ({ page, mock }) => {
        const young: FakeGarden = {
            ...richGarden,
            plantedTrees: [
                {
                    id: 'tree-2',
                    plotIndex: 0,
                    species: 'camphor_tree',
                    stage: 'sprout',
                    waterLevel: 50,
                    growthProgress: 0,
                    plantedAt: '2026-01-01T00:00:00Z',
                    totalWaters: 0,
                },
            ],
        };
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(young),
        });
        await fakeGameServer(page, young);
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await clickPlot(page, 0);
        await expect(page.getByTestId('btn-water-tree')).toBeVisible();
        await expect(page.getByTestId('btn-harvest-tree')).toHaveCount(0);
    });

    test('a rejected action rolls the garden back and shows the reason', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope(richGarden),
        });
        await fakeGameServer(
            page,
            richGarden,
            'This land plot is still locked'
        );
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();

        await clickPlot(page, 0);
        await page.getByTestId('btn-plant-camphor_tree').click();
        await expect(
            page.getByText('This land plot is still locked')
        ).toBeVisible();
        await expect(page.getByTestId('btn-plant-camphor_tree')).toBeVisible();
    });
});
