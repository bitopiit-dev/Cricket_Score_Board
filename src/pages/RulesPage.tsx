import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '../components/common/BottomNav';
import { Header } from '../components/common/Header';
import { inputClass } from '../components/common/controls';
import { RULES_ORGANISER, RULE_SECTIONS, searchRules } from '../data/rules';
import { useFormat } from '../hooks/useFormat';
import { usePrefs } from '../store/prefsStore';

export default function RulesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const [query, setQuery] = useState('');
  const sections = searchRules(query);
  const searching = query.trim() !== '';
  const total = RULE_SECTIONS.reduce((n, s) => n + s.rules.length, 0);

  return (
    <div className="min-h-dvh pb-24">
      <Header title={t('rules.title')} />
      <main className="mx-auto flex max-w-lg flex-col gap-3 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('rules.subtitle', { n: f.num(total) })}
        </p>
        <input
          type="search"
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('rules.search')}
          aria-label={t('rules.search')}
        />

        {sections.length === 0 && (
          <p className="py-10 text-center text-slate-500">{t('rules.noResults')}</p>
        )}

        {sections.map((s, i) => (
          <details
            // Re-mount when searching so matching sections open automatically.
            key={`${s.id}-${searching}`}
            open={searching || i === 0}
            className="group rounded-2xl bg-white shadow-sm dark:bg-slate-900"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {f.num(RULE_SECTIONS.findIndex((x) => x.id === s.id) + 1)}
              </span>
              <span className="flex-1 font-semibold">{s.title[lang]}</span>
              <span className="text-xs text-slate-400">{f.num(s.rules.length)}</span>
              <span aria-hidden className="text-slate-400 transition group-open:rotate-90">
                ›
              </span>
            </summary>
            <ol className="flex flex-col gap-2 px-3 pb-3">
              {s.rules.map((r) => (
                <li
                  key={r.n}
                  className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <span className="tabular w-7 shrink-0 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    {f.num(r.n)}.
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="leading-relaxed">{r.text[lang]}</p>
                    {r.inApp && (
                      <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {t('rules.inApp')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}

        <footer className="mt-4 border-t border-slate-200 pt-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {t('rules.organisedBy')}: <span className="font-semibold">{RULES_ORGANISER[lang]}</span>
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
