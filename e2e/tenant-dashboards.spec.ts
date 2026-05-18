import { test, expect } from '@playwright/test';
import '@clerk/testing/playwright';
import { setupProUser } from './setup/personas';

test.beforeAll(async () => {
  await setupProUser();
});

test.describe('Tenant Isolation - Dashboard E2E Tests', () => {
  test('should show trainer dashboard for pro user', async ({ page, clerk }) => {
    await clerk.signIn({ emailAddress: 'don+clerk_pro_user@retrospxt.com', password: 'ComplexPassword123!' });
    await page.goto('/dashboard/trainer');
    await expect(page.locator('h1')).toContainText('Trainer Dashboard');
  });

  test('should show trainee dashboard with personal data only', async ({ page }) => {
    await page.goto('/dashboard/trainee');

    // Verify trainee sees only their personal data
    await expect(page.locator('h1')).toContainText('Trainee Dashboard');
    await expect(page.locator('[data-testid="personal-stats"]')).toBeVisible();

    // Ensure no org-level data visible to trainee
    await expect(page.locator('[data-testid="org-scoped-data"]')).not.toBeVisible();
  });

  test('should redirect unauthorized users', async ({ page }) => {
    await page.goto('/dashboard/trainer', { waitUntil: 'networkidle' });

    // Should redirect to login or show auth error
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should handle multi-org switching correctly', async ({ page }) => {
    await page.goto('/dashboard/trainer');

    // Switch orgs and verify data isolation
    await page.click('[data-testid="org-switcher"]');
    await page.click('text=OrgB');

    // Verify only OrgB data is shown
    await expect(page.locator('[data-testid="org-b-data"]')).toBeVisible();
    await expect(page.locator('[data-testid="org-a-data"]')).not.toBeVisible();
  });
});
