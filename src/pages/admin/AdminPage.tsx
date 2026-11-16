import { useState, type FormEvent, type ReactNode } from 'react';
import { useEdgeFade } from '../../hooks/useEdgeFade';
import { btn, Card, inputClass } from '../../components/common/controls';
import { PageTitle } from '../../components/layout/AppShell';
import { signIn, signOut, useAuth } from '../../sync/auth';
import { supabase } from '../../sync/supabase';
import { FixturesAdmin } from './FixturesAdmin';
import { JsonAdmin } from './JsonAdmin';
import { MatchesAdmin } from './MatchesAdmin';
import { TeamsAdmin } from './TeamsAdmin';
import { UsersAdmin } from './UsersAdmin';

type Tab = 'fixtures' | 'teams' | 'matches' | 'users' | 'json';
const TABS: [Tab, string][] = [
  ['fixtures', 'ফিক্সচার'],
  ['teams', 'দল ও খেলোয়াড়'],
  ['matches', 'স্কোর'],
  ['users', 'অ্যাডমিন ও স্কোরার'],
  ['json', 'অ্যাডভান্সড'],
];

/** #/admin: sign in; the super admin edits everything, a scorer only scores. */
export default function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('fixtures');
  const chipRow = useEdgeFade<HTMLDivElement>();

  if (!supabase)
    return (
      <Wrap>
        <p>অফলাইন: অ্যাডমিন প্যানেল চালাতে ইন্টারনেট লাগবে।</p>
      </Wrap>
    );
  if (!auth.ready)
    return (
      <Wrap>
        <p className="text-slate-500">লোড হচ্ছে…</p>
      </Wrap>
    );
  if (!auth.email)
    return (
      <Wrap>
        <Login />
      </Wrap>
    );

  return (
    <Wrap>
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{auth.email}</p>
          <p className="text-sm text-slate-500">
            {auth.role === 'super'
              ? 'সুপার অ্যাডমিন: সব বদলাতে পারবেন'
              : auth.role === 'scorer'
                ? 'স্কোরার: আপনার তোলা স্কোর সবার ফোনে যাবে'
                : 'এই ইমেইলের কোনো অনুমতি নেই। সুপার অ্যাডমিনকে যোগ করতে বলুন।'}
          </p>
        </div>
        <button type="button" className={`${btn.secondary} py-2`} onClick={() => void signOut()}>
          লগআউট
        </button>
      </Card>
      {auth.role === 'super' && (
        <>
          <div ref={chipRow} className="edge-fade -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap ${
                  tab === id
                    ? 'bg-bpl-yellow text-night-950'
                    : 'bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'fixtures' && <FixturesAdmin email={auth.email} />}
          {tab === 'teams' && <TeamsAdmin email={auth.email} />}
          {tab === 'matches' && <MatchesAdmin />}
          {tab === 'users' && <UsersAdmin />}
          {tab === 'json' && <JsonAdmin email={auth.email} />}
        </>
      )}
      {auth.role === 'scorer' && <MatchesAdmin scorerOnly />}
    </Wrap>
  );
}

function Wrap({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl">
      <PageTitle>অ্যাডমিন</PageTitle>
      {children}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        /invalid/i.test(String(err))
          ? 'ইমেইল বা পাসওয়ার্ড ভুল।'
          : `লগইন হয়নি: ${(err as Error).message}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          ইমেইল
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          পাসওয়ার্ড
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={btn.primary}>
          {busy ? 'অপেক্ষা করুন…' : 'লগইন'}
        </button>
      </form>
    </Card>
  );
}
