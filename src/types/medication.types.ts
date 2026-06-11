export type MedicationUnit = 'mg' | 'ml' | 'mcg' | 'IU' | 'g' | 'units';

export type MedicineFormType =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'drop'
  | 'injection'
  | 'patch'
  | 'powder'
  | 'inhaler'
  | 'cream'
  | 'other';

/** Which units make sense for each form type */
export const FORM_TYPE_DEFAULT_UNIT: Record<MedicineFormType, MedicationUnit> = {
  tablet: 'mg',
  capsule: 'mg',
  liquid: 'ml',
  drop: 'ml',
  injection: 'mg',
  patch: 'mg',
  powder: 'mg',
  inhaler: 'mcg',
  cream: 'mg',
  other: 'mg',
};

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: MedicationUnit;
  medicineType: MedicineFormType;
  instructions: string;
  color: string;
  colorLabel: string;
  shape: string;
  pillCount: number;
  refillAt: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationsState {
  items: Record<string, Medication>;
  order: string[];
}
