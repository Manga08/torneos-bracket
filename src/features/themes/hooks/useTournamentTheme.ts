import { useMemo } from 'react';

import { getThemeById } from '../config/themeRegistry';
import type { ThemeId } from '../types/themeTypes';

interface UseTournamentThemeParams {
  themeIdFromTournament?: string | null;
}

export function useTournamentTheme({ themeIdFromTournament }: UseTournamentThemeParams) {
  const themeId = (themeIdFromTournament as ThemeId) ?? 'default';

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  return { themeId, theme };
}
