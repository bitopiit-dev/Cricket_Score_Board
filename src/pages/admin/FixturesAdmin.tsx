import { useState } from 'react';
import { btn, Card } from '../../components/common/controls';
import { canAbandon, FIXTURES, type Fixture, type Slot, type StageId } from '../../data/fixtures';
import { TOURNAMENT_TEAMS } from '../../data/teams';
import { useTournament } from '../../hooks/useTournament';
import {
  addFixture,
  deleteFixture,
  editLevel,
  hasScore,
  moveFixture,
  setAbandoned,
  updateFixture,
  validateFixture,
  type FixtureWarning,
} from '../../tournament/fixtureEdit';
import { dataSource, resetData, saveData } from '../../sync/remoteData';
import { parseFixtureRows } from '../../tournament/fixtureImport';
import { small, StatusLine, useStatus } from './shared';

const STAGES: [StageId, string][] = [
  ['groupA', 'গ্রুপ A'],
  ['groupB', 'গ্রুপ B'],
  ['superSix', 'সুপার সিক্স'],
  ['semi1', 'সেমিফাইনাল ১'],
  ['semi2', 'সেমিফাইনাল ২'],
  ['final', 'ফাইনাল'],
];
const WARN: Record<FixtureWarning, string> = {
  badDate: 'তারিখ ঠিক নেই',
  badTime: 'সময় ঠিক নেই',
  sameTeam: 'দুই পাশে একই দল',
  teamTwiceOnDay: 'একটা দলের একই দিনে দুই ম্যাচ',
  wrongGroup: 'দল এই গ্রুপের নয়',
  restDay: 'ছুটির দিন (শুক্রবার বা ঘোষিত ছুটি)',
  duplicateNo: 'এই ম্যাচ নম্বর আরেকটায় আছে',
};

function slotText(s: Slot): string {
  switch (s.kind) {
    case 'team':
      return TOURNAMENT_TEAMS.find((t) => t.id === s.teamId)?.name ?? s.teamId;
    case 'groupPos':
      return `Group ${s.group} – ${s.pos}`;
    case 'superSixPos':
      return `Super Six – ${s.pos}`;
    case 'winnerOf':
      return `Winner ${s.of}`;
  }
}

function SlotPicker({
  value,
  disabled,
  onChange,
}: {
  value: Slot;
  disabled: boolean;
  onChange: (s: Slot) => void;
}) {
  const placeholder = value.kind !== 'team';
  return (
    <select
      className={`${small} min-w-0 flex-1`}
      disabled={disabled}
      value={placeholder ? '' : value.kind === 'team' ? value.teamId : ''}
      onChange={(e) => e.target.value && onChange({ kind: 'team', teamId: e.target.value })}
    >
      {placeholder && <option value="">{slotText(value)}</option>}
      {TOURNAMENT_TEAMS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

export function FixturesAdmin({ email }: { email: string }) {
  const tour = useTournament();
  const [list, setList] = useState<Fixture[]>(() => structuredClone([...FIXTURES]));
  const [dirty, setDirty] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importNote, setImportNote] = useState('');
  const status = useStatus();
  const change = (next: Fixture[]) => {
    setList(next);
    setDirty(true);
    status.clear();
    setImportNote('');
  };
  const outcome = (id: string) => tour?.ts.outcomes.get(id);

  /** Excel or CSV in the committee's layout -> the list below, ready to check and save. */
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (/\.pdf$/i.test(file.name)) {
      setImportErrors([
        'PDF থেকে সূচি নির্ভুলভাবে পড়া যায় না (টেবিলের ঘর হারিয়ে যায়)। একই সূচির Excel (.xlsx) ফাইল দিন।',
      ]);
      return;
    }
    setImportErrors([]);
    status.clear();
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer());
      let best: ReturnType<typeof parseFixtureRows> | null = null;
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: '',
        });
        const r = parseFixtureRows(
          rows as Parameters<typeof parseFixtureRows>[0],
          list,
          tour?.ts.outcomes,
        );
        if (r.fixtures.length) {
          best = r;
          break;
        }
        // Keep the errors of a sheet that had the right columns but wrong rows
        if (!best || (r.errors.length && !/শিরোনামের সারি/.test(r.errors[0]))) best = r;
      }
      if (!best || best.fixtures.length === 0) {
        setImportErrors(best?.errors.length ? best.errors : ['ফাইলে কোনো ম্যাচ পাওয়া যায়নি।']);
        return;
      }
      change(best.fixtures);
      setImportNote(
        `ফাইল থেকে ${best.fixtures.length}টা ম্যাচ পড়া হয়েছে: ${best.changed}টা বদল, ${best.added}টা নতুন, ${best.removed}টা বাদ। ` +
          'নিচে মিলিয়ে দেখে "সেভ করুন" চাপলে সবার জন্য চালু হবে।',
      );
    } catch (e) {
      setImportErrors([`ফাইল পড়া যায়নি: ${(e as Error).message}`]);
    }
  };

  const add = () => {
    const last = list[list.length - 1];
    const a = TOURNAMENT_TEAMS[0].id;
    const b = TOURNAMENT_TEAMS[1].id;
    change(
      addFixture(list, {
        date: last?.date ?? '2026-11-17',
        time: '12:00',
        stage: 'groupA',
        teamA: { kind: 'team', teamId: a },
        teamB: { kind: 'team', teamId: b },
      }).list,
    );
  };

  const remove = (fx: Fixture) => {
    if (!confirm(`ম্যাচ ${fx.no} মুছে ফেলবেন?`)) return;
    try {
      change(deleteFixture(list, fx.id, outcome(fx.id)));
    } catch {
      alert('এই ম্যাচের স্কোর আছে, তাই মোছা যাবে না। আগে "স্কোর" ট্যাব থেকে স্কোর মুছুন।');
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        এখন চালু:{' '}
        {dataSource('fixtures') === 'built-in'
          ? 'কোডের আসল ফিক্সচার'
          : `আপনার সেভ করা (${new Date(dataSource('fixtures')).toLocaleString()})`}
        । সেভ না করা পর্যন্ত কেউ বদল দেখবে না। স্কোর আছে এমন ম্যাচের দল বদলানো যায় না।
      </p>
      <div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <p className="text-sm font-semibold">Excel ফাইল থেকে পুরো ফিক্সচার</p>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          কমিটির Excel (Match No, Date, Time, Team A, Team B, Stage কলামসহ) দিন। আগে নিচে দেখাবে,
          সেভ চাপলে তবেই সবার জন্য চালু হবে। ম্যাচ নম্বর একই থাকলে আগের স্কোর সেই ম্যাচেই থাকবে।
        </p>
        <label className={`${btn.secondary} inline-block cursor-pointer py-2 text-sm`}>
          ফাইল বাছুন (.xlsx)
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            className="sr-only"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {importNote && (
          <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {importNote}
          </p>
        )}
        {importErrors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
            {importErrors.slice(0, 12).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {importErrors.length > 12 && <li>আরও {importErrors.length - 12}টা সমস্যা…</li>}
          </ul>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((fx, i) => {
          const o = outcome(fx.id);
          // A match with a score keeps its teams; a started one asks first.
          // An abandoned one too, until the abandon is undone.
          const lockTeams = hasScore(o) || !!fx.abandoned;
          const askTeams = () =>
            editLevel(o, 'teams') === 'ok' || confirm(`ম্যাচ ${fx.no} শুরু হয়ে গেছে। তবুও দল বদলাবেন?`);
          const warnings = validateFixture(fx, list);
          const set = (patch: Partial<Fixture>) => change(updateFixture(list, fx.id, patch));
          return (
            <li
              key={fx.id}
              className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="number"
                  aria-label="ম্যাচ নম্বর"
                  className={`${small} w-16`}
                  value={fx.no}
                  onChange={(e) => set({ no: Number(e.target.value) })}
                />
                <input
                  type="date"
                  aria-label="তারিখ"
                  className={small}
                  value={fx.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
                <input
                  type="time"
                  aria-label="সময়"
                  className={small}
                  value={fx.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
                <select
                  aria-label="পর্ব"
                  className={small}
                  value={fx.stage}
                  onChange={(e) => set({ stage: e.target.value as StageId })}
                >
                  {STAGES.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                {fx.abandoned ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    পরিত্যক্ত
                  </span>
                ) : (
                  hasScore(o) && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      স্কোর আছে
                    </span>
                  )
                )}
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className={small}
                    disabled={i === 0}
                    onClick={() => change(moveFixture(list, fx.id, -1))}
                    aria-label="ওপরে"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={small}
                    disabled={i === list.length - 1}
                    onClick={() => change(moveFixture(list, fx.id, 1))}
                    aria-label="নিচে"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${small} text-red-600`}
                    onClick={() => remove(fx)}
                    aria-label="মুছুন"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <SlotPicker
                  value={fx.teamA}
                  disabled={lockTeams}
                  onChange={(s) => askTeams() && set({ teamA: s })}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">বনাম</span>
                <SlotPicker
                  value={fx.teamB}
                  disabled={lockTeams}
                  onChange={(s) => askTeams() && set({ teamB: s })}
                />
              </div>
              {canAbandon(fx.stage) && (
                <label className="mt-1.5 flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-amber-600"
                    checked={!!fx.abandoned}
                    onChange={(e) => {
                      const on = e.target.checked;
                      const ask = on
                        ? `ম্যাচ ${fx.no} পরিত্যক্ত ঘোষণা করবেন? ফলাফল হবে "ফল হয়নি", দুই দল ১ পয়েন্ট করে পাবে।` +
                          (hasScore(o)
                            ? ' এ পর্যন্ত যে স্কোর হয়েছে তা পয়েন্ট বা NRR-এ ধরা হবে না।'
                            : '')
                        : `ম্যাচ ${fx.no}-এর পরিত্যক্ত ঘোষণা তুলে নেবেন?`;
                      if (confirm(ask)) change(setAbandoned(list, fx.id, on));
                    }}
                  />
                  বৃষ্টি বা অন্য কারণে পরিত্যক্ত (দুই দল ১ পয়েন্ট)
                </label>
              )}
              {warnings.length > 0 && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  ⚠ {warnings.map((w) => WARN[w]).join(' · ')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className={btn.secondary} onClick={add}>
        + নতুন ম্যাচ যোগ করুন
      </button>
      <div className="sticky bottom-20 flex flex-wrap gap-2 rounded-xl bg-white/95 py-2 md:bottom-2 dark:bg-slate-900/95">
        <button
          type="button"
          className={`${btn.primary} flex-1`}
          disabled={!dirty || status.busy}
          onClick={() =>
            void status.run(async () => {
              await saveData('fixtures', list, email);
              setDirty(false);
            })
          }
        >
          {status.busy ? 'সেভ হচ্ছে…' : 'সেভ করুন ও সবার জন্য চালু করুন'}
        </button>
        <button
          type="button"
          className={btn.secondary}
          disabled={status.busy}
          onClick={() => {
            if (!confirm('আপনার সব বদল বাদ দিয়ে কোডের আসল ফিক্সচারে ফিরে যাবেন?')) return;
            void status.run(async () => {
              await resetData('fixtures');
              setList(structuredClone([...FIXTURES]));
              setDirty(false);
              return 'আসল ফিক্সচারে ফিরে গেছে।';
            });
          }}
        >
          আসলটায় ফিরুন
        </button>
      </div>
      <StatusLine msg={status.msg} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        PDF ফাইলটা আলাদা: ফিক্সচার বদলালে নতুন PDF বানাতে হবে (python scripts/build-fixture-pdf.py)।
      </p>
    </Card>
  );
}
