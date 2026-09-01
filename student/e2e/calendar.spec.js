import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const api = 'http://localhost:3001';
const student = { _id: '64b000000000000000000099', name: 'Aarav Student', email: 'aarav@iitr.ac.in' };

test.beforeEach(async ({ page }) => {
  await page.route(`${api}/student/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/getProfile')) return route.fulfill({ json: { success: true, student } });
    if (path.endsWith('/notifications/unread-count')) return route.fulfill({ json: { success: true, unreadCount: 0 } });
    if (path.endsWith('/push/registration')) return route.fulfill({ json: { success: true, enabled: false } });
    if (path.endsWith('/calendar')) return route.fulfill({ json: { success: true, range: { from: '2030-09-01T00:00:00.000Z', to: '2031-09-01T00:00:00.000Z' }, items: [{ id: 'interview:1', type: 'interview', title: 'Interview · Design recruitment', startsAt: '2030-09-08T12:30:00.000Z', endsAt: '2030-09-08T13:00:00.000Z', sourceType: 'event', sourceId: '64b000000000000000000001', link: '/event/64b000000000000000000001', clubName: 'Design Studio', venue: 'MAC' }] } });
    return route.fulfill({ json: { success: true } });
  });
});

test('calendar exposes important dates and export controls', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Discovr calendar' })).toBeVisible();
  await expect(page.getByText('1 upcoming calendar item')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export .ics' })).toBeEnabled();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
