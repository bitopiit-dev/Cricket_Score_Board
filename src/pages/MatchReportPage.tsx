import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { BPL_LOGO, COMMITTEE_LOGO, COMMITTEE_NAME } from '../data/committee';
import { fixtureById } from '../data/fixtures';
import { matchRepository } from '../db/repository';
import { manOfTheMatchId } from '../engine/milestones';
import { strikeRate } from '../engine/rules';
import { deriveMatchState } from '../engine/scoring';
import { didNotBat, economy, extrasTotal } from '../engine/stats';
import type { InningsState, Match, MatchState } from '../engine/types';
import { useFormat } from '../hooks/useFormat';
import { usePrefs } from '../store/prefsStore';
import { assetUrl } from '../utils/asset';
import { formatDate, formatTime, stageLabel } from '../utils/fixtureText';
import {
  dismissalText,
  inningsLabel,
  overRows,
  playerName,
  reportFileName,
  resultText,
} from '../utils/matchText';

/**
 * A finished match on one or two A4 pages, for the committee's records.
 * "Download PDF" opens the browser's print window, where "Save as PDF" makes
 * the file; the browser draws Bangla text itself, so it comes out right.
 * Always black on white, whatever the app's theme.
 */
export default function MatchReportPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ match: Match; state: MatchState } | null | undefined>();

  useEffect(() => {
    if (!id) return;
    void matchRepository
      .get(id)
      .then((m) => setData(m ? { match: m, state: deriveMatchState(m) } : null));
  }, [id]);

  // The title is the file name the browser suggests for the PDF
  useEffect(() => {
    if (!data) return;
    const before = document.title;
    const fx = data.match.fixtureId ? fixtureById(data.match.fixtureId) : undefined;
    document.title = reportFileName(data.match, fx?.no);
    return () => {
      document.title = before;
    };
  }, [data]);

  if (data === undefined) return null;

  return (
    <div className="min-h-dvh bg-slate-200 text-slate-900 print:bg-white">
      <style>
        {
          '@page { size: A4; margin: 10mm; } @media print { html, body { background: #fff !important; } }'
        }
      </style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-night-950 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white print:hidden">
        <Link to="/admin" className="flex min-h-11 items-center px-1 font-semibold">
          ← {t('common.back')}
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm text-white/70">{t('report.hint')}</span>
        {data?.state.phase === 'completed' && (
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 rounded-full bg-bpl-yellow px-5 font-semibold text-night-950 active:scale-95"
          >
            {t('report.download')}
          </button>
        )}
      </div>

      {data === null ? (
        <p className="p-8 text-center">{t('report.notFound')}</p>
      ) : data.state.phase !== 'completed' ? (
        <p className="p-8 text-center">{t('report.notFinished')}</p>
      ) : (
        <Report match={data.match} state={data.state} />
      )}
    </div>
  );
}

function Report({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const fx = match.fixtureId ? fixtureById(match.fixtureId) : undefined;
  const mom = manOfTheMatchId(match);
  const tossTeam = match.teams[match.toss.winner].name;

  const info: [string, string][] = [
    [t('report.matchNo'), fx ? f.num(fx.no) : t('report.outsideFixture')],
    ...(fx
      ? ([
          [t('report.stage'), stageLabel(fx.stage, t)],
          [
            t('report.date'),
            formatDate(fx.date, lang, bengaliDigits, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long',
            }),
          ],
          [t('report.time'), formatTime(fx.time, lang, f)],
        ] as [string, string][])
      : []),
    ...(fx?.venue ? ([[t('report.venue'), fx.venue]] as [string, string][]) : []),
    [t('report.overs'), f.num(match.settings.overs)],
    [
      t('report.toss'),
      t('report.tossLine', {
        team: tossTeam,
        decision: t(match.toss.decision === 'bat' ? 'report.bat' : 'report.bowl'),
      }),
    ],
  ];

  return (
    <article className="mx-auto my-4 max-w-[210mm] bg-white p-[12mm] shadow-lg print:m-0 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-center gap-4 rounded-lg bg-night-950 px-4 py-3 text-white print:py-2 [print-color-adjust:exact]">
        <img src={assetUrl(BPL_LOGO)} alt="" className="h-14 w-auto print:h-10" />
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-2xl font-bold tracking-wide">
            BARIDHI PREMIER LEAGUE-2027
          </p>
          <p className="font-semibold text-bpl-yellow">{t('report.title')}</p>
        </div>
        <img
          src={assetUrl(COMMITTEE_LOGO)}
          alt={COMMITTEE_NAME}
          className="h-14 w-auto print:h-10"
        />
      </header>

      <h1 className="mt-4 text-center text-2xl font-bold print:mt-2 print:text-lg">
        {match.teams[0].name} {t('common.vs')} {match.teams[1].name}
      </h1>
      {state.result && (
        <p className="mt-1 text-center text-lg font-semibold text-emerald-800 print:mt-0 print:text-base">
          {resultText(state.result, match, t, f)}
        </p>
      )}

      <dl className="mt-4 print:mt-2 print:py-2 print:text-[11px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-slate-300 px-4 py-3 text-sm sm:grid-cols-[auto_1fr_auto_1fr] print:grid-cols-[auto_1fr_auto_1fr]">
        {info.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
        <dt className="text-slate-500">{t('report.mom')}</dt>
        <dd className="font-semibold">{mom ? playerName(match, mom) : '—'}</dd>
      </dl>

      <section className="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-1 text-base print:mt-1.5 print:text-sm">
        {state.innings.map((inn) => (
          <p key={inn.index}>
            <span className="font-semibold">{match.teams[inn.battingTeam].name}</span>
            {inn.superOver && (
              <span className="text-slate-500"> ({inningsLabel(inn, t, f)})</span>
            )}{' '}
            <span className="tabular font-bold">
              {f.num(inn.runs)}/{f.num(inn.wickets)}
            </span>{' '}
            <span className="tabular text-slate-500">({f.overs(inn.legalBalls)})</span>
          </p>
        ))}
      </section>

      {state.innings.map((inn) => (
        <InningsBlock key={inn.index} match={match} inn={inn} />
      ))}

      <footer className="mt-10 break-inside-avoid">
        <div className="grid grid-cols-3 gap-6 text-center text-sm">
          {[t('report.signScorer'), t('report.signUmpire'), t('report.signCommittee')].map((s) => (
            <div key={s}>
              <div className="h-10 border-b border-slate-500" />
              <p className="mt-1 text-slate-600">{s}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          {t('report.generated', {
            when: new Date().toLocaleString(
              lang === 'bn' ? (bengaliDigits ? 'bn-BD' : 'bn-BD-u-nu-latn') : 'en-GB',
              {
                dateStyle: 'long',
                timeStyle: 'short',
              },
            ),
          })}{' '}
          · bitopiit-dev.github.io/Cricket_Score_Board
        </p>
      </footer>
    </article>
  );
}

function InningsBlock({ match, inn }: { match: Match; inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const batters = [...inn.batters].sort((a, b) => a.order - b.order);
  const bowlers = [...inn.bowlers].sort((a, b) => a.order - b.order);
  const dnb = didNotBat(inn, match);
  const e = inn.extras;
  const cell = 'border-b px-1.5 py-1 print:py-0.5';
  const head = `${cell} border-slate-400 bg-slate-100 font-semibold [print-color-adjust:exact]`;
  const th = `${head} text-right`;
  const thL = `${head} text-left`;
  const td = `${cell} tabular border-slate-200 text-right`;
  const tdL = `${cell} border-slate-200 text-left`;

  return (
    <section
      className={`mt-6 print:mt-3 ${inn.index > 0 && !inn.superOver ? 'print:mt-0 print:break-before-page' : ''}`}
    >
      <h2 className="flex items-baseline justify-between rounded-md bg-slate-800 px-3 py-1.5 text-white [print-color-adjust:exact]">
        <span className="font-semibold">
          {match.teams[inn.battingTeam].name}{' '}
          <span className="text-sm font-normal text-white/70">{inningsLabel(inn, t, f)}</span>
        </span>
        <span className="tabular font-bold">
          {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
          <span className="text-sm font-normal text-white/70">
            ({f.overs(inn.legalBalls)} {t('col.overs')})
          </span>
        </span>
      </h2>

      <table className="mt-2 print:mt-1 w-full break-inside-avoid text-[13px] print:text-[11px]">
        <thead>
          <tr>
            <th className={thL}>{t('scoring.batter')}</th>
            <th className={thL}>{t('report.howOut')}</th>
            <th className={th}>{t('col.runs')}</th>
            <th className={th}>{t('col.balls')}</th>
            <th className={th}>{t('col.fours')}</th>
            <th className={th}>{t('col.sixes')}</th>
            <th className={th}>{t('col.sr')}</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => (
            <tr key={b.playerId}>
              <td className={`${tdL} font-semibold`}>{playerName(match, b.playerId)}</td>
              <td className={`${tdL} text-slate-600`}>{dismissalText(b, match, inn, t)}</td>
              <td className={`${td} font-bold`}>{f.num(b.runs)}</td>
              <td className={td}>{f.num(b.balls)}</td>
              <td className={td}>{f.num(b.fours)}</td>
              <td className={td}>{f.num(b.sixes)}</td>
              <td className={td}>{f.dec(strikeRate(b.runs, b.balls), 1)}</td>
            </tr>
          ))}
          <tr>
            <td className={tdL} colSpan={2}>
              <span className="font-semibold">{t('scoring.extras')}</span>{' '}
              <span className="text-slate-600">
                (
                {t('matchCenter.extrasDetail', {
                  w: f.num(e.wides),
                  nb: f.num(e.noBalls),
                  b: f.num(e.byes),
                  lb: f.num(e.legByes),
                })}
                )
              </span>
            </td>
            <td className={`${td} font-bold`}>{f.num(extrasTotal(e))}</td>
            <td className={td} colSpan={4} />
          </tr>
          {inn.penaltyRuns !== 0 && (
            <tr>
              <td className={`${tdL} font-semibold`} colSpan={2}>
                {t('scoring.penalty')}
              </td>
              <td className={`${td} font-bold`}>
                {inn.penaltyRuns > 0 ? '+' : '−'}
                {f.num(Math.abs(inn.penaltyRuns))}
              </td>
              <td className={td} colSpan={4} />
            </tr>
          )}
          <tr>
            <td className={`${tdL} font-bold`} colSpan={2}>
              {t('report.total')}{' '}
              <span className="font-normal text-slate-600">
                ({f.num(inn.wickets)} {t('col.wickets')}, {f.overs(inn.legalBalls)} {t('col.overs')}
                )
              </span>
            </td>
            <td className={`${td} font-bold`}>{f.num(inn.runs)}</td>
            <td className={td} colSpan={4} />
          </tr>
        </tbody>
      </table>

      <div className="mt-2 flex flex-col gap-1 text-[13px] print:mt-1 print:gap-0 print:text-[11px]">
        {dnb.length > 0 && (
          <p>
            <span className="font-semibold">{t('matchCenter.didNotBat')}:</span>{' '}
            {dnb.map((id) => playerName(match, id)).join(', ')}
          </p>
        )}
        {inn.fallOfWickets.length > 0 && (
          <p>
            <span className="font-semibold">{t('matchCenter.fallOfWickets')}:</span>{' '}
            <span className="tabular">
              {inn.fallOfWickets
                .map(
                  (w) =>
                    `${f.num(w.score)}-${f.num(w.wicketNumber)} (${playerName(match, w.batterId)}, ${f.overs(w.legalBalls)})`,
                )
                .join(', ')}
            </span>
          </p>
        )}
      </div>

      {bowlers.length > 0 && (
        <table className="mt-3 print:mt-2 w-full break-inside-avoid text-[13px] print:text-[11px]">
          <thead>
            <tr>
              <th className={thL}>{t('scoring.bowler')}</th>
              <th className={th}>{t('col.overs')}</th>
              <th className={th}>{t('col.maidens')}</th>
              <th className={th}>{t('col.conceded')}</th>
              <th className={th}>{t('col.wickets')}</th>
              <th className={th}>{t('report.wides')}</th>
              <th className={th}>{t('report.noBalls')}</th>
              <th className={th}>{t('report.dots')}</th>
              <th className={th}>{t('col.econ')}</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.map((b) => (
              <tr key={b.playerId}>
                <td className={`${tdL} font-semibold`}>{playerName(match, b.playerId)}</td>
                <td className={td}>{f.overs(b.legalBalls)}</td>
                <td className={td}>{f.num(b.maidens)}</td>
                <td className={td}>{f.num(b.runsConceded)}</td>
                <td className={`${td} font-bold`}>{f.num(b.wickets)}</td>
                <td className={td}>{f.num(b.wides)}</td>
                <td className={td}>{f.num(b.noBalls)}</td>
                <td className={td}>{f.num(b.dots)}</td>
                <td className={td}>{f.dec(economy(b), 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 print:mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
        {inn.partnerships.length > 0 && (
          <table className="w-full self-start break-inside-avoid text-[12px] print:text-[10.5px]">
            <thead>
              <tr>
                <th className={thL}>{t('report.partnerships')}</th>
                <th className={th}>{t('col.runs')}</th>
                <th className={th}>{t('col.balls')}</th>
              </tr>
            </thead>
            <tbody>
              {inn.partnerships.map((p, i) => (
                <tr key={i}>
                  <td className={tdL}>
                    {p.batterIds.map((id) => playerName(match, id)).join(' – ')}
                  </td>
                  <td className={td}>{f.num(p.runs)}</td>
                  <td className={td}>{f.num(p.legalBalls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {inn.overs.length > 0 && (
          <table className="w-full self-start break-inside-avoid text-[12px] print:text-[10.5px]">
            <thead>
              <tr>
                <th className={thL}>{t('report.over')}</th>
                <th className={thL}>{t('scoring.bowler')}</th>
                <th className={th}>{t('col.runs')}</th>
                <th className={th}>{t('col.wickets')}</th>
                <th className={th}>{t('report.score')}</th>
              </tr>
            </thead>
            <tbody>
              {overRows(inn).map((o) => (
                <tr key={o.number}>
                  <td className={`${tdL} tabular`}>{f.num(o.number)}</td>
                  <td className={tdL}>{playerName(match, o.bowlerId)}</td>
                  <td className={td}>{f.num(o.runs)}</td>
                  <td className={td}>{o.wickets ? f.num(o.wickets) : ''}</td>
                  <td className={td}>
                    {f.num(o.score)}/{f.num(o.fallen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
