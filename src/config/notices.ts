import type { LocalText } from '../data/rules';

/**
 * Announcements shown at the top of Home and Live. Each one disappears after
 * its last day (Bangladesh date) and can be closed by the reader.
 * To add one: give it a new id, the text in both languages and a last day.
 */
export interface Notice {
  id: string;
  /** Last day it is shown, YYYY-MM-DD (Asia/Dhaka). */
  until: string;
  title: LocalText;
  body: LocalText;
  /** Optional link inside the app, e.g. '/fixtures'. */
  link?: { to: string; label: LocalText };
  /** Pages it appears on; both Home and Live when left out. */
  pages?: ('home' | 'live')[];
  /** Not shown inside the installed app (it would be telling people to install it). */
  hideWhenInstalled?: boolean;
  /** Emoji before the title; 📢 when left out. */
  icon?: string;
}

export const NOTICES: Notice[] = [
  {
    id: 'new-fixture-2026-11-17',
    until: '2026-11-19',
    title: {
      bn: 'নতুন সূচি: উদ্বোধন ১৭ নভেম্বর',
      en: 'New schedule: opening on 17 November',
    },
    body: {
      bn: 'টুর্নামেন্ট শুরু মঙ্গলবার, ১৭ নভেম্বর ২০২৬। প্রতিদিন দুটো ম্যাচ, দুপুর ১২টা আর ১টায়; শুক্রবার, ৩০ নভেম্বর, ১ ও ১৬ ডিসেম্বর খেলা নেই। Sky Warrior এখন গ্রুপ A-তে, Rainbow Cutting গ্রুপ B-তে। ফাইনাল শনিবার, ১৯ ডিসেম্বর।',
      en: 'The tournament starts on Tuesday 17 November 2026. Two matches a day, at 12:00 PM and 1:00 PM; no matches on Fridays, 30 November, 1 or 16 December. Sky Warrior is now in Group A and Rainbow Cutting in Group B. The final is on Saturday 19 December.',
    },
    link: { to: '/fixtures', label: { bn: 'নতুন সূচি দেখুন', en: 'See the new schedule' } },
  },
  {
    id: 'install-app-2026-11',
    until: '2026-12-19',
    // Home already has the install card with a one-tap Install button
    pages: ['live'],
    hideWhenInstalled: true,
    icon: '📲',
    title: {
      bn: 'অ্যাপটা ফোনে রেখে দিন',
      en: 'Keep the app on your phone',
    },
    body: {
      bn: 'ফোনে লিংকটা খুলে “Add to Home Screen” বা “Install” চাপলে অ্যাপের মতো আইকন তৈরি হবে। তখন প্রতিবার লিংক খুঁজতে হবে না।',
      en: 'Open the link on your phone and tap “Add to Home Screen” or “Install” to get an app icon. Then you won’t have to look for the link every time.',
    },
  },
];

/** The notices to show on a page today, leaving out closed ones and, inside the installed app, install tips. */
export function noticesFor(
  page: 'home' | 'live',
  today: string,
  closed: readonly string[],
  installed: boolean,
  list: readonly Notice[] = NOTICES,
): Notice[] {
  return list.filter(
    (n) =>
      n.until >= today &&
      !closed.includes(n.id) &&
      (!n.pages || n.pages.includes(page)) &&
      !(n.hideWhenInstalled && installed),
  );
}
