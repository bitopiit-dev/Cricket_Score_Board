import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { SectionTitle } from '../components/common/controls';
import { PlayerAvatar, TeamAvatar } from '../components/common/TeamAvatar';
import { findTeam, type TournamentPlayer, type TournamentTeam } from '../data/teams';
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
      <div className="min-h-dvh">
        <Header title={t('team.notFound')} backTo="/" />
        <p className="p-10 text-center text-slate-500">{t('team.notFound')}</p>
      </div>
    );
  }

  const xi = team.players.filter((p) => !p.substitute);
  const subs = team.players.filter((p) => p.substitute);

  return (
    <div className="min-h-dvh">
      <Header title={team.name} backTo="/" />
      <section
        className="flex flex-col items-center gap-3 bg-white px-4 py-6 text-center shadow-sm dark:bg-slate-900"
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
          const tags = [p.captain && t('role.captain'), p.role && t(`role.${p.role}`)].filter(
            Boolean,
          );
          return (
            <li
              key={p.id}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-slate-900"
            >
              <PlayerAvatar name={p.name} color={team.color} photo={p.photo} size="lg" />
              <span lang="en" className="text-sm leading-tight font-semibold break-words">
                {p.name}
              </span>
              {tags.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {tags.join(' · ')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
