export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    muted: string;
    border: string;
    text: string;
    textMuted: string;
    card: string;
    cardHover: string;
  };
}
