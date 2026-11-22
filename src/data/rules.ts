/**
 * BPL-2027 rules (35), in Bengali and English.
 * Source: docs/rules-bpl-2027.md. Kept as data so they can move to Supabase
 * and be edited by the admin later.
 */
export interface LocalText {
  bn: string;
  en: string;
}

export interface TournamentRuleText {
  /** Rule number as in the official list (1–35). */
  n: number;
  text: LocalText;
  /** True when the app enforces or calculates this rule. */
  inApp?: boolean;
}

export interface RuleSection {
  id: string;
  title: LocalText;
  rules: TournamentRuleText[];
}

export const RULES_ORGANISER: LocalText = {
  bn: 'বারিধি গার্মেন্টস লিঃ কর্তৃপক্ষ',
  en: 'Baridhi Garments Ltd. Authority',
};

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: 'match',
    title: { bn: 'ম্যাচ ও টুর্নামেন্ট', en: 'Match & Tournament' },
    rules: [
      {
        n: 1,
        text: {
          bn: 'খেলা ১২ ওভারে অনুষ্ঠিত হবে।',
          en: 'Each match will be played over 12 overs.',
        },
        inApp: true,
      },
      {
        n: 2,
        text: {
          bn: 'একজন বোলার সর্বোচ্চ ৩ ওভার বল করতে পারবে।',
          en: 'A bowler may bowl a maximum of 3 overs.',
        },
        inApp: true,
      },
      {
        n: 3,
        text: {
          bn: 'খেলা সম্পূর্ণ বিপিএল (বাংলাদেশ প্রিমিয়ার লিগ) পদ্ধতিতে হবে: ১২টি দল দুই গ্রুপে (A ও B, ৬টি করে) ভাগ হয়ে নিজ গ্রুপের প্রত্যেক দলের সাথে একটি করে ম্যাচ খেলবে। প্রতি গ্রুপের শীর্ষ ৩ দল সুপার সিক্সে উঠবে; সেখানে পয়েন্ট নতুন করে শুরু হবে এবং প্রত্যেক দল অন্য সব দলের সাথে একটি করে ম্যাচ খেলবে। সুপার সিক্সের শীর্ষ ৪ দল সেমিফাইনালে খেলবে (১ম বনাম ৪র্থ, ২য় বনাম ৩য়), আর দুই সেমিফাইনালের বিজয়ী ফাইনালে মুখোমুখি হবে।',
          en: 'The tournament follows the BPL (Bangladesh Premier League) style: the 12 teams are split into two groups (A and B, six each) and play every team in their group once. The top 3 of each group go to the Super Six, where points start again and each team plays every other team once. The top 4 of the Super Six play the semi-finals (1st v 4th, 2nd v 3rd), and the two semi-final winners meet in the final.',
        },
        inApp: true,
      },
      {
        n: 4,
        text: {
          bn: 'খেলা ড্র হলে ১ ওভার সুপার ওভারের খেলার মাধ্যমে খেলা নিষ্পত্তি হবে।',
          en: 'If a match is tied, it will be decided by a 1-over Super Over.',
        },
        inApp: true,
      },
      {
        n: 5,
        text: {
          bn: 'অনিবার্য কারণ বশতঃ খেলার সময়সূচী পরিবর্তন হতে পারে।',
          en: 'The schedule may change due to unavoidable circumstances.',
        },
      },
      {
        n: 6,
        text: {
          bn: 'খেলা পরিচালনা কমিটি খেলার সময়সূচী পরিবর্তন ও পরিবর্ধন করার ক্ষমতা রাখে।',
          en: 'The organising committee reserves the right to change or extend the schedule.',
        },
      },
      {
        n: 7,
        text: {
          bn: 'খেলা আরম্ভ হওয়ার ১০ মিনিট পূর্বে মাঠে হাজির থাকতে হবে।',
          en: 'Teams must be present at the ground 10 minutes before the match starts.',
        },
      },
      {
        n: 35,
        text: {
          bn: 'বৃষ্টি বা যে কোন প্রাকৃতিক কারণে কোন খেলা পরিত্যক্ত হলে উভয় দল ১ পয়েন্ট করে পাবে।',
          en: 'If a match is abandoned due to rain or any other natural cause, both teams will get 1 point each.',
        },
        inApp: true,
      },
    ],
  },
  {
    id: 'players',
    title: { bn: 'দল ও খেলোয়াড়', en: 'Teams & Players' },
    rules: [
      {
        n: 8,
        text: {
          bn: 'প্রত্যেক দলে ১১ জন (অতিরিক্ত ৩ জন) সহ ১৪ জন খেলোয়াড় থাকতে পারবে।',
          en: 'Each team may have 14 players: 11 plus 3 extras.',
        },
        inApp: true,
      },
      {
        n: 9,
        text: {
          bn: 'এক দলের খেলোয়াড় অন্য দলে খেলতে পারবেনা।',
          en: 'A player of one team cannot play for another team.',
        },
      },
      {
        n: 10,
        text: {
          bn: 'প্রথম খেলায় খেলোয়াড়দের যে লিস্ট দেওয়া হবে, সেটাই চূড়ান্ত লিস্ট হিসাবে গণ্য হবে। পরবর্তীতে সেই লিস্টের কোন পরিবর্তন করা যাবে না। তবে কেউ যদি রিজাইন দিয়ে চলে যায়, বা যে কোন কারণে চাকুরীচ্যুত হয় তাহলে তার পরিবর্তে অন্য একজন খেলতে পারবে। সেক্ষেত্রে তার জয়েন ডেট ডিসেম্বরের ০১ তারিখের পূর্বে হতে হবে।',
          en: 'The player list submitted for the first match is final and cannot be changed later. However, if a player resigns or leaves employment for any reason, another player may replace them, provided the replacement joined before 1 December.',
        },
      },
      {
        n: 11,
        text: {
          bn: 'প্রত্যেক দলকে অবশ্যই নিজ নিজ জার্সি পরিধান করে খেলতে হবে।',
          en: 'Every team must play in its own jersey.',
        },
      },
      {
        n: 12,
        text: {
          bn: 'প্রত্যেক দল নিজ নিজ ব্যাট দিয়ে খেলতে হবে।',
          en: 'Every team must play with its own bats.',
        },
      },
      {
        n: 13,
        text: {
          bn: 'বল ও টেপ খেলা পরিচালনা কমিটি বহন করবে।',
          en: 'Balls and tape will be provided by the organising committee.',
        },
      },
      {
        n: 14,
        text: {
          bn: '(কিপিং, ব্যাটিং ও ফিল্ডিং) এর সময় কোন প্রকার গ্লাভস ব্যবহার করা যাবে না।',
          en: 'No gloves of any kind may be used while keeping, batting or fielding.',
        },
      },
    ],
  },
  {
    id: 'bowling',
    title: { bn: 'বোলিং ও নো-বল', en: 'Bowling & No-balls' },
    rules: [
      {
        n: 15,
        text: {
          bn: 'তিন (৩) আঙ্গুলে বল করতে হবে।',
          en: 'The ball must be bowled with three (3) fingers.',
        },
      },
      {
        n: 16,
        text: {
          bn: 'বোলারের বল পিচে ড্রপ খেয়ে স্ট্যাম্পের উপরে উঠলে নো-বল হিসাবে গণ্য হবে।',
          en: 'If the ball bounces on the pitch and rises above stump height, it is a no-ball.',
        },
      },
      {
        n: 17,
        text: {
          bn: 'অতিরিক্ত ঝুঁকে বল করলেও নো-বল হিসাবে গণ্য হবে।',
          en: 'Bowling while leaning forward excessively is a no-ball.',
        },
      },
      {
        n: 18,
        text: {
          bn: 'বল সরাসরি (ফুলটস) হাঁটুর উপরে গেলে নো-বল হিসাবে গণ্য হবে।',
          en: 'A full toss above knee height is a no-ball.',
        },
      },
      {
        n: 19,
        text: {
          bn: 'জোরে বল করলেও নো বল হিসাবে গণ্য হবে।',
          en: 'Bowling fast is also a no-ball.',
        },
      },
      {
        n: 20,
        text: {
          bn: 'বোলারের বল সম্পর্কে ব্যাটসম্যান ছাড়া অন্য কারো অভিযোগ গ্রহণযোগ্য হবেনা।',
          en: "Only the batter may object to a bowler's delivery; complaints from anyone else will not be accepted.",
        },
      },
    ],
  },
  {
    id: 'batting',
    title: { bn: 'ব্যাটিং, রান ও আউট', en: 'Batting, Runs & Dismissals' },
    rules: [
      {
        n: 21,
        text: {
          bn: 'ওভার বাউন্ডারী হলে আউট বলে গণ্য হবে।',
          en: 'Hitting the ball over the boundary (a six) is out.',
        },
        inApp: true,
      },
      {
        n: 22,
        text: {
          bn: 'যে কোন ধরনের ক্যাচ আউট হলে পরবর্তী ব্যাটসম্যান স্ট্রাইক করবে।',
          en: 'After any catch dismissal, the incoming batter takes strike.',
        },
        inApp: true,
      },
      {
        n: 23,
        text: {
          bn: 'বল ডেলিভারীর আগে ব্যাটসম্যান পিচ ছেড়ে বের হতে পারবেনা। যদি বের হয় তাহলে বোলার স্টাম্প ভেঙ্গে দিলে তা রান আউট হিসাবে বিবেচিত হবে।',
          en: 'A batter may not leave the crease before the ball is delivered. If they do and the bowler breaks the stumps, it counts as run out.',
        },
      },
      {
        n: 24,
        text: {
          bn: 'সম্পূর্ণ খেলায় অতিরিক্ত রান (বাই রান) সিস্টেম থাকবে।',
          en: 'Extra runs (byes) apply throughout the match.',
        },
        inApp: true,
      },
      {
        n: 25,
        text: {
          bn: 'ব্যাটসম্যান রান নেওয়ার সময় ইচ্ছাকৃত বলে লাথি মারলে ৪ রান মোট রান থেকে বিয়োগ করা হবে।',
          en: 'If a batter deliberately kicks the ball while running, 4 runs are deducted from the team total.',
        },
        inApp: true,
      },
      {
        n: 26,
        text: {
          bn: 'প্রত্যেক দল একটি করে রিভিউ পাবে। রিভিউতে হারলে রিভিউ শেষ, আর রিভিউতে জিতলে রিভিউ থেকে যাবে।',
          en: 'Each team gets one review. An unsuccessful review is lost; a successful review is retained.',
        },
        inApp: true,
      },
    ],
  },
  {
    id: 'umpires',
    title: { bn: 'আম্পায়ার ও পুরস্কার', en: 'Umpires & Awards' },
    rules: [
      {
        n: 27,
        text: {
          bn: 'আম্পায়ারের সিদ্ধান্তই চূড়ান্ত বলে গণ্য হবে।',
          en: "The umpire's decision is final.",
        },
      },
      {
        n: 28,
        text: {
          bn: 'খেলা শেষ হওয়ার পর আম্পায়ারদের আলোচনার ভিত্তিতে ম্যান অফ দা ম্যাচ নির্বাচন করা হবে।',
          en: 'After each match, the Man of the Match will be selected by the umpires.',
        },
      },
      {
        n: 29,
        text: {
          bn: 'নক আউট পর্বে প্রত্যেক খেলায় সেরা খেলোয়াড়ের পুরস্কার দেওয়া হবে।',
          en: 'In the knockout stage, a best-player award will be given in every match.',
        },
      },
      {
        n: 30,
        text: {
          bn: 'শুধুমাত্র ফাইনাল খেলায় ম্যান অফ দা ম্যাচ পুরস্কার দেওয়া হবে। এছাড়াও ম্যান অফ দা সিরিজ ও সেরা উইকেট টেকারের পুরস্কার থাকবে।',
          en: 'A Man of the Match prize will be awarded only in the final. There will also be Man of the Series and Best Wicket-Taker awards.',
        },
        inApp: true,
      },
    ],
  },
  {
    id: 'conduct',
    title: { bn: 'আচরণ ও শৃঙ্খলা', en: 'Conduct & Discipline' },
    rules: [
      {
        n: 31,
        text: {
          bn: 'খেলা চলাকালীন সময়ে অথবা খেলা শেষ হওয়ার পর আম্পায়ার অথবা অন্য কারো বিরুদ্ধে কোন খেলোয়াড় কোন ধরনের বাজে মন্তব্য, হয়রানীমূলক বক্তব্য ইত্যাদি ব্যবহার করতে পারবে না এবং কোন ধরনের অসন্তোষ দেখানো যাবে না।',
          en: 'During or after a match, no player may make abusive or harassing remarks against the umpire or anyone else, or show any form of dissent.',
        },
      },
      {
        n: 32,
        text: {
          bn: 'আম্পায়ারের সাথে অসদাচরণের কারণে অথবা খেলায় বিশৃঙ্খলা সৃষ্টিকারীর জন্য কমিটির সিদ্ধান্তের ভিত্তিতে জরিমানা ও সাসপেন্ড সহ যে কোন সিদ্ধান্ত গ্রহণ করা হতে পারে।',
          en: 'For misconduct towards an umpire or causing disorder, the committee may impose any penalty, including fines and suspension.',
        },
      },
      {
        n: 33,
        text: {
          bn: 'কোন অভিযোগ থাকলে দলের প্রধানকে লিখিত ভাবে কমিটির নিকট স্পষ্ট ভাবে অভিযোগনামা জমা দিতে হবে।',
          en: 'Any complaint must be submitted clearly in writing to the committee by the team head.',
        },
      },
      {
        n: 34,
        text: {
          bn: 'কমিটি যে কোন সময় যে কোন সিদ্ধান্ত গ্রহণ, পরিবর্তন ও পরিমার্জন করার অধিকার বহন করবে।',
          en: 'The committee reserves the right to take, change or amend any decision at any time.',
        },
      },
    ],
  },
];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Lower-case, Bengali digits as ASCII, single spaces: for matching only. */
export function normalizeForSearch(s: string): string {
  return s
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sections with only the rules that match `query` (in either language, or
 * by rule number). Empty sections are dropped. An empty query returns all.
 */
export function searchRules(query: string, sections: RuleSection[] = RULE_SECTIONS): RuleSection[] {
  const q = normalizeForSearch(query);
  if (!q) return sections;
  const words = q.split(' ');
  return sections
    .map((s) => ({
      ...s,
      rules: s.rules.filter((r) => {
        if (/^\d+$/.test(q)) return r.n === Number(q);
        const hay = normalizeForSearch(`${r.text.bn} ${r.text.en}`);
        return words.every((w) => hay.includes(w));
      }),
    }))
    .filter((s) => s.rules.length > 0);
}
