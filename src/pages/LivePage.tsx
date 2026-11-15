import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { btn } from '../components/common/controls';
import { PageTitle } from '../components/layout/AppShell';
import { NextMatchCountdown } from '../components/live/NextMatchCountdown';
import { MatchHero } from '../components/match/MatchCenter';
import { BallChip } from '../components/scoring/ThisOver';
import { fixtureById } from '../data/fixtures';
import { matchRepository } from '../db/repository';
import { deriveMatchState } from '../engine/scoring';
import type { Match, MatchState } from '../engine/types';
import { useFormat } from '../hooks/useFormat';
import { useCanScore } from '../sync/auth';
import { MATCHES_CHANGED } from '../sync/matchSync';
import { stageLabel } from '../utils/fixtureText';

/** Live tab: matches being scored on this device, newest first; tap to open the scoring screen. */
export default function LivePage() {
  const { t } = useTranslation();
  const canScore = useCanScore();
  const [matches, setMatches] = useState<{ m: Match; s: MatchState }[] | null>(null);

  useEffect(() => {
    const load = () =>
      void matchRepository.list().then((ms) => {
        const rows = ms.map((m) => ({ m, s: deriveMatchState(m) }));
        // Matches still being played come first
        rows.sort((a, b) => Number(isLive(b)) - Number(isLive(a)));
        setMatches(rows);
      });
    load();
    // Live scores from the scorer's phone, plus a slow refresh as a backstop
    window.addEventListener(MATCHES_CHANGED, load);
    const timer = setInterval(load, 20000);
    return () => {
      window.removeEventListener(MATCHES_CHANGED, load);
      clearInterval(timer);
    };
  }, []);

  const live = (matches ?? []).filter(isLive);
  const others = (matches ?? []).filter((row) => !isLive(row));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>{t('tabs.live')}</PageTitle>
        {/* Only scorers and super admins start matches; viewers just follow them */}
        {canScore && (
          <Link to="/new" className={`${btn.primary} px-4 py-2`}>
            + {t('home.newMatch')}
          </Link>
        )}
      </div>
      {/* A match being played comes first, big; the countdown waits below it */}
      {live.map((row) => (
        <LiveMatchCard key={row.m.id} {...row} />
      ))}
      {live.length === 0 && <NextMatchCountdown />}
      {matches?.length === 0 && (
        <p className="rounded-2xl bg-white py-10 text-center text-slate-500 dark:bg-slate-900">
          {canScore ? t('home.noMatches') : t('home.noMatchesViewer')}
        </p>
      )}
      {others.map((row) => (
        <MatchCard key={row.m.id} {...row} />
      ))}
      {live.length > 0 && <NextMatchCountdown />}
    </main>
  );
}

const isLive = ({ m, s }: { m: Match; s: MatchState }) =>
  s.phase !== 'completed' && m.events.length > 0;

function MatchCard({ m, s }: { m: Match; s: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const live = isLive({ m, s });
  const fx = fixtureById(m.fixtureId);
  const status =
    s.phase === 'completed'
      ? t('home.completed')
      : m.events.length === 0
        ? t('home.notStarted')
        : t('home.inProgress');
  return (
    <Link
      to={`/match/${m.id}`}
      className={`rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800 ${
        live ? 'ring-2 ring-bpl-red/70' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {fx
            ? `${t('fixtures.matchNo', { n: f.num(fx.no) })} · ${stageLabel(fx.stage, t)}`
            : t('home.oversFormat', { overs: f.num(m.settings.overs), count: m.settings.overs })}
        </span>
        <span className={`flex items-center gap-1.5 ${live ? 'font-bold text-bpl-red' : ''}`}>
          {live && (
            <span
              aria-hidden
              className="size-2 animate-pulse rounded-full bg-bpl-red motion-reduce:animate-none"
            />
          )}
          {status}
        </span>
      </div>
      <div className="mt-1 font-semibold">
        {m.teams[0].name} {t('common.vs')} {m.teams[1].name}
      </div>
      {s.innings.map((inn) => (
        <div key={inn.index} className="tabular text-sm text-slate-600 dark:text-slate-400">
          {inn.superOver && `${t('scoring.superOver')} · `}
          {m.teams[inn.battingTeam].name}: {f.num(inn.runs)}/{f.num(inn.wickets)} (
          {f.overs(inn.legalBalls)})
        </div>
      ))}
    </Link>
  );
}

/** The match being played, as a big card: teams, scores, this over. Opens the Match Center. */
function LiveMatchCard({ m, s }: { m: Match; s: MatchState }) {
  const { t } = useTranslation();
  const over = s.current?.overs[s.current.overs.length - 1];
  return (
    <Link
      to={`/match/${m.id}`}
      className="block overflow-hidden rounded-3xl bg-night-950 shadow-lg ring-1 ring-night-line active:opacity-90"
    >
      <MatchHero match={m} state={s} />
      <div className="flex items-center gap-2 border-t border-night-line px-4 py-2.5">
        <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
          {over?.balls.map((b) => (
            <BallChip key={b.eventId} ball={b} />
          ))}
        </div>
        <span className="shrink-0 text-sm font-semibold text-bpl-yellow">
          {t('live.details')} ›
        </span>
      </div>
    </Link>
  );
}
