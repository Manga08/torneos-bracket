import type { AppTheme } from '../types/themeTypes';

export const defaultTheme: AppTheme = {
  id: 'default',
  name: 'Default Dark',
  description: 'Tema oscuro moderno y minimalista.',
  previewColor: '#6366f1',
  palette: {
    background: '#0f1016',
    backgroundAlt: '#1e1b4b',
    surface: '#1a1b26',
    surfaceAlt: '#24283b',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.1)',
    accentDanger: '#ef4444',
    textMain: '#fafafa',
    textMuted: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.1)',
    glow: '#1e1b4b',
  },
  typography: {
    headingFont: '"Inter", system-ui, sans-serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    headingTransform: 'none',
    headingLetterSpacing: 'normal',
  },
  shapes: {
    cardRadius: '0.75rem',
    buttonRadius: '0.5rem',
    useDiagonals: false,
    borderWidth: '1px',
  },
};
