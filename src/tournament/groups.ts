import { FIXTURES, type Fixture } from '../data/fixtures';
import { TOURNAMENT_TEAMS, findTeam, type GroupId, type TournamentTeam } from '../data/teams';

/**
 * The group a team plays in, read from the group-stage fixtures: the fixture
 * list is the one source of truth, so groups can never disagree with who
 * actually plays whom. The team list's own `group` is only a fallback for a
 * team with no group match (or a tie in an odd, half-edited list).
 *
 * This matters because the super admin can publish a team list (players,
 * photos) to Supabase; a list saved before a regroup still carries the old
 * group and would otherwise put a team in the wrong points table.
 */
export function groupOf(
  teamId: string,
  fixtures: readonly Fixture[] = FIXTURES,
): GroupId | undefined {
  let a = 0;
  let b = 0;
  for (const f of fixtures) {
    if (f.stage !== 'groupA' && f.stage !== 'groupB') continue;
    if ([f.teamA, f.teamB].some((s) => s.kind === 'team' && s.teamId === teamId)) {
      if (f.stage === 'groupA') a++;
      else b++;
    }
  }
  if (a !== b) return a > b ? 'A' : 'B';
  return findTeam(teamId)?.group;
}

/** The teams of a group, in team-list order. */
export function teamsOfGroup(
  group: GroupId,
  fixtures: readonly Fixture[] = FIXTURES,
): TournamentTeam[] {
  return TOURNAMENT_TEAMS.filter((t) => groupOf(t.id, fixtures) === group);
}
