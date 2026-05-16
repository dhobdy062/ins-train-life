import { test, expect } from '@playwright/test';

test('programmatic sign-in', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/dashboard');
});
