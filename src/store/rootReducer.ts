import { combineReducers } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import medicationsReducer from './slices/medicationsSlice';
import remindersReducer from './slices/remindersSlice';
import familyReducer from './slices/familySlice';
import settingsReducer from './slices/settingsSlice';
import wellnessReducer from './slices/wellnessSlice';
import achievementsReducer from './slices/achievementsSlice';

export const rootReducer = combineReducers({
  user: userReducer,
  medications: medicationsReducer,
  reminders: remindersReducer,
  family: familyReducer,
  settings: settingsReducer,
  wellness: wellnessReducer,
  achievements: achievementsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
