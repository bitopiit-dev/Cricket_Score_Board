import { useState } from 'react';
import { Link } from 'react-router-dom';
import { btn, Card } from '../../components/common/controls';
import { fixtureById, isVoidMatch, type Fixture } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { matchRepository } from '../../db/repository';
import { deriveMatchState } from '../../engine/scoring';
import { useTournament } from '../../hooks/useTournament';
import { MATCHES_CHANGED, pendingUploads, uploadAllFromThisPhone } from '../../sync/matchSync';
import { fixturesForTeams, matchFitsFixture, movedToFixture } from '../../tournament/standings';
import type { Match } from '../../engine/types';
import { StatusLine, useStatus } from './shared';

/** Moves a match to another fixture (the right match number) and sends it to every phone. */
async function moveToFixture(m: Match, fx: Fixture) {
  await matchRepository.save(movedToFixture(m, fx.id, Date.now()));
  window.dispatchEvent(new Event(MATCHES_CHANGED));
}

/**
 * Scored matches: upload this phone's matches; the super admin can also delete
 * one, or move one saved under the wrong match number to the right one.
 */
export function MatchesAdmin({ scorerOnly = false }: { scorerOnly?: boolean }) {
  const tour = useTournament(10000);
  const status = useStatus();
  const [, redraw] = useState(0);
  const waiting = pendingUploads();

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        লগইন করা অবস্থায় যে ফোনে স্কোর তোলা হয়, প্রতিটা বল নিজে থেকেই সবার ফোনে যায়। লগইনের আগে তোলা
        ম্যাচ পাঠাতে নিচের বোতাম চাপুন।
        {waiting > 0 && ` এই ফোন থেকে ${waiting}টা ম্যাচ নেট পেলেই আপলোড হবে।`}
      </p>
      <button
        type="button"
        className={btn.secondary}
        disabled={status.busy}
        onClick={() =>
          void status.run(async () => {
            const n = await uploadAllFromThisPhone();
            redraw((x) => x + 1);
            const left = pendingUploads();
            return left
              ? `${n - left}টা গেছে, ${left}টা নেট পেলে যাবে।`
              : `${n}টা ম্যাচ আপলোড হয়েছে।`;
          })
        }
      >
        এই ফোনের সব ম্যাচ আপলোড করুন
      </button>
      <StatusLine msg={status.msg} />
      <ul className="flex flex-col gap-2">
        {tour?.matches.map((m) => {
          const s = deriveMatchState(m);
          const fx = m.fixtureId ? fixtureById(m.fixtureId) : undefined;
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-700"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {m.teams[0].name} বনাম {m.teams[1].name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fx ? `ফিক্সচার ম্যাচ ${fx.no}` : 'ফিক্সচারের বাইরে'} ·{' '}
                  {isVoidMatch(m)
                    ? 'বাতিল, আবার খেলা হবে'
                    : s.phase === 'completed'
                      ? 'শেষ'
                      : 'চলছে / শুরু হয়নি'}{' '}
                  · {new Date(m.updatedAt).toLocaleString()}
                </p>
                {fx && !matchFitsFixture(m, fx) && (
                  <WrongFixture m={m} fx={fx} canMove={!scorerOnly} />
                )}
              </div>
              {s.phase === 'completed' && (
                <Link
                  to={`/report/${m.id}`}
                  className={`${btn.secondary} px-3 py-1.5 text-sm`}
                  aria-label={`${m.teams[0].name} বনাম ${m.teams[1].name}: রিপোর্ট PDF`}
                >
                  PDF
                </Link>
              )}
              {!scorerOnly && (
                <button
                  type="button"
                  className={`${btn.danger} px-3 py-1.5 text-sm`}
                  onClick={() => {
                    if (
                      !confirm(
                        `"${m.teams[0].name} বনাম ${m.teams[1].name}" ম্যাচটা সব ফোন থেকে মুছে যাবে। নিশ্চিত?`,
                      )
                    )
                      return;
                    void matchRepository
                      .remove(m.id)
                      .then(() => window.dispatchEvent(new Event(MATCHES_CHANGED)));
                  }}
                >
                  মুছুন
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {tour?.matches.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">এখনো কোনো ম্যাচ নেই।</p>
      )}
    </Card>
  );
}

/**
 * Shown for a match whose teams are not the teams of its fixture (the wrong
 * match number was picked). It is left out of the tables until moved.
 */
function WrongFixture({ m, fx, canMove }: { m: Match; fx: Fixture; canMove: boolean }) {
  const [busy, setBusy] = useState(false);
  const name = (id?: string) => findTeam(id)?.name ?? id ?? '?';
  const fixtureSides = [fx.teamA, fx.teamB].map((x) => (x.kind === 'team' ? name(x.teamId) : '?'));
  const [a, b] = m.teams.map((t) => t.teamId ?? '');
  const targets = a && b ? fixturesForTeams(a, b) : [];
  return (
    <div
      role="alert"
      className="mt-2 flex flex-col gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p>
        ⚠️ ফিক্সচার ম্যাচ {fx.no} হলো {fixtureSides[0]} বনাম {fixtureSides[1]}। এই ম্যাচের দল আলাদা,
        তাই পয়েন্ট টেবিলে এটা ধরা হচ্ছে না।
        {targets.length > 0 ? ' ঠিক ম্যাচ নম্বরে সরিয়ে দিন:' : ' এই দুই দলের কোনো গ্রুপ ম্যাচ নেই।'}
      </p>
      {canMove && targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              disabled={busy}
              className={`${btn.primary} px-3 py-1.5 text-sm`}
              onClick={() => {
                if (
                  !confirm(
                    `"${m.teams[0].name} বনাম ${m.teams[1].name}" ম্যাচটা ফিক্সচার ম্যাচ ${fx.no} থেকে ম্যাচ ${target.no}-এ সরানো হবে, সব ফোনে। নিশ্চিত?`,
                  )
                )
                  return;
                setBusy(true);
                void moveToFixture(m, target).finally(() => setBusy(false));
              }}
            >
              ম্যাচ {target.no}-এ সরান
            </button>
          ))}
        </div>
      )}
      {!canMove && targets.length > 0 && <p>সুপার অ্যাডমিন এটা ঠিক করতে পারবেন।</p>}
    </div>
  );
}
