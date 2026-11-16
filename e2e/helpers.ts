import { expect, type Page } from '@playwright/test';

/**
 * Starting preferences, as the app's store writes them. Only written on the
 * first load of a test, so a reload keeps whatever the test changed since.
 */
export function prefs(page: Page, state: Record<string, unknown>) {
  return page.addInitScript((s) => {
    if (localStorage.getItem('csb-prefs')) return;
    localStorage.setItem(
      'csb-prefs',
      JSON.stringify({
        state: { lang: 'bn', bengaliDigits: true, theme: 'system', ...s },
        version: 0,
      }),
    );
  }, state);
}

/** Opens a page and waits until it has finished loading. Returns the script errors seen. */
export async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`#/${path}`);
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  return errors;
}
