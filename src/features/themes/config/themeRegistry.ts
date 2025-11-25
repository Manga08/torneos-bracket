import type { AppTheme, ThemeId } from '../types/themeTypes';
import { defaultTheme } from './defaultTheme';
import { valorantTheme } from './valorantTheme';

export const THEME_CONFIGS: Record<ThemeId, AppTheme> = {
  default: defaultTheme,
  valorant: valorantTheme,
};

export function getThemeById(themeId: ThemeId | string | undefined | null): AppTheme {
  if (!themeId || !(themeId in THEME_CONFIGS)) {
    return THEME_CONFIGS.default;
  }
  return THEME_CONFIGS[themeId as ThemeId];
}

export const AVAILABLE_THEMES: AppTheme[] = Object.values(THEME_CONFIGS);
