import { describe, it, expect } from 'vitest';

import { fifaTheme } from './fifaTheme';
import { getThemeById, AVAILABLE_THEMES } from './themeRegistry';

describe('Theme Registry', () => {
  it('should retrieve the fifa theme by id', () => {
    const theme = getThemeById('fifa');
    expect(theme).toBeDefined();
    expect(theme.id).toBe('fifa');
    expect(theme.name).toBe('EA FC Pitch');
  });

  it('should include fifa theme in AVAILABLE_THEMES', () => {
    const fifa = AVAILABLE_THEMES.find((t) => t.id === 'fifa');
    expect(fifa).toBeDefined();
    expect(fifa).toEqual(fifaTheme);
  });

  it('should have correct palette for fifa theme', () => {
    const theme = getThemeById('fifa');
    // @ts-expect-error - Testing that primary is not in the palette object structure defined in types
    expect(theme.palette.primary).toBeUndefined();
    expect(theme.palette.background).toBe('#050810');
    expect(theme.palette.accent).toBe('#6FFF38');
    expect(theme.previewColor).toBe('#6FFF38');
  });
});
