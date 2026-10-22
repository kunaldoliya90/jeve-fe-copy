import { expect, test } from '@playwright/test';

/**
 * Smoke coverage: the app boots, guards unauthenticated access, and signs a
 * user in through the UI against the MSW mock backend.
 */
test.describe('application shell', () => {
  test('redirects an anonymous visitor to the login screen', async ({ page }) => {
    await page.goto('/app/dashboard');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('signs in and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test.user@example.com');
    await page.getByLabel(/password/i).fill('correct-horse');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows a 404 page for an unknown route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
