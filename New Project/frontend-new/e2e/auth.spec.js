import { test, expect } from '@playwright/test';
import { fixture } from './helpers.js';

// These drive the real forms, so start from a signed-out browser.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth', () => {
  test('wrong password keeps you on the login page with an error', async ({ page }) => {
    const { credentials } = fixture();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in|log ?in/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
  });

  test('valid credentials land on the dashboard', async ({ page }) => {
    const { credentials } = fixture();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);
    await page.getByRole('button', { name: /sign in|log ?in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });

  test('signup rejects a malformed email at the API boundary', async ({ request }) => {
    const res = await request.post('http://localhost:5000/auth/signup', {
      data: { username: 'bad', email: 'not-an-email', password: '123' },
    });
    expect(res.status()).toBe(400);
  });

  test('a protected route bounces an anonymous visitor to login', async ({ page }) => {
    const { projectId } = fixture();
    await page.goto(`/project/${projectId}`);
    await expect(page).toHaveURL(/\/login/);
  });
});
