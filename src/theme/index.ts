export * from './colors';
export * from './typography';
export * from './spacing';

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { LightColors, DarkColors, HighContrastColors } from './colors';

export const PaperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: LightColors.primary,
    background: LightColors.background,
    surface: LightColors.surface,
    error: LightColors.error,
  },
};

export const PaperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DarkColors.primary,
    background: DarkColors.background,
    surface: DarkColors.surface,
    error: DarkColors.error,
  },
};

export const PaperHighContrastTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: HighContrastColors.primary,
    background: HighContrastColors.background,
    surface: HighContrastColors.surface,
    error: HighContrastColors.error,
  },
};
