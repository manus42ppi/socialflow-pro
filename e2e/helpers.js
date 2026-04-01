/**
 * Shared E2E helpers — demo login and common selectors.
 *
 * Problem: Clerk's <SignIn> loading spinner can block clicks.
 * Solution: Use force:true to click through any overlay, then wait for
 * the demo email rows to be visible before clicking them.
 */

export const DEMO_ADMIN  = { email: 'admin@demo.com',  name: 'Dietmar S.' };
export const DEMO_EDITOR = { email: 'editor@demo.com', name: 'Maria K.' };
export const DEMO_VIEWER = { email: 'viewer@demo.com', name: 'Lukas M.' };

/**
 * Log in via the one-click demo panel.
 * Uses force:true to bypass Clerk's loading overlay.
 */
export async function demoLogin(page, user = DEMO_ADMIN) {
  // Wait for the SocialFlow page to render at all
  await page.waitForSelector('text=SocialFlow', { timeout: 20_000 });

  // Click the demo toggle — force through any Clerk overlay
  await page.locator('text=DEMO-ZUGÄNGE').click({ force: true, timeout: 20_000 });

  // Wait for the email rows to appear, then click
  await page.locator(`text=${user.email}`).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator(`text=${user.email}`).first().click();

  // Wait for the app shell to load
  await page.waitForSelector('text=Dashboard', { timeout: 10_000 });
}
