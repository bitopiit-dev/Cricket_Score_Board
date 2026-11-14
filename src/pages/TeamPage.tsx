import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { SectionTitle } from '../components/common/controls';
import { SubPageTitle } from '../components/layout/AppShell';
import { PlayerAvatar, TeamAvatar } from '../components/common/TeamAvatar';
import { SQUAD_LIMITS } from '../config/tournament';
import {
  duplicateNames,
  findTeam,
  playerDisplayName,
  squadWarnings,
  type PlayerRole,
  type TournamentPlayer,
  type TournamentTeam,
} from '../data/teams';
import { captainMark } from '../utils/matchText';
import { useFormat } from '../hooks/useFormat';

export default function TeamPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useParams();
  const team = findTeam(id);

  // Coming from the bottom of the home page: start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!team) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <SubPageTitle title={t('tabs.teams')} parent="/teams" />
        <p className="p-10 text-center text-slate-500">{t('team.notFound')}</p>
      </main>
    );
  }

  const xi = team.players.filter((p) => !p.substitute);
  const subs = team.players.filter((p) => p.substitute);

  return (
    <div>
      <div className="mx-auto max-w-lg px-4 pt-4">
        <SubPageTitle title={t('tabs.teams')} parent="/teams" />
      </div>
      <section
        className="mx-4 mt-3 flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-6 text-center shadow-sm sm:mx-auto sm:max-w-lg dark:bg-slate-900"
        style={{ borderBottom: `4px solid ${team.color}` }}
      >
        <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="xl" />
        <h2 lang="en" className="text-2xl font-bold">
          {team.name}
        </h2>
        {team.players.length > 0 && (
          <p className="text-sm text-slate-500">
            {t('team.playerCount', { n: f.num(team.players.length), count: team.players.length })}
          </p>
        )}
      </section>

      <main className="mx-auto flex max-w-lg flex-col gap-5 p-4">
        {squadWarnings(team, SQUAD_LIMITS).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-semibold">⚠️ {t('team.adminWarning')}</p>
            <ul className="mt-1 list-disc pl-5">
              {squadWarnings(team, SQUAD_LIMITS).map((w) => (
                <li key={w}>
                  {t(`team.warn_${w}`, {
                    n: f.num(team.players.length),
                    max: f.num(SQUAD_LIMITS.maxPlayers),
                    subs: f.num(SQUAD_LIMITS.maxSubstitutes),
                    names: duplicateNames(team).join(', '),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {team.players.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-slate-500 dark:bg-slate-900">
            {t('team.noPlayers')}
          </p>
        ) : (
          <>
            <PlayerGrid title={t('team.players')} players={xi} team={team} />
            {subs.length > 0 && (
              <PlayerGrid title={t('team.substitutes')} players={subs} team={team} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

const ROLE_BADGE: Record<PlayerRole, string> = {
  batter: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  bowler: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  allRounder: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  wicketKeeper: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] leading-tight font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function PlayerGrid({
  title,
  players,
  team,
}: {
  title: string;
  players: TournamentPlayer[];
  team: TournamentTeam;
}) {
  const { t } = useTranslation();
  if (players.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => {
          return (
            <li
              key={p.id}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-slate-900"
            >
              <PlayerAvatar name={p.name} color={team.color} photo={p.photo} size="lg" />
              <span lang="en" className="text-sm leading-tight font-semibold break-words">
                {playerDisplayName(p)}
                {captainMark(p)}
              </span>
              {p.shortName && (
                <span className="-mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('team.nickname', { name: p.shortName })}
                </span>
              )}
              {(p.captain || p.viceCaptain || p.role) && (
                <span className="flex flex-wrap justify-center gap-1">
                  {p.captain && (
                    <Badge className="bg-amber-400 text-amber-950">{t('role.captain')}</Badge>
                  )}
                  {p.viceCaptain && (
                    <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                      {t('role.viceCaptain')}
                    </Badge>
                  )}
                  {p.role && <Badge className={ROLE_BADGE[p.role]}>{t(`role.${p.role}`)}</Badge>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
