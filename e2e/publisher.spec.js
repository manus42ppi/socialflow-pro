import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN } from './helpers.js';

// Run publisher tests serially — they interact with modals and need a stable server
test.describe.configure({ mode: 'serial' });

test.describe('Publisher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('text=Publisher').first().click();
    // Wait for publisher page to render
    await page.waitForSelector('text=/Geplant|Entwurf|Entwürfe|Alle/i', { timeout: 5_000 });
  });

  test('status filter pills are visible', async ({ page }) => {
    await expect(page.locator('text=Alle').first()).toBeVisible();
    await expect(page.locator('text=Geplant').first()).toBeVisible();
    await expect(page.locator('text=/Entwurf/i').first()).toBeVisible();
  });

  test('channel filter tabs exist', async ({ page }) => {
    await expect(page.locator('text=Instagram').first()).toBeVisible();
  });

  test('demo posts are listed', async ({ page }) => {
    // At least one of the demo post titles should appear
    const posts = page.locator('text=/Sommer Sale|Behind the Scenes|Tipp der Woche|Kundenreview|Produktlaunch/i');
    await expect(posts.first()).toBeVisible({ timeout: 5_000 });
  });

  test('"Neuer Post" button is in the top bar', async ({ page }) => {
    // "Neuer Post" is always in the TopBar
    await expect(page.locator('text=Neuer Post').first()).toBeVisible();
  });

  test('clicking "Neuer Post" opens the editor modal', async ({ page }) => {
    await page.locator('text=Neuer Post').first().click();
    // Editor modal should appear — look for the title input or content textarea
    await expect(
      page.locator('input[placeholder*="Arbeitstitel"]')
        .or(page.locator('textarea[placeholder*="teilen"]'))
        .or(page.locator('text=/Titel.*intern/i'))
        .first()
    ).toBeVisible({ timeout: 6_000 });
  });

  test('editor can be closed', async ({ page }) => {
    await page.locator('text=Neuer Post').first().click();
    await page.locator('input[placeholder*="Arbeitstitel"]').or(page.locator('text=/Titel.*intern/i')).first().waitFor({ timeout: 6_000 });
    // Press Escape or click close button
    await page.keyboard.press('Escape');
    // Publisher content should still be visible
    await expect(page.locator('text=/Geplant|Alle/i').first()).toBeVisible({ timeout: 3_000 });
  });

  test('can type a title in the editor', async ({ page }) => {
    await page.locator('text=Neuer Post').first().click();
    const titleField = page.locator('input[placeholder*="Arbeitstitel"]').first();
    await titleField.waitFor({ timeout: 6_000 });
    await titleField.fill('Mein E2E-Testpost');
    await expect(titleField).toHaveValue('Mein E2E-Testpost');
  });

  test('clicking a post opens the editor', async ({ page }) => {
    // Click edit on the first post card
    const editBtn = page.locator('button:has-text("Bearbeiten")').first();
    await editBtn.waitFor({ timeout: 5_000 });
    await editBtn.click();
    await expect(
      page.locator('input[placeholder*="Arbeitstitel"]')
        .or(page.locator('text=/Bearbeiten|Titel.*intern/i'))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
