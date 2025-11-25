import type { AppTheme } from '../types/themeTypes';

export const valorantTheme: AppTheme = {
  id: 'valorant',
  name: 'Valorant Protocol',
  description: 'Inspirado en la estética táctica de Valorant.',
  previewColor: '#FF4655',
  palette: {
    background: '#0F1923',
    backgroundAlt: '#111823',
    surface: 'rgba(15, 25, 35, 0.9)',
    surfaceAlt: '#1F2731',
    accent: '#FF4655',
    accentSoft: 'rgba(255, 70, 85, 0.15)',
    accentDanger: '#FF4655',
    textMain: '#ECE8E1',
    textMuted: '#8B978F',
    border: 'rgba(236, 232, 225, 0.15)',
    glow: '#FF4655'
  },
  typography: {
    headingFont: '"Teko", sans-serif',
    bodyFont: '"Rajdhani", sans-serif',
    headingTransform: 'uppercase',
    headingLetterSpacing: '1px'
  },
  shapes: {
    cardRadius: '0px',
    buttonRadius: '0px',
    useDiagonals: true,
    borderWidth: '1px'
  },
  assets: {
    backgroundImage: '/themes/valorant/bg-main.jpg',
    overlayPattern: '/themes/valorant/pattern-diagonal.svg',
    logoMark: '/themes/valorant/logo-mark.svg'
  }
};
