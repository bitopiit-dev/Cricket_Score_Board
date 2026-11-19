import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open, prefs } from './helpers';

/** Every page that opens without a login in the offline e2e build (admin needs one). */
const PAGES = [
  'home',
  'live',
  'fixtures',
  'points',
  'stats',
  'teams',
  'team/ddc',
  'more',
  'rules',
  'committee',
  'awards',
  'media',
  'alerts',
  'new',
];

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme === 'light' ? 'sunlight' : 'dark'} theme`, () => {
    test.beforeEach(({ page }) => prefs(page, { theme }));

    for (const path of PAGES) {
      test(`${path}: opens cleanly and passes WCAG 2 AA checks`, async ({ page }) => {
        const errors = await open(page, path);
        expect(errors, 'script errors').toEqual([]);
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        ).toEqual([]);
      });
    }
  });
}

test.describe('small phone (320px)', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const path of PAGES) {
    test(`${path}: nothing scrolls sideways`, async ({ page }) => {
      await open(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
