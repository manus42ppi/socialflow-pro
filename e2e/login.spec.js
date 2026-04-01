import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN, DEMO_EDITOR, DEMO_VIEWER } from './helpers.js';

test.describe('Demo Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('login page shows SocialFlow branding', async ({ page }) => {
    await expect(page.locator('text=SocialFlow').first()).toBeVisible({ timeout: 10_000 });
  });

  test('demo credentials panel is expandable', async ({ page }) => {
    const toggle = page.locator('button:has-text("DEMO"), button:has-text("Demo")').first();
    await toggle.waitFor({ state: 'visible', timeout: 15_000 });
    await toggle.click();
    await expect(page.locator('text=admin@demo.com').first()).toBeVisible();
  });

  test('admin can log in and sees Dashboard', async ({ page }) => {
    await demoLogin(page, DEMO_ADMIN);
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('user name appears after login', async ({ page }) => {
    await demoLogin(page, DEMO_ADMIN);
    await expect(page.locator(`text=${DEMO_ADMIN.name}`).first()).toBeVisible();
  });

  test('editor can log in', async ({ page }) => {
    await demoLogin(page, DEMO_EDITOR);
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_EDITOR.name}`).first()).toBeVisible();
  });

  test('viewer can log in', async ({ page }) => {
    await demoLogin(page, DEMO_VIEWER);
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_VIEWER.name}`).first()).toBeVisible();
  });

  test('all three demo accounts are shown in the panel', async ({ page }) => {
    const toggle = page.locator('button:has-text("DEMO"), button:has-text("Demo")').first();
    await toggle.waitFor({ state: 'visible', timeout: 15_000 });
    await toggle.click();
    await expect(page.locator('text=admin@demo.com')).toBeVisible();
    await expect(page.locator('text=editor@demo.com')).toBeVisible();
    await expect(page.locator('text=viewer@demo.com')).toBeVisible();
  });
});
