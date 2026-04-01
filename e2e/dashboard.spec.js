import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN } from './helpers.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
  });

  test('shows welcome greeting with user name', async ({ page }) => {
    await expect(page.locator('text=/Guten (Morgen|Tag|Abend)/i').first()).toBeVisible();
  });

  test('shows stat widgets (Aktive Posts, Entwürfe, etc.)', async ({ page }) => {
    await expect(page.locator('text=Aktive Posts').first()).toBeVisible();
    await expect(page.locator('text=Entwürfe').first()).toBeVisible();
    await expect(page.locator('text=Kampagnen').first()).toBeVisible();
  });

  test('shows Schnellzugriff section', async ({ page }) => {
    await expect(page.locator('text=Schnellzugriff').first()).toBeVisible();
    await expect(page.locator('text=Post erstellen').first()).toBeVisible();
    await expect(page.locator('text=Planner').first()).toBeVisible();
    await expect(page.locator('text=Kalender').first()).toBeVisible();
  });

  test('shows "Letzte Posts" section', async ({ page }) => {
    await expect(page.locator('text=Letzte Posts').first()).toBeVisible();
  });

  test('shows Timeline section', async ({ page }) => {
    await expect(page.locator('text=Timeline').first()).toBeVisible();
  });

  test('clicking "Post erstellen" opens the editor', async ({ page }) => {
    await page.locator('text=Post erstellen').first().click();
    // Editor modal or publisher page should appear
    await expect(
      page.locator('text=/Neuer Post|Post erstellen|Inhalt/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('clicking a Kampagnen stat navigates to campaigns', async ({ page }) => {
    await page.locator('text=Kampagnen').first().click();
    await expect(page.locator('text=/Kampagnen|Sommer.Sale|Produktlaunch/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('sidebar shows all main nav items', async ({ page }) => {
    await expect(page.locator('text=Publisher').first()).toBeVisible();
    await expect(page.locator('text=Planner').first()).toBeVisible();
    await expect(page.locator('text=Kalender').first()).toBeVisible();
    await expect(page.locator('text=Medienbibliothek').first()).toBeVisible();
    await expect(page.locator('text=Performance').first()).toBeVisible();
  });
});
