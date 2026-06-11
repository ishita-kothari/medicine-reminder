import medicationsReducer, {
  addMedication,
  updateMedication,
  deleteMedication,
  setMedicationActive,
} from '../../src/store/slices/medicationsSlice';
import { MedicationsState, Medication } from '../../src/types';

const mockMedication: Omit<Medication, 'createdAt' | 'updatedAt'> = {
  id: 'med-1',
  name: 'Metformin',
  dosage: '500',
  unit: 'mg',
  instructions: 'Take with food',
  color: '#45B7D1',
  colorLabel: 'Blue',
  shape: 'round',
  pillCount: 30,
  refillAt: 7,
  notes: '',
  isActive: true,
};

const emptyState: MedicationsState = { items: {}, order: [] };

describe('medicationsSlice', () => {
  it('addMedication adds to items and order', () => {
    const state = medicationsReducer(emptyState, addMedication(mockMedication));
    expect(state.items['med-1']).toBeDefined();
    expect(state.items['med-1']!.name).toBe('Metformin');
    expect(state.order).toContain('med-1');
    expect(state.items['med-1']!.createdAt).toBeTruthy();
    expect(state.items['med-1']!.updatedAt).toBeTruthy();
  });

  it('updateMedication updates existing medication', () => {
    let state = medicationsReducer(emptyState, addMedication(mockMedication));
    state = medicationsReducer(state, updateMedication({ id: 'med-1', name: 'Metformin XR' }));
    expect(state.items['med-1']!.name).toBe('Metformin XR');
    expect(state.items['med-1']!.dosage).toBe('500');
  });

  it('updateMedication does nothing for unknown id', () => {
    const state = medicationsReducer(emptyState, updateMedication({ id: 'unknown', name: 'Test' }));
    expect(state.items['unknown']).toBeUndefined();
  });

  it('deleteMedication removes from items and order', () => {
    let state = medicationsReducer(emptyState, addMedication(mockMedication));
    state = medicationsReducer(state, deleteMedication('med-1'));
    expect(state.items['med-1']).toBeUndefined();
    expect(state.order).not.toContain('med-1');
  });

  it('setMedicationActive toggles isActive', () => {
    let state = medicationsReducer(emptyState, addMedication(mockMedication));
    state = medicationsReducer(state, setMedicationActive({ id: 'med-1', isActive: false }));
    expect(state.items['med-1']!.isActive).toBe(false);
    state = medicationsReducer(state, setMedicationActive({ id: 'med-1', isActive: true }));
    expect(state.items['med-1']!.isActive).toBe(true);
  });

  it('order is preserved after multiple additions', () => {
    let state = medicationsReducer(emptyState, addMedication({ ...mockMedication, id: 'med-1' }));
    state = medicationsReducer(state, addMedication({ ...mockMedication, id: 'med-2' }));
    state = medicationsReducer(state, addMedication({ ...mockMedication, id: 'med-3' }));
    expect(state.order).toEqual(['med-1', 'med-2', 'med-3']);
    state = medicationsReducer(state, deleteMedication('med-2'));
    expect(state.order).toEqual(['med-1', 'med-3']);
  });
});
