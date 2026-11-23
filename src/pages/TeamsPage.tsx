import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { TOURNAMENT_TEAMS, type GroupId } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { QUALIFIERS } from '../tournament/format';
import { groupCards, type GroupCard } from '../tournament/teamView';

/**
 * Teams tab: the 12 tournament teams by group; tap one for its squad.
 * Once a group has started, its cards follow the points table and show each
 * team's place, points, wins and losses.
 */
export default function TeamsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  // Standings load in the background; the cards show at once without them.
  const tour = useTournament();
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5 p-4 md:max-w-3xl lg:max-w-5xl">
      <PageTitle>
        {t('tabs.teams')}{' '}
        <span className="text-slate-500 dark:text-slate-400">
          ({f.num(TOURNAMENT_TEAMS.length)})
        </span>
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {(['A', 'B'] as GroupId[]).map((g) => (
          <GroupSection
            key={g}
            group={g}
            cards={groupCards(g, tour?.ts.tables[g === 'A' ? 'groupA' : 'groupB'])}
          />
        ))}
      </div>
    </main>
  );
}

function GroupSection({ group, cards }: { group: GroupId; cards: GroupCard[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <section aria-label={t('points.group', { g: group })}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-slate-200 pb-2 dark:border-slate-800">
        <h2 className="font-display text-2xl font-bold tracking-wide">
          {t('points.group', { g: group })}
        </h2>
        <p className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-emerald-500" />
          {t('points.qualifySuperSix', { n: f.num(QUALIFIERS.group) })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.team.id}>
            <TeamCard card={card} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamCard({ card: { team, row, position } }: { card: GroupCard }) {
  const { t } = useTranslation();
  const f = useFormat();
  const favorite = usePrefs((s) => s.favoriteTeam) === team.id;
  const captain = team.players.find((p) => p.captain);
  const qualifying = position !== undefined && position <= QUALIFIERS.group;
  const squad = team.players.length;

  return (
    <Link
      to={`/team/${team.id}`}
      data-code={team.short}
      style={
        {
          '--c': team.color,
          // Ignored (plain card) where color-mix is not supported
          ...(favorite && {
            boxShadow: `inset 0 0 0 1px ${team.color}, 0 0 0 4px color-mix(in srgb, ${team.color} 22%, transparent)`,
          }),
        } as CSSProperties
      }
      className={[
        'relative flex h-full flex-col items-center overflow-hidden rounded-2xl p-3 pb-2.5 text-center shadow-sm transition-colors',
        // A wash of the team colour behind the logo, fading out before the name
        'bg-white bg-[radial-gradient(130%_70%_at_50%_0%,color-mix(in_srgb,var(--c)_18%,transparent),transparent_62%)]',
        'dark:bg-slate-900 dark:bg-[radial-gradient(130%_70%_at_50%_0%,color-mix(in_srgb,var(--c)_36%,transparent),transparent_62%)]',
        'active:bg-slate-50 dark:active:bg-slate-800',
        // The team code, big and faint in the corner like a shirt number
        'before:pointer-events-none before:absolute before:top-1 before:right-2.5 before:font-display before:text-6xl before:leading-none before:font-extrabold before:text-(--c) before:opacity-15 before:content-[attr(data-code)] dark:before:opacity-25',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c)',
        favorite
          ? 'border border-(--c)'
          : 'border border-slate-200 hover:border-(--c) dark:border-slate-800 dark:hover:border-(--c)',
      ].join(' ')}
    >
      <span className="relative flex h-6 self-stretch">
        {position !== undefined && (
          <span
            className={`rounded-md px-2 font-display text-sm leading-6 font-bold tracking-wide ${
              qualifying
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t(`slot.ord${position}`)}
            {qualifying && <span className="sr-only"> {t('points.qualifiedMark')}</span>}
          </span>
        )}
      </span>
      {/* Logo in a ring of the team colour */}
      <span
        className="relative mt-0.5 mb-2.5 rounded-full p-1"
        style={{
          backgroundColor: team.color,
          boxShadow: `0 8px 22px -8px color-mix(in srgb, ${team.color} 75%, transparent)`,
        }}
      >
        <span className="block rounded-full bg-white p-0.5 dark:bg-slate-900">
          <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="hero" />
        </span>
      </span>
      <span className="relative flex min-h-10 items-center justify-center text-[15px] leading-tight font-bold break-words">
        <span lang="en">{team.name}</span>
        {favorite && (
          <>
            <span aria-hidden className="ml-1.5 text-base text-amber-500">
              ★
            </span>
            {/* After the name, so a screen reader says "DDC (your favourite team)" */}
            <span className="sr-only">{t('favorite.star')}</span>
          </>
        )}
      </span>
      {captain && (
        <span className="relative mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          {t('role.captain')} <span lang="en">{captain.name}</span>
        </span>
      )}
      {row ? (
        <span className="relative mt-auto grid grid-cols-3 self-stretch border-t border-slate-200 pt-2 sm:grid-cols-4 dark:border-slate-800">
          <Stat value={f.num(row.points)} label={t('points.points')} accent />
          <Stat value={f.num(row.won)} label={t('points.wonLong')} />
          <Stat value={f.num(row.lost)} label={t('points.lostLong')} />
          <Stat value={f.num(squad)} label={t('team.squad')} wide />
        </span>
      ) : (
        squad > 0 && (
          <span className="relative mt-auto pt-2 text-xs text-slate-600 dark:text-slate-400">
            {t('team.playerCount', { n: f.num(squad), count: squad })}
          </span>
        )
      )}
    </Link>
  );
}

function Stat({
  value,
  label,
  accent,
  wide,
}: {
  value: string;
  label: string;
  accent?: boolean;
  /** Only from the `sm` width up, where four columns fit. */
  wide?: boolean;
}) {
  return (
    <span className={`flex-col ${wide ? 'hidden sm:flex' : 'flex'}`}>
      <span
        className={`font-display text-xl leading-tight font-bold tabular-nums ${
          accent ? 'text-amber-700 dark:text-amber-400' : ''
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-slate-600 dark:text-slate-400">{label}</span>
    </span>
  );
}
