import { useCallback } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from './useAppSelector';
import { LightColors, DarkColors, HighContrastColors, ColorPalette } from '../theme/colors';

export interface AccessibilityHelpers {
  colors: ColorPalette;
  textScale: number;
  speak: (text: string) => void;
  haptic: (type: 'light' | 'medium' | 'heavy') => void;
  highContrast: boolean;
  darkMode: boolean;
  largeText: boolean;
  voiceGuidance: boolean;
  vibration: boolean;
  reducedMotion: boolean;
}

export function useAccessibility(): AccessibilityHelpers {
  const { highContrast, darkMode, largeText, voiceGuidance, vibration, fontScale, reducedMotion } =
    useAppSelector((s) => s.settings);

  const colors: ColorPalette = highContrast
    ? HighContrastColors
    : darkMode
    ? DarkColors
    : LightColors;

  const textScale = largeText ? 1.3 : fontScale;

  const speak = useCallback(
    (text: string) => {
      if (voiceGuidance) {
        Speech.speak(text, { rate: 0.85, pitch: 1.0 });
      }
    },
    [voiceGuidance]
  );

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'heavy') => {
      if (!vibration) return;
      const impactStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[type];
      Haptics.impactAsync(impactStyle);
    },
    [vibration]
  );

  return {
    colors,
    textScale,
    speak,
    haptic,
    highContrast,
    darkMode,
    largeText,
    voiceGuidance,
    vibration,
    reducedMotion,
  };
}
