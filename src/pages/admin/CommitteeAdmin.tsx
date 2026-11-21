import { useState } from 'react';
import { btn, Card } from '../../components/common/controls';
import { PlayerAvatar } from '../../components/common/TeamAvatar';
import {
  COMMITTEE_MEMBERS,
  COMMITTEE_ROLES,
  type CommitteeMember,
  type CommitteeRole,
} from '../../data/committee';
import { dataSource, resetData, saveData } from '../../sync/remoteData';
import { addMember, committeeProblems, moveMember, removeMember } from '../../data/committeeEdit';
import { squareImage, uploadMedia } from './media';
import { small, StatusLine, useStatus } from './shared';

const ROLE_LABEL: Record<CommitteeRole, string> = {
  convener: 'আহ্বায়ক',
  memberSecretary: 'সদস্য সচিব',
  member: 'সদস্য',
};

/** A new file name every time, so phones do not keep showing a cached old photo. */
const photoPath = (id: string) => `committee/${id}-${Date.now()}.jpg`;

/**
 * Super admin: the sports committee shown on More → Committee. Members can be
 * added, removed, reordered, renamed, given a post, and get a new photo.
 * Nothing changes for anyone until "Save" is pressed.
 */
export function CommitteeAdmin({ email }: { email: string }) {
  const [list, setList] = useState<CommitteeMember[]>(() =>
    structuredClone([...COMMITTEE_MEMBERS]),
  );
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState('');
  const status = useStatus();
  const problems = committeeProblems(list);

  const change = (next: CommitteeMember[]) => {
    setList(next);
    setDirty(true);
    status.clear();
  };
  const set = (i: number, patch: Partial<CommitteeMember>) =>
    change(list.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const upload = async (file: File | undefined, i: number) => {
    if (!file) return;
    const m = list[i];
    setUploading(m.id);
    try {
      const blob = await squareImage(file, 400, 'image/jpeg');
      const url = await uploadMedia(photoPath(m.id), blob);
      setList((all) => all.map((x) => (x.id === m.id ? { ...x, photo: url } : x)));
      setDirty(true);
      status.clear();
    } catch (e) {
      alert(`ছবি আপলোড হয়নি: ${(e as Error).message}`);
    } finally {
      setUploading('');
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        এখন চালু:{' '}
        {dataSource('committee') === 'built-in' ? 'কোডের আসল তালিকা' : 'আপনার সেভ করা তালিকা'}।
        ছবিতে চাপ দিয়ে নতুন ছবি দিন। সব বদল শেষে নিচের “সেভ” চাপলে সবার ফোনে দেখাবে।
      </p>

      <ol className="flex flex-col gap-2">
        {list.map((m, i) => (
          <li
            key={m.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <label className="relative shrink-0 cursor-pointer" title="ছবি বদলান">
                <PlayerAvatar name={m.name ?? '?'} color="#065f46" photo={m.photo} size="md" />
                <span className="absolute -right-1 -bottom-1 rounded-full bg-white px-1 text-[10px] shadow dark:bg-slate-800">
                  {uploading === m.id ? '…' : '📷'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={!!uploading}
                  onChange={(e) => void upload(e.target.files?.[0], i)}
                />
              </label>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  className={`${small} w-full`}
                  value={m.name ?? ''}
                  placeholder="নাম (যেমন Mr. Amzad Hossain)"
                  aria-label="নাম"
                  onChange={(e) => set(i, { name: e.target.value })}
                />
                <input
                  className={`${small} w-full`}
                  value={m.title ?? ''}
                  placeholder="পদ / বিভাগ (ঐচ্ছিক)"
                  aria-label="পদ বা বিভাগ"
                  onChange={(e) => set(i, { title: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                className={small}
                value={m.role}
                aria-label="ভূমিকা"
                onChange={(e) => set(i, { role: e.target.value as CommitteeRole })}
              >
                {COMMITTEE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              {m.photo && (
                <button
                  type="button"
                  className={small}
                  onClick={() => set(i, { photo: undefined })}
                >
                  ছবি সরান
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                className={small}
                disabled={i === 0}
                onClick={() => change(moveMember(list, i, -1))}
                aria-label="ওপরে"
              >
                ↑
              </button>
              <button
                type="button"
                className={small}
                disabled={i === list.length - 1}
                onClick={() => change(moveMember(list, i, 1))}
                aria-label="নিচে"
              >
                ↓
              </button>
              <button
                type="button"
                className={`${small} text-red-600`}
                aria-label="বাদ দিন"
                onClick={() =>
                  confirm(`${m.name || 'এই সদস্য'}-কে কমিটি থেকে বাদ দেবেন?`) &&
                  change(removeMember(list, i))
                }
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className={btn.secondary}
        onClick={() => {
          const name = prompt('নতুন সদস্যের নাম (যেমন Mr. Rahim Uddin)')?.trim();
          if (name) change(addMember(list, name));
        }}
      >
        + সদস্য যোগ করুন
      </button>

      {problems.length > 0 && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          ⚠ সেভ করার আগে ঠিক করুন: {problems.join(', ')}
        </p>
      )}

      <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-xl bg-white/95 py-2 md:bottom-2 dark:bg-slate-900/95">
        <button
          type="button"
          className={`${btn.primary} flex-1`}
          disabled={!dirty || status.busy || !!uploading || problems.length > 0}
          onClick={() =>
            void status.run(async () => {
              try {
                await saveData(
                  'committee',
                  list.map((m) => ({ ...m, name: m.name?.trim() })),
                  email,
                );
              } catch (e) {
                // The database has not been told about the committee list yet
                if (/check constraint/i.test((e as Error).message))
                  throw new Error(
                    'Supabase-এ patch-6-committee.sql চালানো হয়নি। সেটা চালিয়ে আবার চেষ্টা করুন।',
                    { cause: e },
                  );
                throw e;
              }
              setDirty(false);
            })
          }
        >
          {status.busy ? 'সেভ হচ্ছে…' : 'কমিটির বদল সেভ করুন'}
        </button>
        <button
          type="button"
          className={btn.secondary}
          disabled={status.busy || dataSource('committee') === 'built-in'}
          onClick={() =>
            confirm('সেভ করা তালিকা মুছে কোডের আসল তালিকায় ফিরবেন?') &&
            void status.run(async () => {
              await resetData('committee');
              setList(structuredClone([...COMMITTEE_MEMBERS]));
              setDirty(false);
            })
          }
        >
          আসল তালিকায় ফিরুন
        </button>
      </div>
      <StatusLine msg={status.msg} />
    </Card>
  );
}
