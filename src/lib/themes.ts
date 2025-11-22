export interface AppTheme {
  id: string;
  name: string;
  description: string;
  previewColor: string;

  palette: {
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceAlt: string;
    accent: string;
    accentSoft: string;
    accentDanger: string;
    textMain: string;
    textMuted: string;
    border: string;
    glow: string;
  };

  typography: {
    headingFont: string;
    bodyFont: string;
    headingTransform: "none" | "uppercase";
    headingLetterSpacing: string;
  };

  shapes: {
    cardRadius: string;
    buttonRadius: string;
    useDiagonals: boolean;
    borderWidth: string;
  };

  assets?: {
    backgroundImage?: string;
    overlayPattern?: string;
    logoMark?: string;
  };
}

export const THEMES: AppTheme[] = [
  {
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
      glow: '#1e1b4b'
    },
    typography: {
      headingFont: '"Inter", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      headingTransform: 'none',
      headingLetterSpacing: 'normal'
    },
    shapes: {
      cardRadius: '0.75rem',
      buttonRadius: '0.5rem',
      useDiagonals: false,
      borderWidth: '1px'
    }
  },
  {
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
  }
];

export const THEME_CONFIGS: Record<string, AppTheme> = THEMES.reduce((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {} as Record<string, AppTheme>);
