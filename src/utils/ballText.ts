import type { TFunction } from 'i18next';
import { ballRuns } from '../engine/rules';
import type { BallEvent, Match } from '../engine/types';
import type { Formatter } from './format';
import { playerName } from './matchText';

/** What happened on a delivery in a few words: "FOUR!", "wide, 1 run", "OUT! Rafi, caught". */
export function ballOutcome(
  ev: Pick<BallEvent, 'runs' | 'extra' | 'boundary' | 'wicket'>,
  match: Match,
  t: TFunction,
  f: Formatter,
): string {
  const total = ballRuns(ev, match.settings).total;
  if (ev.wicket) {
    return t('matchCenter.outcome.out', {
      name: playerName(match, ev.wicket.batterId),
      how: t(`dismissal.${ev.wicket.kind}`),
    });
  }
  if (ev.extra === 'wide') return t('matchCenter.outcome.wide', { n: f.num(total) });
  if (ev.extra === 'noBall') return t('matchCenter.outcome.noBall', { n: f.num(total) });
  if (ev.extra === 'bye') return t('matchCenter.outcome.bye', { n: f.num(ev.runs) });
  if (ev.extra === 'legBye') return t('matchCenter.outcome.legBye', { n: f.num(ev.runs) });
  if (ev.boundary && ev.runs === 6) return t('matchCenter.outcome.six');
  if (ev.boundary && ev.runs === 4) return t('matchCenter.outcome.four');
  if (ev.runs === 0) return t('matchCenter.outcome.dot');
  return t('matchCenter.outcome.runs', { n: f.num(ev.runs), count: ev.runs });
}
