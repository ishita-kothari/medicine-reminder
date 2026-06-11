import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WellnessEntry, WellnessState, MoodType } from '../../types';
import { nowISO, todayDateString } from '../../utils/dateHelpers';
import { generateId } from '../../utils/idGenerator';

const initialState: WellnessState = {
  entries: {},
  lastCheckinDate: null,
};

const wellnessSlice = createSlice({
  name: 'wellness',
  initialState,
  reducers: {
    recordMood(state, action: PayloadAction<{ mood: MoodType; note?: string }>) {
      const date = todayDateString();
      const entry: WellnessEntry = {
        id: generateId(),
        date,
        mood: action.payload.mood,
        note: action.payload.note,
        createdAt: nowISO(),
      };
      state.entries[date] = entry;
      state.lastCheckinDate = date;
    },
    updateMood(state, action: PayloadAction<{ date: string; mood: MoodType; note?: string }>) {
      const existing = state.entries[action.payload.date];
      if (existing) {
        existing.mood = action.payload.mood;
        if (action.payload.note !== undefined) existing.note = action.payload.note;
      }
    },
  },
});

export const { recordMood, updateMood } = wellnessSlice.actions;
export default wellnessSlice.reducer;
