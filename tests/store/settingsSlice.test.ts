import settingsReducer, {
  toggleDarkMode,
  toggleHighContrast,
  toggleLargeText,
  toggleVoiceGuidance,
  toggleVibration,
  setFontScale,
  setReducedMotion,
  resetSettings,
  SettingsState,
} from '../../src/store/slices/settingsSlice';

const defaultState: SettingsState = {
  darkMode: false,
  highContrast: false,
  largeText: false,
  voiceGuidance: false,
  vibration: true,
  fontScale: 1.0,
  reducedMotion: false,
};

describe('settingsSlice', () => {
  it('toggleDarkMode flips darkMode', () => {
    let state = settingsReducer(defaultState, toggleDarkMode());
    expect(state.darkMode).toBe(true);
    state = settingsReducer(state, toggleDarkMode());
    expect(state.darkMode).toBe(false);
  });

  it('toggleHighContrast flips highContrast', () => {
    let state = settingsReducer(defaultState, toggleHighContrast());
    expect(state.highContrast).toBe(true);
    state = settingsReducer(state, toggleHighContrast());
    expect(state.highContrast).toBe(false);
  });

  it('toggleLargeText flips largeText', () => {
    const state = settingsReducer(defaultState, toggleLargeText());
    expect(state.largeText).toBe(true);
  });

  it('toggleVoiceGuidance flips voiceGuidance', () => {
    const state = settingsReducer(defaultState, toggleVoiceGuidance());
    expect(state.voiceGuidance).toBe(true);
  });

  it('toggleVibration flips vibration', () => {
    const state = settingsReducer(defaultState, toggleVibration());
    expect(state.vibration).toBe(false);
  });

  it('setFontScale clamps value between 0.8 and 2.0', () => {
    let state = settingsReducer(defaultState, setFontScale(1.4));
    expect(state.fontScale).toBe(1.4);
    state = settingsReducer(defaultState, setFontScale(0.1));
    expect(state.fontScale).toBe(0.8);
    state = settingsReducer(defaultState, setFontScale(3.0));
    expect(state.fontScale).toBe(2.0);
  });

  it('setReducedMotion sets reducedMotion flag', () => {
    let state = settingsReducer(defaultState, setReducedMotion(true));
    expect(state.reducedMotion).toBe(true);
    state = settingsReducer(state, setReducedMotion(false));
    expect(state.reducedMotion).toBe(false);
  });

  it('resetSettings returns default state', () => {
    const modified: SettingsState = {
      ...defaultState,
      darkMode: true,
      highContrast: true,
      largeText: true,
      voiceGuidance: true,
      vibration: false,
      fontScale: 1.6,
    };
    const state = settingsReducer(modified, resetSettings());
    expect(state).toEqual(defaultState);
  });
});
