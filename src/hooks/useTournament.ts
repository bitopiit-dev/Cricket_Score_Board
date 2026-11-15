import { useEffect, useState } from 'react';
import { matchRepository } from '../db/repository';
import type { Match } from '../engine/types';
import { tournamentState, type TournamentState } from '../tournament/standings';

/**
 * Matches on this device and the tournament progress worked out from them.
 * With `refreshMs`, reloads on that interval (for live scores).
 */
export function useTournament(
  refreshMs?: number,
): { matches: Match[]; ts: TournamentState } | null {
  const [value, setValue] = useState<{ matches: Match[]; ts: TournamentState } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void matchRepository.list().then((matches) => {
        if (alive) setValue({ matches, ts: tournamentState(matches) });
      });
    load();
    const timer = refreshMs ? setInterval(load, refreshMs) : undefined;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [refreshMs]);
  return value;
}

/** The current time, updated every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
