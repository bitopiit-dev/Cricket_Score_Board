import { useState } from 'react';

/** Busy flag plus a success or error line, for the admin's save buttons. */
export function useStatus() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (work: () => Promise<string | void>) => {
    setBusy(true);
    setMsg(null);
    try {
      const text = await work();
      setMsg({ ok: true, text: text || 'সেভ হয়েছে। সবার ফোনে এখন নতুনটা দেখাবে।' });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: `হয়নি: ${(e as Error).message}` });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, run, clear: () => setMsg(null) };
}

export function StatusLine({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p
      role="status"
      className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}
    >
      {msg.text}
    </p>
  );
}

export const small =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900';
