import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Segmented } from '../components/common/controls';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { toast } from '../components/common/Toast';
import { SubPageTitle } from '../components/layout/AppShell';
import { TOURNAMENT_TEAMS } from '../data/teams';
import { disablePush, enablePush, PushError, pushSupport } from '../push/client';
import { usePrefs, type PushPrefs } from '../store/prefsStore';

/** #/alerts: switch match alerts on or off and choose teams and how much to hear. */
export default function AlertsPage() {
  const { t } = useTranslation();
  const push = usePrefs((s) => s.push);
  const favorite = usePrefs((s) => s.favoriteTeam);
  const [busy, setBusy] = useState(false);
  const support = pushSupport();
  const on = !!push;

  async function apply(next: PushPrefs | null) {
    setBusy(true);
    try {
      if (next) {
        const firstTime = !push;
        await enablePush(next);
        toast(t(firstTime ? 'alerts.on' : 'alerts.saved'));
      } else {
        await disablePush();
        toast(t('alerts.off'));
      }
    } catch (e) {
      const code = e instanceof PushError ? e.code : 'failed';
      toast(t(`alerts.${code}`));
    } finally {
      setBusy(false);
    }
  }

  const toggleTeam = (id: string) => {
    if (!push) return;
    const has = push.teams.includes(id);
    const teams = has ? push.teams.filter((x) => x !== id) : [...push.teams, id];
    // Picking all twelve is the same as "All teams"
    void apply({ ...push, teams: teams.length === TOURNAMENT_TEAMS.length ? [] : teams });
  };

  const blocked = !on && support !== 'ok';

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
      <SubPageTitle title={t('alerts.title')} parent="/more" />

      <label
        className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 ${
          blocked || busy ? 'opacity-60' : 'cursor-pointer'
        }`}
      >
        <span className="flex-1">
          <span className="block font-semibold">{t('alerts.title')}</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {t('alerts.hint')}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={blocked || busy}
          onChange={(e) =>
            void apply(
              e.target.checked ? { teams: favorite ? [favorite] : [], level: 'key' } : null,
            )
          }
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-bpl-green peer-focus-visible:ring-2 peer-focus-visible:ring-bpl-green/50 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5 dark:bg-slate-700"
        />
      </label>

      {support !== 'ok' && support !== 'off' && (
        <p
          role="note"
          className="rounded-2xl border border-dashed border-bpl-yellow/60 p-4 text-sm text-slate-700 dark:text-slate-300"
        >
          {t(`alerts.${support}`)}
        </p>
      )}

      {push && (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('alerts.level')}</h2>
            <Segmented
              value={push.level}
              options={[
                { value: 'key', label: t('alerts.levelKey') },
                { value: 'result', label: t('alerts.levelResult') },
              ]}
              onChange={(level) => level !== push.level && void apply({ ...push, level })}
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t(push.level === 'key' ? 'alerts.levelKeyHint' : 'alerts.levelResultHint')}
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('alerts.teams')}</h2>
            <button
              type="button"
              aria-pressed={push.teams.length === 0}
              disabled={busy}
              onClick={() => push.teams.length && void apply({ ...push, teams: [] })}
              className={chip(push.teams.length === 0)}
            >
              {t('alerts.allTeams')}
            </button>
            <ul className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              {TOURNAMENT_TEAMS.map((team) => {
                const picked = push.teams.includes(team.id);
                return (
                  <li key={team.id}>
                    <button
                      type="button"
                      aria-pressed={picked}
                      disabled={busy}
                      onClick={() => toggleTeam(team.id)}
                      className={`${chip(picked)} flex w-full items-center gap-2 text-left`}
                    >
                      <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />
                      <span className="min-w-0 flex-1 leading-tight break-words">{team.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}

const chip = (active: boolean) =>
  `min-h-11 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
    active
      ? 'bg-night-950 text-bpl-yellow ring-2 ring-bpl-yellow dark:bg-night-900'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }`;
