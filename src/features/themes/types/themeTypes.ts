export type ThemeId = 'default' | 'valorant';

export interface AppTheme {
  id: ThemeId;
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
