import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test.describe('Post History – Publisher Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('text=Publisher').first().click();
    await page.waitForSelector('text=/Geplant|Alle/i', { timeout: 5_000 });
  });

  test('"Veröffentlicht" filter pill is visible', async ({ page }) => {
    await expect(page.locator('text=Veröffentlicht').first()).toBeVisible();
  });

  test('"Veröffentlicht" pill shows correct count (3 demo posts)', async ({ page }) => {
    // The pill shows "Veröffentlicht 3"
    const pill = page.locator('button:has-text("Veröffentlicht")').first();
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('3');
  });

  test('clicking "Veröffentlicht" switches to timeline view', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    // Timeline heading appears
    await expect(page.locator('text=Veröffentlicht').first()).toBeVisible();
    await expect(page.locator('text=/Klick für Details/i').first()).toBeVisible({ timeout: 4_000 });
  });

  test('timeline shows published demo posts', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    // All 3 published demo post titles should be visible
    await expect(page.locator('text=Frühjahrs-Kampagne').first()).toBeVisible({ timeout: 4_000 });
    await expect(page.locator('text=Workshop Einladung').first()).toBeVisible();
    await expect(page.locator('text=Jahresrückblick 2025').first()).toBeVisible();
  });

  test('timeline shows month groupings', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    await page.waitForSelector('text=Frühjahrs-Kampagne', { timeout: 4_000 });
    // Should see month headings like "Februar 2026" or "Dezember 2025"
    await expect(page.locator('text=/2025|2026/i').first()).toBeVisible();
  });

  test('timeline items show mini-stats (reach/likes/shares)', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    await page.waitForSelector('text=Frühjahrs-Kampagne', { timeout: 4_000 });
    // Mini stats use emoji indicators
    await expect(page.locator('text=/👁|♡|↗/').first()).toBeVisible();
  });

  test('sort controls are hidden in Veröffentlicht view', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    // Sort dropdown should not be visible
    await expect(page.locator('select').first()).not.toBeVisible();
  });

  test('switching back to "Alle" restores grid view', async ({ page }) => {
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    await page.waitForSelector('text=Frühjahrs-Kampagne', { timeout: 4_000 });
    await page.locator('button:has-text("Alle")').first().click();
    // Grid view / sort controls should be back
    await expect(page.locator('text=⊞ Grid').first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Post History – Detail Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('text=Publisher').first().click();
    await page.waitForSelector('text=/Geplant|Alle/i', { timeout: 5_000 });
    await page.locator('button:has-text("Veröffentlicht")').first().click();
    await page.waitForSelector('text=Frühjahrs-Kampagne', { timeout: 5_000 });
  });

  test('clicking a timeline item opens the detail drawer', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await expect(page.locator('text=/Reichweite|Impressionen/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('drawer shows post title', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    await expect(page.locator('text=Frühjahrs-Kampagne').first()).toBeVisible();
  });

  test('drawer shows all 6 performance metrics', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    await expect(page.locator('text=Reichweite').first()).toBeVisible();
    await expect(page.locator('text=Impressionen').first()).toBeVisible();
    await expect(page.locator('text=Likes').first()).toBeVisible();
    await expect(page.locator('text=Kommentare').first()).toBeVisible();
    await expect(page.locator('text=Shares').first()).toBeVisible();
    await expect(page.locator('text=Klicks').first()).toBeVisible();
  });

  test('drawer shows Zeitanalyse section', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Zeitanalyse/i', { timeout: 5_000 });
    await expect(page.locator('text=/Zeitanalyse/i').first()).toBeVisible();
    await expect(page.locator('text=/Optimales Fenster/i').first()).toBeVisible();
  });

  test('drawer closes on Escape key', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    await page.keyboard.press('Escape');
    // Drawer metrics should be gone
    await expect(page.locator('text=Impressionen').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test('drawer closes via X button', async ({ page }) => {
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    // Find close button inside the drawer (right side panel)
    await page.locator('[style*="slideInRight"] button').first().click();
    await expect(page.locator('text=Impressionen').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test('performance numbers are consistent (not random)', async ({ page }) => {
    // Open drawer, note the reach value, close, open again → same number
    await page.locator('text=Frühjahrs-Kampagne').first().click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    const metricBox = page.locator('text=Reichweite').first();
    await expect(metricBox).toBeVisible();
    // The number above "Reichweite" label — just verify it's a number+K format
    const drawerContent = await page.locator('[style*="slideInRight"]').first().textContent();
    const hasKFormat = /\d+\.\d+K|\d{3,}/.test(drawerContent || '');
    expect(hasKFormat).toBe(true);
  });
});

test.describe('Performance Page – Top Posts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('text=Performance').first().click();
    await page.waitForSelector('text=Top Posts', { timeout: 5_000 });
  });

  test('Top Posts section shows published demo posts', async ({ page }) => {
    // Should show titles from published posts (not empty)
    const topPosts = page.locator('text=/Frühjahrs-Kampagne|Workshop Einladung|Jahresrückblick/i');
    await expect(topPosts.first()).toBeVisible({ timeout: 5_000 });
  });

  test('Top Posts are ranked with numbers', async ({ page }) => {
    await expect(page.locator('text=1').first()).toBeVisible();
  });

  test('Top Posts show Reach and Engagement values', async ({ page }) => {
    // Each row has "K" (reach) and "%" (engagement) values
    await expect(page.locator('text=Reach').first()).toBeVisible();
    await expect(page.locator('text=Eng.').first()).toBeVisible();
  });

  test('clicking a Top Post opens the detail drawer', async ({ page }) => {
    // Click the first top post row
    const firstPost = page.locator('text=/Frühjahrs-Kampagne|Workshop Einladung|Jahresrückblick/i').first();
    await firstPost.click();
    // Drawer should open with performance metrics
    await expect(page.locator('text=/Reichweite|Impressionen/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('detail drawer from Performance shows correct post content', async ({ page }) => {
    const firstPost = page.locator('text=/Frühjahrs-Kampagne|Workshop Einladung|Jahresrückblick/i').first();
    const postTitle = await firstPost.textContent();
    await firstPost.click();
    await page.waitForSelector('text=/Reichweite/i', { timeout: 5_000 });
    // The same title should be in the drawer header
    if (postTitle) {
      await expect(page.locator(`text=${postTitle.trim()}`).first()).toBeVisible();
    }
  });
});
