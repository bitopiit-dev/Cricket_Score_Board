import { useEffect, useState } from 'react';
import { btn, Card, inputClass } from '../../components/common/controls';
import { supabase } from '../../sync/supabase';
import { small, StatusLine, useStatus } from './shared';

interface Row {
  email: string;
  role: 'super' | 'scorer';
}

async function fetchRows(): Promise<Row[]> {
  const { data } = await supabase!.from('app_admins').select('email, role').order('role');
  return (data ?? []) as Row[];
}

/**
 * Who may change things. A person also needs a login: create it in Supabase
 * (Authentication -> Users -> Add user) with the same email.
 */
export function UsersAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Row['role']>('scorer');
  const status = useStatus();

  const load = async () => setRows(await fetchRows());
  useEffect(() => {
    let alive = true;
    void fetchRows().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const add = () =>
    void status.run(async () => {
      const e = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('ইমেইল ঠিক নেই');
      const { error } = await supabase!.from('app_admins').upsert({ email: e, role });
      if (error) throw new Error(error.message);
      setEmail('');
      await load();
      return `${e} যোগ হয়েছে। এবার Supabase-এ এই ইমেইলের লগইন বানান (Authentication → Users → Add user)।`;
    });

  const remove = (r: Row) => {
    if (r.role === 'super' && rows.filter((x) => x.role === 'super').length === 1) {
      alert('শেষ সুপার অ্যাডমিনকে সরানো যাবে না।');
      return;
    }
    if (!confirm(`${r.email}-এর অনুমতি সরাবেন?`)) return;
    void status.run(async () => {
      const { error } = await supabase!.from('app_admins').delete().eq('email', r.email);
      if (error) throw new Error(error.message);
      await load();
      return 'সরানো হয়েছে।';
    });
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        স্কোরার শুধু স্কোর তুলতে পারেন, সুপার অ্যাডমিন সব বদলাতে পারেন। নতুন কাউকে যোগ করার পর Supabase-এ
        একই ইমেইলে তাঁর লগইন বানাতে হবে।
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.email}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-700"
          >
            <span className="min-w-0 flex-1 truncate">{r.email}</span>
            <span className="text-xs font-semibold">
              {r.role === 'super' ? 'সুপার অ্যাডমিন' : 'স্কোরার'}
            </span>
            <button type="button" className={`${small} text-red-600`} onClick={() => remove(r)}>
              সরান
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          placeholder="ইমেইল"
          className={`${inputClass} min-w-0 flex-1`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className={small}
          value={role}
          onChange={(e) => setRole(e.target.value as Row['role'])}
        >
          <option value="scorer">স্কোরার</option>
          <option value="super">সুপার অ্যাডমিন</option>
        </select>
        <button
          type="button"
          className={btn.primary}
          disabled={status.busy || !email}
          onClick={add}
        >
          যোগ করুন
        </button>
      </div>
      <StatusLine msg={status.msg} />
    </Card>
  );
}
