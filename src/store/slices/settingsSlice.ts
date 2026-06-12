import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  darkMode: boolean;
  highContrast: boolean;
  largeText: boolean;
  voiceGuidance: boolean;
  vibration: boolean;
  fontScale: number;
  reducedMotion: boolean;
  /** URL of the deployed Vercel backend (e.g. https://my-app.vercel.app) */
  alertBackendUrl: string;
  /** Whether to use Twilio automatic SMS instead of the native SMS composer */
  twilioSmsEnabled: boolean;
  /** Whether to send email alerts via Resend */
  resendEmailEnabled: boolean;
}

const initialState: SettingsState = {
  darkMode: false,
  highContrast: false,
  largeText: false,
  voiceGuidance: true,   // ON by default — seniors benefit from audio confirmation
  vibration: true,
  fontScale: 1.0,
  reducedMotion: false,
  // Pre-filled with the deployed Vercel backend URL
  alertBackendUrl: 'https://seniorcare-api-teal.vercel.app',
  twilioSmsEnabled: false,
  resendEmailEnabled: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode(state) { state.darkMode = !state.darkMode; },
    toggleHighContrast(state) { state.highContrast = !state.highContrast; },
    toggleLargeText(state) { state.largeText = !state.largeText; },
    toggleVoiceGuidance(state) { state.voiceGuidance = !state.voiceGuidance; },
    toggleVibration(state) { state.vibration = !state.vibration; },
    setFontScale(state, action: PayloadAction<number>) {
      state.fontScale = Math.max(0.8, Math.min(2.0, action.payload));
    },
    setReducedMotion(state, action: PayloadAction<boolean>) {
      state.reducedMotion = action.payload;
    },
    setAlertBackendUrl(state, action: PayloadAction<string>) {
      state.alertBackendUrl = action.payload.trim();
    },
    toggleTwilioSms(state) { state.twilioSmsEnabled = !state.twilioSmsEnabled; },
    toggleResendEmail(state) { state.resendEmailEnabled = !state.resendEmailEnabled; },
    resetSettings(_state) { return initialState; },
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
  setAlertBackendUrl,
  toggleTwilioSms,
  toggleResendEmail,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
