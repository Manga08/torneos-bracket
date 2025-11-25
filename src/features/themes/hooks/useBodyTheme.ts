import { useEffect } from 'react';
import { THEME_CONFIGS } from '../config/themeRegistry';
import type { ThemeId } from '../types/themeTypes';

export const useBodyTheme = (themeId?: string | ThemeId | null) => {
  useEffect(() => {
    // Remove any existing theme classes
    const classes = document.body.classList;
    const themeClasses = Array.from(classes).filter(c => c.startsWith('theme-'));
    themeClasses.forEach(c => classes.remove(c));

    // Add new theme class if valid
    if (themeId && (themeId in THEME_CONFIGS)) {
      classes.add(`theme-${themeId}`);
    } else {
      // Ensure default theme is applied if no valid theme is provided
      // This is optional but good for consistency if we want explicit default class
      classes.add('theme-default');
    }

    // Cleanup on unmount or change
    return () => {
      if (themeId && (themeId in THEME_CONFIGS)) {
        classes.remove(`theme-${themeId}`);
      }
      classes.remove('theme-default');
    };
  }, [themeId]);
};
