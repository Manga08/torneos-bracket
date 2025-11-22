import { useEffect } from 'react';
import { THEME_CONFIGS } from '../lib/themes';

export const useBodyTheme = (themeId?: string) => {
  useEffect(() => {
    // Remove any existing theme classes
    const classes = document.body.classList;
    const themeClasses = Array.from(classes).filter(c => c.startsWith('theme-'));
    themeClasses.forEach(c => classes.remove(c));

    // Add new theme class if valid
    if (themeId && THEME_CONFIGS[themeId]) {
      classes.add(`theme-${themeId}`);
    }

    // Cleanup on unmount or change
    return () => {
      if (themeId) {
        classes.remove(`theme-${themeId}`);
      }
    };
  }, [themeId]);
};
