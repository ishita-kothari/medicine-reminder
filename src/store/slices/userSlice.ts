import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { generateId } from '../../utils/idGenerator';
import { nowISO } from '../../utils/dateHelpers';

export interface UserState {
  id: string;
  name: string;
  age: number;
  emergencyContact: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

const initialState: UserState = {
  id: generateId(),
  name: '',
  age: 0,
  emergencyContact: '',
  onboardingCompleted: false,
  createdAt: nowISO(),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    createProfile(state, action: PayloadAction<{ name: string; age: number; emergencyContact: string }>) {
      state.name = action.payload.name;
      state.age = action.payload.age;
      state.emergencyContact = action.payload.emergencyContact;
    },
    updateProfile(state, action: PayloadAction<Partial<Pick<UserState, 'name' | 'age' | 'emergencyContact'>>>) {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.age !== undefined) state.age = action.payload.age;
      if (action.payload.emergencyContact !== undefined) state.emergencyContact = action.payload.emergencyContact;
    },
    completeOnboarding(state) {
      state.onboardingCompleted = true;
    },
  },
});

export const { createProfile, updateProfile, completeOnboarding } = userSlice.actions;
export default userSlice.reducer;
