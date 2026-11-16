import { useState } from 'react';
import { btn, Card } from '../../components/common/controls';
import { fixtureById } from '../../data/fixtures';
import { matchRepository } from '../../db/repository';
import { deriveMatchState } from '../../engine/scoring';
import { useTournament } from '../../hooks/useTournament';
import { MATCHES_CHANGED, pendingUploads, uploadAllFromThisPhone } from '../../sync/matchSync';
import { StatusLine, useStatus } from './shared';

/** Scored matches: upload this phone's matches; the super admin can also delete one. */
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
                  {s.phase === 'completed' ? 'শেষ' : 'চলছে / শুরু হয়নি'} ·{' '}
                  {new Date(m.updatedAt).toLocaleString()}
                </p>
              </div>
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
