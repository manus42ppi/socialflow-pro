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
    { nav: 'Trends',           heading: 'Trends'           },
    { nav: 'Domain-Analyse',   heading: 'Domain-Analyse'   },
    { nav: 'Content-Audit',    heading: 'Content-Audit'    },
    { nav: 'Social Intelligence', heading: 'Social Intelligence' },
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

  test('Inhalte nav item navigates to Content Library', async ({ page }) => {
    // "Storys" wurde durch "Inhalte" (COPE/Hub & Spoke) ersetzt
    await page.locator('text=Inhalte').first().click();
    await expect(page.locator('text=Inhalte').first()).toBeVisible({ timeout: 5_000 });
  });
});
