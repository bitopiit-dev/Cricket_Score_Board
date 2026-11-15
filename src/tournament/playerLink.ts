import { findTeam, type TournamentPlayer } from '../data/teams';
import { playerKey } from './awards';

/** The squad player behind a stats row (team + name), so the row can open their profile. */
export function squadPlayer(teamId: string, name: string): TournamentPlayer | undefined {
  const key = playerKey(teamId, name);
  return findTeam(teamId)?.players.find((p) => playerKey(teamId, p.name) === key);
}

export const playerPath = (teamId: string, playerId: string) =>
  `/player/${encodeURIComponent(teamId)}/${encodeURIComponent(playerId)}`;
