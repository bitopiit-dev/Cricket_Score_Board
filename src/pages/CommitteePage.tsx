import { useTranslation } from 'react-i18next';
import { PlayerAvatar } from '../components/common/TeamAvatar';
import { SubPageTitle } from '../components/layout/AppShell';
import { COMMITTEE_LOGO, COMMITTEE_MEMBERS, COMMITTEE_NAME } from '../data/committee';
import { useFormat } from '../hooks/useFormat';

const ROLE_STYLE = {
  convener: 'bg-emerald-700 text-white',
  memberSecretary: 'bg-amber-400 text-amber-950',
  member: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

export default function CommitteePage() {
  const { t } = useTranslation();
  const f = useFormat();

  return (
    <div>
      <div className="mx-auto max-w-lg px-4 pt-4">
        <SubPageTitle title={t('committee.title')} parent="/more" />
      </div>
      <section className="mx-4 mt-3 flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-6 text-center shadow-sm sm:mx-auto sm:max-w-lg dark:bg-slate-900">
        <img
          src={COMMITTEE_LOGO}
          alt={COMMITTEE_NAME}
          className="h-44 w-auto rounded-xl bg-white p-1"
        />
        <h2 lang="en" className="text-xl font-bold">
          {COMMITTEE_NAME}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('committee.subtitle', { n: f.num(COMMITTEE_MEMBERS.length) })}
        </p>
      </section>

      <main className="mx-auto max-w-lg p-4">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COMMITTEE_MEMBERS.map((m, i) => {
            const name = m.name ?? t('committee.placeholder', { n: f.num(i + 1) });
            return (
              <li
                key={m.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-slate-900"
              >
                <PlayerAvatar name={name} color="#065f46" photo={m.photo} size="lg" />
                <span className="text-sm leading-tight font-semibold break-words">{name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLE[m.role]}`}
                >
                  {t(`committee.role.${m.role}`)}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
