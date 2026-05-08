import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN, DEMO_EDITOR, DEMO_VIEWER } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test.describe('Settings – Role Badge', () => {
  test('admin sees role badge "ADMIN" in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await expect(page.locator('text=ADMIN').first()).toBeVisible();
  });

  test('editor sees role badge "Editor" in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_EDITOR);
    await expect(page.locator('text=Editor').first()).toBeVisible();
  });

  test('viewer sees role badge "Betrachter" in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_VIEWER);
    await expect(page.locator('text=Betrachter').first()).toBeVisible();
  });
});

test.describe('Settings – Sidebar Button', () => {
  test('admin sees "Admin" button in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await expect(page.locator('button:has-text("Admin")').first()).toBeVisible();
  });

  test('editor sees "Einstellungen" button in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_EDITOR);
    await expect(page.locator('button:has-text("Einstellungen")').first()).toBeVisible();
  });

  test('viewer sees "Einstellungen" button in sidebar', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_VIEWER);
    await expect(page.locator('button:has-text("Einstellungen")').first()).toBeVisible();
  });
});

test.describe('Settings – Tab visibility per role', () => {
  test('admin sees all tabs: Profil, Meine Kanäle, API-Keys, Team, Einstellungen', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await expect(page.locator('button:has-text("Profil")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Meine Kanäle")').first()).toBeVisible();
    await expect(page.locator('button:has-text("API-Keys")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Team")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Einstellungen")').first()).toBeVisible();
  });

  test('editor sees Profil, Meine Kanäle, API-Keys, Einstellungen — but NOT Team', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_EDITOR);
    await page.locator('button:has-text("Einstellungen")').first().click();
    await expect(page.locator('button:has-text("Profil")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Meine Kanäle")').first()).toBeVisible();
    await expect(page.locator('button:has-text("API-Keys")').first()).toBeVisible();
    // Team tab must NOT be visible for editors
    await expect(page.locator('button:has-text("Team")').first()).not.toBeVisible();
  });

  test('viewer sees Profil, Meine Kanäle, Einstellungen — but NOT Team and NOT API-Keys', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_VIEWER);
    await page.locator('button:has-text("Einstellungen")').first().click();
    await expect(page.locator('button:has-text("Profil")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Meine Kanäle")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Team")').first()).not.toBeVisible();
    await expect(page.locator('button:has-text("API-Keys")').first()).not.toBeVisible();
  });
});

test.describe('Settings – Kanäle / Account connection', () => {
  test('Meine Kanäle tab shows usage context selector', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    await expect(page.locator('text=/Content Creator|Unternehmen|Agentur/i').first()).toBeVisible();
  });

  test('Meine Kanäle tab shows all 5 platforms for admin', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    await expect(page.locator('text=Instagram').first()).toBeVisible();
    await expect(page.locator('text=X/Twitter').first()).toBeVisible();
    await expect(page.locator('text=LinkedIn').first()).toBeVisible();
    await expect(page.locator('text=Facebook').first()).toBeVisible();
    await expect(page.locator('text=WhatsApp').first()).toBeVisible();
  });

  test('admin sees Team-Accounts section', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    await expect(page.locator('text=/Team-Accounts/i').first()).toBeVisible();
  });

  test('editor does NOT see Team-Accounts section', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_EDITOR);
    await page.locator('button:has-text("Einstellungen")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    await expect(page.locator('text=/Team-Accounts/i').first()).not.toBeVisible();
  });

  test('clicking a platform card expands credential form', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    // Wait for Meine Accounts section, then click the first "Einrichten" badge to expand Instagram
    await page.locator('text=Meine Accounts').first().waitFor({ timeout: 5_000 });
    await page.locator('text=Einrichten').first().click();
    // Credential form should appear — look for the help link to Developer Portal
    await expect(page.locator('text=/Anleitung|Developer Portal/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('usage context can be switched', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
    await page.locator('button:has-text("Admin")').first().click();
    await page.locator('button:has-text("Meine Kanäle")').first().click();
    // Click "Unternehmen"
    await page.locator('text=Unternehmen').first().click();
    // It should still be visible (selection persisted visually)
    await expect(page.locator('text=Unternehmen').first()).toBeVisible();
  });
});

test.describe('Settings – Profil tab', () => {
  test('editor can open Profil tab and see name field', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_EDITOR);
    await page.locator('button:has-text("Einstellungen")').first().click();
    await page.locator('button:has-text("Profil")').first().click();
    await expect(page.locator('text=/Persönliche Daten/i').first()).toBeVisible({ timeout: 4_000 });
  });

  test('admin Einstellungen tab does NOT show Workspace name to non-admins', async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_VIEWER);
    await page.locator('button:has-text("Einstellungen")').first().click();
    // Navigate to Einstellungen tab inside settings
    const settingsTab = page.locator('button:has-text("Einstellungen")');
    // The second one is the tab inside the page (first is sidebar button)
    await settingsTab.nth(1).click();
    // Workspace-Name field should NOT be shown to viewers
    await expect(page.locator('text=Workspace-Name').first()).not.toBeVisible();
    // But notifications should be shown
    await expect(page.locator('text=/Benachrichtigungen/i').first()).toBeVisible({ timeout: 4_000 });
  });
});
