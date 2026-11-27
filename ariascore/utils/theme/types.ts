
export type ThemePreference =
  | "system"
  | "light"
  | "dark";

export type ResolvedTheme =
  | "light"
  | "dark";

export interface ThemeColors {
  // Backgrounds and surfaces
  background: string;
  pageBackground: string;
  surface: string;
  surfaceSecondary: string;
  elevated: string;

  // Typography
  text: string;
  secondaryText: string;
  tertiaryText: string;
  disabledText: string;

  // Borders
  border: string;
  separator: string;

  // Brand
  accent: string;
  accentLight: string;
  accentVeryLight: string;
  onAccent: string;

  // Semantic colours
  success: string;
  warning: string;
  danger: string;
  favourite: string;

  // Interactive controls
  selectedBackground: string;
  pressedBackground: string;
  trackInactive: string;
  trackActive: string;

  // Overlays
  overlay: string;

  // Reader
  readerBackground: string;
  readerChrome: string;
}
