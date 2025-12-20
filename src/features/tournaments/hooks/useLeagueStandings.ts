import { useMemo } from 'react';

import type { Match, Participant } from '@/types/database';

import type { LeagueConfig } from '../types/league';
import { calculateLeagueTable } from '../utils/leagueLogic';

export const useLeagueStandings = (
  participants: Participant[],
  matches: Match[],
  config?: LeagueConfig,
) => {
  const standings = useMemo(() => {
    if (!participants || !matches) return [];
    return calculateLeagueTable(participants, matches, config);
  }, [participants, matches, config]);

  return standings;
};
