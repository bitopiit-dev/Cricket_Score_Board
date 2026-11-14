import type { TFunction } from 'i18next';
import type { Fixture, Slot, StageId } from '../data/fixtures';
import { findTeam } from '../data/teams';
import type { Formatter } from './format';

/** "13:00" -> "দুপুর ১:০০" / "1:00 PM". */
export function formatTime(hhmm: string, lang: string, f: Formatter): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  const clock = `${h12}:${String(m).padStart(2, '0')}`;
  if (lang !== 'bn') return `${clock} ${h < 12 ? 'AM' : 'PM'}`;
  const period =
    h < 4
      ? 'রাত'
      : h < 6
        ? 'ভোর'
        : h < 12
          ? 'সকাল'
          : h < 15
            ? 'দুপুর'
            : h < 18
              ? 'বিকাল'
              : h < 20
                ? 'সন্ধ্যা'
                : 'রাত';
  return `${period} ${f.num(clock)}`;
}

/** "2026-11-16" -> "সোমবার, ১৬ নভেম্বর" / "Monday, 16 November". */
export function formatDate(
  date: string,
  lang: string,
  bengaliDigits: boolean,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  const locale = lang === 'bn' ? (bengaliDigits ? 'bn-BD' : 'bn-BD-u-nu-latn') : 'en-GB';
  // Noon UTC so the calendar day is the same everywhere
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function stageLabel(stage: StageId, t: TFunction): string {
  return t(`stage.${stage}`);
}

/** A fixture side: the team's name, or "Group A – 1st" while not decided. */
export function slotLabel(slot: Slot, resolved: string | null, t: TFunction, f: Formatter): string {
  if (resolved) return findTeam(resolved)?.name ?? resolved;
  switch (slot.kind) {
    case 'team':
      return findTeam(slot.teamId)?.name ?? slot.teamId;
    case 'groupPos':
      return t('slot.groupPos', { g: slot.group, pos: t(`slot.ord${slot.pos}`) });
    case 'superSixPos':
      return t('slot.superSixPos', { pos: t(`slot.ord${slot.pos}`) });
    case 'winnerOf':
      return t('slot.winnerOf', { n: f.num(slot.of === 'semi1' ? 1 : 2) });
  }
}

/** "ম্যাচ ৫ — HR Vikings বনাম DDC — দুপুর ১:০০" */
export function fixtureLabel(
  fx: Fixture,
  sides: [string | null, string | null],
  lang: string,
  t: TFunction,
  f: Formatter,
): string {
  return `${t('fixtures.matchNo', { n: f.num(fx.no) })} — ${slotLabel(fx.teamA, sides[0], t, f)} ${t(
    'common.vs',
  )} ${slotLabel(fx.teamB, sides[1], t, f)} — ${formatTime(fx.time, lang, f)}`;
}
