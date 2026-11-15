import { useState } from 'react';
import { btn, Card } from '../../components/common/controls';
import { FIXTURES } from '../../data/fixtures';
import { TOURNAMENT_TEAMS } from '../../data/teams';
import { isValidDoc, saveData, type DocKey } from '../../sync/remoteData';
import { StatusLine, useStatus } from './shared';

const current = (key: DocKey) =>
  JSON.stringify(key === 'fixtures' ? FIXTURES : TOURNAMENT_TEAMS, null, 2);

/**
 * Advanced: the whole fixture or team list as text, for changes the forms do not
 * cover. Checked before saving; a copy can be downloaded first as a backup.
 */
export function JsonAdmin({ email }: { email: string }) {
  const [key, setKey] = useState<DocKey>('teams');
  const [text, setText] = useState(() => current('teams'));
  const status = useStatus();

  const pick = (k: DocKey) => {
    setKey(k);
    setText(current(k));
    status.clear();
  };
  const backup = () => {
    const url = URL.createObjectURL(new Blob([current(key)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `bpl-${key}-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        সাবধানে ব্যবহার করুন: এখানে পুরো তালিকা লেখা আকারে বদলানো যায়। সেভ করার আগে "ব্যাকআপ" নিয়ে রাখুন।
        ভুল লেখা হলে সেভ হবে না।
      </p>
      <div className="flex flex-wrap gap-2">
        {(['teams', 'fixtures'] as DocKey[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={key === k}
            onClick={() => pick(k)}
            className={`${key === k ? btn.primary : btn.secondary} py-2`}
          >
            {k === 'teams' ? 'দল ও খেলোয়াড়' : 'ফিক্সচার'}
          </button>
        ))}
        <button type="button" className={`${btn.secondary} py-2`} onClick={backup}>
          ব্যাকআপ ডাউনলোড
        </button>
      </div>
      <textarea
        className="h-96 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className={btn.primary}
        disabled={status.busy}
        onClick={() =>
          void status.run(async () => {
            let value: unknown;
            try {
              value = JSON.parse(text);
            } catch (e) {
              throw new Error(`লেখায় ভুল আছে (${(e as Error).message})`, { cause: e });
            }
            if (!isValidDoc(key, value)) throw new Error('তালিকার গঠন ঠিক নেই');
            if (!confirm('সবার ফোনে এটা চালু হবে। নিশ্চিত?')) return 'বাতিল করা হয়েছে।';
            await saveData(key, value, email);
          })
        }
      >
        সেভ করুন ও সবার জন্য চালু করুন
      </button>
      <StatusLine msg={status.msg} />
    </Card>
  );
}
