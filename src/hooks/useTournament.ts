import { useEffect, useState } from 'react';
import { matchRepository } from '../db/repository';
import type { Match } from '../engine/types';
import { tournamentState, type TournamentState } from '../tournament/standings';

/** Matches on this device and the tournament progress worked out from them. */
export function useTournament(): { matches: Match[]; ts: TournamentState } | null {
  const [value, setValue] = useState<{ matches: Match[]; ts: TournamentState } | null>(null);
  useEffect(() => {
    let alive = true;
    void matchRepository.list().then((matches) => {
      if (alive) setValue({ matches, ts: tournamentState(matches) });
    });
    return () => {
      alive = false;
    };
  }, []);
  return value;
}
