import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  darkMode: boolean;
  highContrast: boolean;
  largeText: boolean;
  voiceGuidance: boolean;
  vibration: boolean;
  fontScale: number;
  reducedMotion: boolean;
}

const initialState: SettingsState = {
  darkMode: false,
  highContrast: false,
  largeText: false,
  voiceGuidance: false,
  vibration: true,
  fontScale: 1.0,
  reducedMotion: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    toggleHighContrast(state) {
      state.highContrast = !state.highContrast;
    },
    toggleLargeText(state) {
      state.largeText = !state.largeText;
    },
    toggleVoiceGuidance(state) {
      state.voiceGuidance = !state.voiceGuidance;
    },
    toggleVibration(state) {
      state.vibration = !state.vibration;
    },
    setFontScale(state, action: PayloadAction<number>) {
      state.fontScale = Math.max(0.8, Math.min(2.0, action.payload));
    },
    setReducedMotion(state, action: PayloadAction<boolean>) {
      state.reducedMotion = action.payload;
    },
    resetSettings(state) {
      return initialState;
    },
  },
});

export const {
  toggleDarkMode,
  toggleHighContrast,
  toggleLargeText,
  toggleVoiceGuidance,
  toggleVibration,
  setFontScale,
  setReducedMotion,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
