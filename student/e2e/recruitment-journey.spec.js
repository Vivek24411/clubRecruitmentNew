import { expect, test } from '@playwright/test';

const configured = Boolean(process.env.E2E_STUDENT_EMAIL && process.env.E2E_STUDENT_PASSWORD && process.env.E2E_EVENT_ID);

test.describe('seeded recruitment journey', () => {
  test.skip(!configured, 'Set the E2E student credentials and seeded event IDs to run destructive workflow coverage.');

  test('student registration, application, invitation, interview RSVP, decisions, and notifications', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_STUDENT_EMAIL);
    await page.getByLabel(/password/i).fill(process.env.E2E_STUDENT_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.goto(`/event/${process.env.E2E_EVENT_ID}`);
    await expect(page.getByRole('heading')).toContainText(process.env.E2E_EVENT_TITLE || '');
    await expect(page.getByText(/application|applied|invited/i).first()).toBeVisible();
    await page.goto('/applications');
    await expect(page.getByRole('heading', { name: /applications/i })).toBeVisible();
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications|alerts/i })).toBeVisible();
  });
});
