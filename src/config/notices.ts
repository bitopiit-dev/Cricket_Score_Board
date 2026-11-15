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
}

export const NOTICES: Notice[] = [
  {
    id: 'opening-moved-2026-11-18',
    until: '2026-11-18',
    title: {
      bn: 'উদ্বোধন পিছিয়েছে: ১৮ নভেম্বর',
      en: 'Opening moved to 18 November',
    },
    body: {
      bn: 'অনিবার্য কারণে টুর্নামেন্টের উদ্বোধন ১৬ নভেম্বরের বদলে বুধবার, ১৮ নভেম্বর ২০২৬ হবে। প্রতিটা ম্যাচ দুই খেলার দিন পিছিয়েছে; শুক্রবার আর ছুটির দিনে খেলা নেই, ফাইনাল ২১ ডিসেম্বর।',
      en: 'Due to unforeseen circumstances, the tournament opens on Wednesday 18 November 2026 instead of 16 November. Every match moves two playing days later (still no matches on Fridays or holidays); the final is on 21 December.',
    },
    link: { to: '/fixtures', label: { bn: 'নতুন সূচি দেখুন', en: 'See the new schedule' } },
  },
];
