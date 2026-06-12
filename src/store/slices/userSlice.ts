/**
 * userSlice.ts
 *
 * WHY: Stores the patient's profile — name, age, and emergency contact.
 * The emergency contact is the fallback phone number used for the SOS
 * button and caregiver SMS alerts when no family member is configured.
 *
 * DEFAULT EMERGENCY NUMBER: +919428201825 is pre-filled so first-time
 * users always have a working SOS even before completing onboarding.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { generateId } from '../../utils/idGenerator';
import { nowISO } from '../../utils/dateHelpers';

export interface UserState {
  id: string;
  name: string;
  age: number;
  /** Primary emergency/SOS contact. Defaults to +919428201825 if not set. */
  emergencyContact: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

/** Fallback used when user has not set an emergency contact */
export const DEFAULT_EMERGENCY_CONTACT = '+919428201825';

const initialState: UserState = {
  id: generateId(),
  name: '',
  age: 0,
  emergencyContact: DEFAULT_EMERGENCY_CONTACT,
  onboardingCompleted: false,
  createdAt: nowISO(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    createProfile(
      state,
      action: PayloadAction<{ name: string; age: number; emergencyContact: string }>
    ) {
      state.name = action.payload.name;
      state.age = action.payload.age;
      // Keep default if user left the field blank
      state.emergencyContact =
        action.payload.emergencyContact?.trim() || DEFAULT_EMERGENCY_CONTACT;
    },
    updateProfile(
      state,
      action: PayloadAction<Partial<Pick<UserState, 'name' | 'age' | 'emergencyContact'>>>
    ) {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.age !== undefined) state.age = action.payload.age;
      if (action.payload.emergencyContact !== undefined) {
        state.emergencyContact =
          action.payload.emergencyContact.trim() || DEFAULT_EMERGENCY_CONTACT;
      }
    },
    completeOnboarding(state) {
      state.onboardingCompleted = true;
    },
  },
});

export const { createProfile, updateProfile, completeOnboarding } = userSlice.actions;
export default userSlice.reducer;
