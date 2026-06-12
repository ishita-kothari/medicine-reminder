import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Medication, MedicationsState } from '../../types';
import { nowISO } from '../../utils/dateHelpers';

const initialState: MedicationsState = {
  items: {},
  order: [],
};

const medicationsSlice = createSlice({
  name: 'medications',
  initialState,
  reducers: {
    addMedication(state, action: PayloadAction<Omit<Medication, 'createdAt' | 'updatedAt'>>) {
      const medication: Medication = {
        medicineType: 'tablet',
        ...action.payload,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      state.items[medication.id] = medication;
      state.order.push(medication.id);
    },
    updateMedication(state, action: PayloadAction<Partial<Medication> & { id: string }>) {
      const existing = state.items[action.payload.id];
      if (existing) {
        state.items[action.payload.id] = {
          ...existing,
          ...action.payload,
          updatedAt: nowISO(),
        };
      }
    },
    deleteMedication(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
    },
    setMedicationActive(state, action: PayloadAction<{ id: string; isActive: boolean }>) {
      const med = state.items[action.payload.id];
      if (med) {
        med.isActive = action.payload.isActive;
        med.updatedAt = nowISO();
      }
    },
    /**
     * decrementPillCount — called every time a dose is confirmed taken.
     * Returns the new count so callers can check if a refill alert is needed.
     * Does nothing if pillCount is 0 (already empty) or not tracked (0 = unlimited).
     */
    decrementPillCount(state, action: PayloadAction<string>) {
      const med = state.items[action.payload];
      if (med && med.pillCount > 0) {
        med.pillCount = Math.max(0, med.pillCount - 1);
        med.updatedAt = nowISO();
      }
    },
    /** Manually update pill count from Settings / edit screen */
    setPillCount(state, action: PayloadAction<{ id: string; count: number }>) {
      const med = state.items[action.payload.id];
      if (med) {
        med.pillCount = Math.max(0, action.payload.count);
        med.updatedAt = nowISO();
      }
    },
  },
});

export const {
  addMedication,
  updateMedication,
  deleteMedication,
  setMedicationActive,
  decrementPillCount,
  setPillCount,
} = medicationsSlice.actions;
export default medicationsSlice.reducer;
