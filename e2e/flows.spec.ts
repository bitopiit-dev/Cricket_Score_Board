import { expect, test, type Page } from '@playwright/test';
import { open, prefs } from './helpers';

test.beforeEach(({ page }) => prefs(page, {}));

test('tab bar moves between sections and back works', async ({ page }) => {
  await open(page, 'home');
  const nav = page.locator('nav:visible');
  await nav.getByRole('link', { name: 'সূচি' }).click();
  await expect(page).toHaveURL(/#\/fixtures/);
  await expect(page.getByRole('heading', { level: 1, name: 'সূচি' })).toBeVisible();
  await nav.getByRole('link', { name: 'পয়েন্ট' }).click();
  await expect(page).toHaveURL(/#\/points/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/fixtures/);
});

/** A theme option on the More tab: the label people tap (the radio inside is visually hidden). */
const themeOption = (page: Page, name: string) =>
  page.locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) });

test('sunlight mode switches the theme and is remembered', async ({ page }) => {
  await open(page, 'more');
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('radio', { name: 'ডার্ক' })).toBeChecked();
  // The radio itself is visually hidden; people tap its label
  await themeOption(page, 'রোদ').click();
  await expect(page.getByRole('radio', { name: 'রোদ' })).toBeChecked();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(html).not.toHaveClass(/dark/);
});

test('neon mode is dark with the neon look, and is remembered', async ({ page }) => {
  await open(page, 'more');
  const html = page.locator('html');
  await themeOption(page, 'নিয়ন').click();
  await expect(page.getByRole('radio', { name: 'নিয়ন' })).toBeChecked();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\bneon\b/);
  await page.reload();
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(html).toHaveClass(/\bneon\b/);
  // Back to dark takes the neon look away
  await themeOption(page, 'ডার্ক').click();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).not.toHaveClass(/\bneon\b/);
});

test('favourite team shows on Home, Points and Teams', async ({ page }) => {
  await open(page, 'team/ddc');
  const button = page.getByRole('button', { name: 'DDC প্রিয় দল করুন' });
  await button.click();
  await expect(page.getByRole('button', { name: 'DDC আর প্রিয় দল নয়' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await open(page, 'home');
  await expect(page.getByRole('link', { name: /আপনার দল: DDC/ })).toBeVisible();
  await open(page, 'points');
  await expect(page.getByRole('row', { name: /DDC.*আপনার প্রিয় দল/ })).toBeVisible();
  await open(page, 'teams');
  await expect(page.getByRole('link', { name: /DDC.*আপনার প্রিয় দল/ })).toBeVisible();
});

test('points table ranks nobody before the first match', async ({ page }) => {
  await open(page, 'points');
  await expect(page.getByText('এখনো কোনো ম্যাচ হয়নি').first()).toBeVisible();
  await expect(page.locator('tbody tr td:first-child').first()).toHaveText('–');
});

test('fixture filters change the list', async ({ page }) => {
  await open(page, 'fixtures');
  const groupA = page.getByRole('button', { name: 'গ্রুপ A', exact: true });
  await groupA.click();
  await expect(groupA).toHaveAttribute('aria-pressed', 'true');
  const days = page.locator('section[id^="day-"]');
  await expect(days.first()).toBeVisible();
  await expect(days.locator('li').filter({ hasText: 'গ্রুপ B' })).toHaveCount(0);
  await expect(days.locator('li').filter({ hasText: 'গ্রুপ A' }).first()).toBeVisible();
});

test('link preview tags are present', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /og-share\.jpg$/,
  );
  const res = await page.request.get('images/og-share.jpg');
  expect(res.ok()).toBe(true);
});

test('a two-match day shows both countdowns in turn', async ({ page }) => {
  await open(page, 'home');
  const dots = page.getByRole('button', { name: /^ম্যাচ .+ দেখুন$/ });
  // Only on days with two matches still to start (not, say, the final)
  test.skip((await dots.count()) < 2, 'next match day has a single match');
  await dots.nth(1).click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByText('এরপর', { exact: true })).toBeVisible();
  // Tapping a dot stops the automatic turn; the button offers to start it again
  await expect(page.getByRole('button', { name: 'স্লাইড আবার চালু করুন' })).toBeVisible();
  // Keyboard users switch with the arrow keys
  await page.getByLabel('দিনের ম্যাচগুলো, বাম-ডান তীর দিয়ে বদলান').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
});

test('new match: picking a match number fills in both teams', async ({ page }) => {
  await open(page, 'new');
  const matchNo = page.getByLabel('ম্যাচ নম্বর');
  const team1 = page.getByLabel('দল ১-এর নাম');
  const team2 = page.getByLabel('দল ২-এর নাম');
  await matchNo.selectOption({ label: await optionLabel(matchNo, 'ম্যাচ ১০ ') });
  await expect(team1.locator('option:checked')).toHaveText('Quality Flying Fighter');
  await expect(team2.locator('option:checked')).toHaveText('Power House X1');
  // Fixture teams are locked until the scorer chooses to edit them
  await expect(team1).toBeDisabled();
  await matchNo.selectOption({ label: await optionLabel(matchNo, 'ম্যাচ ১ ') });
  await expect(team1.locator('option:checked')).toHaveText('Red Bulls Warriors');
  await expect(team2.locator('option:checked')).toHaveText('Rainbow Cutting');
});

/** The full text of the first option starting with `prefix`. */
async function optionLabel(select: import('@playwright/test').Locator, prefix: string) {
  return select.evaluate(
    (s: HTMLSelectElement, p) => [...s.options].find((o) => o.text.startsWith(p))!.text,
    prefix,
  );
}

test('announcements are one line until opened, and stay closed once closed', async ({ page }) => {
  await open(page, 'home');
  const toggle = page
    .getByRole('region', { name: 'ঘোষণা' })
    .getByRole('button', { expanded: false });
  // Each announcement has a last day; nothing to test once they have all expired
  test.skip((await toggle.count()) === 0, 'no announcement is current');
  const notice = page.getByRole('region', { name: 'ঘোষণা' }).first();
  const details = notice.locator('[id^="notice-"]');
  await expect(details).toBeHidden();
  await notice.getByRole('button', { expanded: false }).click();
  await expect(details).toBeVisible();
  const before = await page.getByRole('region', { name: 'ঘোষণা' }).count();
  await notice.getByRole('button', { name: 'ঘোষণাটা বন্ধ করুন' }).click();
  await expect(page.getByRole('region', { name: 'ঘোষণা' })).toHaveCount(before - 1);
  await page.reload();
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(page.getByRole('region', { name: 'ঘোষণা' })).toHaveCount(before - 1);
});
