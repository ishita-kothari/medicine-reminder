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
        medicineType: 'tablet', // default for any persisted medications without this field
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
  },
});

export const { addMedication, updateMedication, deleteMedication, setMedicationActive } =
  medicationsSlice.actions;
export default medicationsSlice.reducer;
