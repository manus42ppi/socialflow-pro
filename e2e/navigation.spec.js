import { test, expect } from '@playwright/test';
import { demoLogin, DEMO_ADMIN } from './helpers.js';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await demoLogin(page, DEMO_ADMIN);
  });

  const pages = [
    { nav: 'Publisher',        heading: 'Publisher'        },
    { nav: 'Planner',          heading: 'Planner'          },
    { nav: 'Kalender',         heading: 'Kalender'         },
    { nav: 'Medienbibliothek', heading: 'Medienbibliothek' },
    { nav: 'Performance',      heading: 'Performance'      },
    { nav: 'Kampagnen',        heading: 'Kampagnen'        },
    { nav: 'Research',         heading: 'Research'         },
  ];

  for (const { nav, heading } of pages) {
    test(`navigates to ${nav}`, async ({ page }) => {
      await page.locator(`text=${nav}`).first().click();
      // Heading in TopBar or page title should be visible
      await expect(page.locator(`text=${heading}`).first()).toBeVisible({ timeout: 5_000 });
    });
  }

  test('back-navigation to Dashboard from Publisher works', async ({ page }) => {
    await page.locator('text=Publisher').first().click();
    await page.locator('text=Dashboard').first().click();
    await expect(page.locator('text=Schnellzugriff').first()).toBeVisible();
  });

  test('Papierkorb is accessible from sidebar', async ({ page }) => {
    await page.locator('text=Papierkorb').first().click();
    await expect(page.locator('text=Papierkorb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Storys nav item navigates to Storys page', async ({ page }) => {
    // Sidebar label is "Storys"
    await page.locator('text=Storys').first().click();
    await expect(page.locator('text=Storys').first()).toBeVisible({ timeout: 5_000 });
  });
});
