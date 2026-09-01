import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const api = 'http://localhost:3001';

async function mockPublicApi(page) {
  await page.route(`${api}/student/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/getProfile')) return route.fulfill({ status: 401, json: { success: false, msg: 'Sign in required' } });
    if (path.endsWith('/getDashboard')) return route.fulfill({ json: {
      success: true, settings: {}, events: [{ _id: '64b000000000000000000001', title: 'Design recruitment', eventType: 'recruitment', shortDescription: 'Build thoughtful products with the design club.', status: 'published', registrationDeadlineAt: '2030-09-12T18:29:59.000Z', clubId: { _id: '64b000000000000000000010', name: 'Design Studio', category: 'technical' }, verticals: [] }], sessions: [{ _id: '64b000000000000000000002', title: 'Meet the team', shortDescription: 'An introduction to the club.', date: '2030-09-10', time: '18:00', duration: '60', status: 'published', venue: 'LHC', clubId: { _id: '64b000000000000000000010', name: 'Design Studio' } }],
    } });
    return route.fulfill({ status: 404, json: { success: false, msg: 'Not mocked' } });
  });
}

test('student discovery page has no serious accessibility violations', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find your place/i })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});

test('student navigation remains usable at phone width', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Student navigation' })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
});
