import type { AppTheme } from '../types/themeTypes';

export const fifaTheme: AppTheme = {
  id: 'fifa',
  name: 'EA FC Pitch',
  description:
    'Tema inspirado en EA Sports FC: fondo nocturno, pitch verde neón y triángulos en movimiento.',
  previewColor: '#6FFF38',
  previewGradient: 'linear-gradient(135deg, #050810 0%, #0B1420 35%, #022c22 80%, #6FFF38 100%)',
  palette: {
    background: '#050810',
    backgroundAlt: '#0B1420',
    surface: '#0B1420',
    surfaceAlt: '#111827',
    accent: '#6FFF38',
    accentSoft: 'rgba(111, 255, 56, 0.12)',
    accentDanger: '#ef4444',
    textMain: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: '#1F2937',
    glow: 'rgba(111, 255, 56, 0.4)',
  },
  typography: {
    headingFont: '"Barlow Condensed", system-ui, sans-serif',
    bodyFont: '"Barlow", system-ui, sans-serif',
    headingTransform: 'uppercase',
    headingLetterSpacing: '0.05em',
  },
  shapes: {
    cardRadius: '18px',
    buttonRadius: '999px',
    useDiagonals: true,
    borderWidth: '1px',
  },
};
