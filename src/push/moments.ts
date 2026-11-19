import { deriveMatchState } from '../engine/scoring';
import type { InningsState, Match, MatchState } from '../engine/types';

/**
 * Push-notification moments: what changed between the copy of a match the
 * server had and the copy a scorer just uploaded.
 *
 * Pure TypeScript with no browser or Node imports, so the same file runs in the
 * unit tests and, bundled by `npm run build:functions`, in the Supabase Edge
 * Function `match-notify`.
 *
 * Each moment has a stable `key`, so a retry, a second scorer, or an undo and
 * re-entry of the same wicket never sends it twice (the server keeps sent keys
 * in `push_log`).
 */

export type Lang = 'bn' | 'en';

/** 'result' moments go to everyone; 'key' moments only to people who chose every key moment. */
export type MomentLevel = 'key' | 'result';

export type MomentKind =
  'start' | 'wicket' | 'fifty' | 'hundred' | 'inningsBreak' | 'superOver' | 'result';

export interface Moment {
  key: string;
  kind: MomentKind;
  level: MomentLevel;
  /** Time of the event that caused it (the scorer's clock, ms). */
  at: number;
  text: Record<Lang, { title: string; body: string }>;
}

/** Tournament team ids of the two sides (missing for a friendly with typed-in names). */
export function teamIdsOf(match: Match): string[] {
  return match.teams.map((t) => t.teamId).filter((id): id is string => !!id);
}

/** Moments caused by the events `next` has beyond what `prev` already had. */
export function momentsBetween(prev: Match | null, next: Match): Moment[] {
  const shared = sharedPrefix(prev?.events ?? [], next.events);
  const at = (n: number): MatchState =>
    deriveMatchState({ ...next, events: next.events.slice(0, n) });
  const out: Moment[] = [];
  let before = at(shared);
  for (let n = shared + 1; n <= next.events.length; n++) {
    const after = at(n);
    out.push(...diff(before, after, next, next.events[n - 1].at));
    before = after;
  }
  return out;
}

/**
 * What to actually send from one upload. A phone that was offline can upload
 * a whole over at once; fans want the latest news, not a burst of old alerts.
 * - Key moments older than `maxAgeMs` (by the server's clock) are dropped.
 * - Of the rest, only the newest key moment is kept.
 * - A result is always kept.
 */
export function momentsToSend(moments: Moment[], now: number, maxAgeMs = 30 * 60_000): Moment[] {
  const result = moments.filter((m) => m.kind === 'result');
  const fresh = moments.filter((m) => m.kind !== 'result' && now - m.at <= maxAgeMs);
  const latest = fresh.length ? [fresh[fresh.length - 1]] : [];
  return [...latest, ...result];
}

/* --------------------------------- internals -------------------------------- */

function sharedPrefix(a: Match['events'], b: Match['events']): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i].id === b[i].id) i++;
  return i;
}

function diff(before: MatchState, after: MatchState, match: Match, at: number): Moment[] {
  const out: Moment[] = [];
  const t = texts(match);

  if (before.innings.length === 0 && after.innings.length > 0) {
    out.push({ key: 'start', kind: 'start', level: 'key', at, text: t.start() });
  }

  after.innings.forEach((inn, i) => {
    if (inn.superOver) return;
    const old = before.innings[i];
    const oldWickets = old?.fallOfWickets.length ?? 0;
    for (const fow of inn.fallOfWickets.slice(oldWickets)) {
      out.push({
        key: `w:${i}:${fow.wicketNumber}`,
        kind: 'wicket',
        level: 'key',
        at,
        text: t.wicket(inn, fow.batterId),
      });
    }
    for (const b of inn.batters) {
      const was = old?.batters.find((x) => x.playerId === b.playerId)?.runs ?? 0;
      for (const mark of [50, 100] as const) {
        if (was < mark && b.runs >= mark) {
          out.push({
            key: `m${mark}:${i}:${b.playerId}`,
            kind: mark === 50 ? 'fifty' : 'hundred',
            level: 'key',
            at,
            text: t.milestone(inn, b.playerId, b.runs, b.balls, mark),
          });
        }
      }
    }
  });

  if (
    before.phase !== 'inningsBreak' &&
    after.phase === 'inningsBreak' &&
    after.innings[0]?.ended
  ) {
    out.push({
      key: 'inn:0',
      kind: 'inningsBreak',
      level: 'key',
      at,
      text: t.inningsBreak(after.innings[0]),
    });
  }

  if (before.phase !== 'superOverBreak' && after.phase === 'superOverBreak') {
    const n = after.innings.filter((i) => i.superOver).length / 2 + 1;
    out.push({ key: `so:${n}`, kind: 'superOver', level: 'key', at, text: t.superOver() });
  }

  if (!before.result && after.result) {
    out.push({ key: 'result', kind: 'result', level: 'result', at, text: t.result(after) });
  }
  return out;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const digits = (s: string, lang: Lang) =>
  lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;

function overs(legalBalls: number): string {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return b ? `${o}.${b}` : `${o}`;
}

function texts(match: Match) {
  const team = (i: number) => match.teams[i].name;
  const player = (id: string) => {
    for (const tm of match.teams) {
      const p = tm.players.find((x) => x.id === id);
      if (p) return p.name;
    }
    return id;
  };
  const score = (inn: InningsState, lang: Lang) =>
    lang === 'bn'
      ? digits(`${inn.runs}/${inn.wickets} (${overs(inn.legalBalls)} ওভার)`, 'bn')
      : `${inn.runs}/${inn.wickets} (${overs(inn.legalBalls)} ov)`;
  const both = (bn: [string, string], en: [string, string]) => ({
    bn: { title: bn[0], body: bn[1] },
    en: { title: en[0], body: en[1] },
  });

  return {
    start() {
      const winner = team(match.toss.winner);
      const bat = match.toss.decision === 'bat';
      return both(
        [
          `${team(0)} বনাম ${team(1)}`,
          `খেলা শুরু! ${winner} টস জিতে ${bat ? 'ব্যাটিং' : 'বোলিং'} নিয়েছে।`,
        ],
        [
          `${team(0)} v ${team(1)}`,
          `Match started. ${winner} won the toss and chose to ${bat ? 'bat' : 'bowl'}.`,
        ],
      );
    },
    wicket(inn: InningsState, batterId: string) {
      const name = player(batterId);
      const side = team(inn.battingTeam);
      return both(
        [`উইকেট! ${name} আউট`, `${side} ${score(inn, 'bn')}`],
        [`Wicket! ${name} is out`, `${side} ${score(inn, 'en')}`],
      );
    },
    milestone(inn: InningsState, id: string, runs: number, balls: number, mark: 50 | 100) {
      const name = player(id);
      const side = team(inn.battingTeam);
      const bnMark = mark === 50 ? 'ফিফটি' : 'সেঞ্চুরি';
      const enMark = mark === 50 ? 'fifty' : 'hundred';
      return both(
        [
          `${name}-এর ${bnMark}!`,
          `${digits(`${runs}`, 'bn')} রান, ${digits(`${balls}`, 'bn')} বলে। ${side} ${score(inn, 'bn')}`,
        ],
        [`A ${enMark} for ${name}!`, `${runs} off ${balls} balls. ${side} ${score(inn, 'en')}`],
      );
    },
    inningsBreak(first: InningsState) {
      const target = first.runs + 1;
      const chasing = team(first.bowlingTeam);
      return both(
        [
          'ইনিংস বিরতি',
          `${team(first.battingTeam)} ${score(first, 'bn')}। জিততে ${chasing}-এর দরকার ${digits(`${target}`, 'bn')} রান।`,
        ],
        [
          'Innings break',
          `${team(first.battingTeam)} ${score(first, 'en')}. ${chasing} need ${target} to win.`,
        ],
      );
    },
    superOver() {
      return both(
        ['ম্যাচ টাই!', 'সুপার ওভারে খেলার নিষ্পত্তি হবে।'],
        ['Scores level!', 'A one-over Super Over will decide it.'],
      );
    },
    result(state: MatchState) {
      const r = state.result!;
      const main = state.innings.filter((i) => !i.superOver);
      const line = (lang: Lang) =>
        main
          .map((i) => `${team(i.battingTeam)} ${score(i, lang)}`)
          .join(lang === 'bn' ? '। ' : '. ');
      if (r.kind === 'tie') return both(['ম্যাচ টাই', line('bn')], ['Match tied', line('en')]);
      const w = team(r.winner);
      if (r.by === 'superOver')
        return both([`${w} সুপার ওভারে জয়ী!`, line('bn')], [`${w} win the Super Over!`, line('en')]);
      const n = r.margin;
      const bnBy = `${digits(`${n}`, 'bn')} ${r.by === 'runs' ? 'রানে' : 'উইকেটে'}`;
      const enBy = `${n} ${r.by === 'runs' ? (n === 1 ? 'run' : 'runs') : n === 1 ? 'wicket' : 'wickets'}`;
      return both([`${w} ${bnBy} জিতেছে!`, line('bn')], [`${w} won by ${enBy}!`, line('en')]);
    },
  };
}
