import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { addMedication, updateMedication } from '../../../store/slices/medicationsSlice';
import {
  MedicationsStackParamList,
  MedicationUnit,
  MedicineFormType,
  FORM_TYPE_DEFAULT_UNIT,
} from '../../../types';
import AccessibleTextInput from '../../../components/AccessibleTextInput';
import BigButton from '../../../components/BigButton';
import { generateId } from '../../../utils/idGenerator';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<MedicationsStackParamList>;
type RouteType = RouteProp<MedicationsStackParamList, 'EditMedication'>;

// ─── Common medicine name suggestions ───────────────────────────────────────
const COMMON_MEDICINES = [
  'Acetaminophen', 'Aspirin', 'Ibuprofen', 'Naproxen', 'Amoxicillin',
  'Azithromycin', 'Ciprofloxacin', 'Doxycycline', 'Metronidazole',
  'Metformin', 'Glipizide', 'Insulin', 'Lisinopril', 'Amlodipine',
  'Atorvastatin', 'Simvastatin', 'Metoprolol', 'Atenolol', 'Carvedilol',
  'Losartan', 'Valsartan', 'Omeprazole', 'Pantoprazole', 'Ranitidine',
  'Cetirizine', 'Loratadine', 'Diphenhydramine', 'Montelukast',
  'Sertraline', 'Fluoxetine', 'Escitalopram', 'Amitriptyline',
  'Alprazolam', 'Diazepam', 'Lorazepam', 'Zolpidem',
  'Levothyroxine', 'Synthroid', 'Prednisone', 'Prednisolone',
  'Warfarin', 'Clopidogrel', 'Apixaban', 'Rivaroxaban',
  'Gabapentin', 'Pregabalin', 'Tramadol', 'Codeine',
  'Albuterol', 'Salbutamol', 'Tiotropium', 'Fluticasone',
  'Furosemide', 'Spironolactone', 'Hydrochlorothiazide',
  'Vitamin D', 'Vitamin B12', 'Folic Acid', 'Iron', 'Calcium',
  'Omega-3', 'Magnesium', 'Zinc', 'Potassium',
];

// ─── Form type options ───────────────────────────────────────────────────────
const FORM_TYPES: { value: MedicineFormType; label: string; icon: string }[] = [
  { value: 'tablet',   label: 'Tablet',   icon: '⬜' },
  { value: 'capsule',  label: 'Capsule',  icon: '💊' },
  { value: 'liquid',   label: 'Liquid',   icon: '🧴' },
  { value: 'drop',     label: 'Drop',     icon: '💧' },
  { value: 'injection',label: 'Injection',icon: '💉' },
  { value: 'inhaler',  label: 'Inhaler',  icon: '🌬️' },
  { value: 'patch',    label: 'Patch',    icon: '🩹' },
  { value: 'powder',   label: 'Powder',   icon: '🫙' },
  { value: 'cream',    label: 'Cream',    icon: '🧴' },
  { value: 'other',    label: 'Other',    icon: '📦' },
];

// ─── Unit options ─────────────────────────────────────────────────────────────
const UNIT_OPTIONS: { value: MedicationUnit; label: string }[] = [
  { value: 'mg',    label: 'mg' },
  { value: 'ml',    label: 'ml' },
  { value: 'mcg',   label: 'mcg' },
  { value: 'g',     label: 'g' },
  { value: 'IU',    label: 'IU' },
  { value: 'units', label: 'units' },
];

// ─── Color options ─────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: '#FF6B6B', label: 'Red' },
  { value: '#4ECDC4', label: 'Teal' },
  { value: '#45B7D1', label: 'Blue' },
  { value: '#FFA500', label: 'Orange' },
  { value: '#98D8C8', label: 'Green' },
  { value: '#DDA0DD', label: 'Purple' },
  { value: '#F0E68C', label: 'Yellow' },
  { value: '#E8E8E8', label: 'White' },
];

export default function AddEditMedicationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const dispatch = useAppDispatch();
  const { colors, textScale, haptic } = useAccessibility();

  const medicationId = (route.params as any)?.medicationId as string | undefined;
  const existingMed = useAppSelector((s) =>
    medicationId ? s.medications.items[medicationId] : undefined
  );

  const isEdit = !!existingMed;

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(existingMed?.name ?? '');
  const [dosage, setDosage] = useState(existingMed?.dosage ?? '');
  const [unit, setUnit] = useState<MedicationUnit>(existingMed?.unit ?? 'mg');
  const [medicineType, setMedicineType] = useState<MedicineFormType>(
    existingMed?.medicineType ?? 'tablet'
  );
  const [instructions, setInstructions] = useState(existingMed?.instructions ?? '');
  const [color, setColor] = useState(existingMed?.color ?? '#45B7D1');
  const [colorLabel, setColorLabel] = useState(existingMed?.colorLabel ?? 'Blue');
  const [notes, setNotes] = useState(existingMed?.notes ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; dosage?: string }>({});
  const [saving, setSaving] = useState(false);

  // ─── Autocomplete filter ───────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!name || name.length < 2) return [];
    const lower = name.toLowerCase();
    return COMMON_MEDICINES.filter((m) => m.toLowerCase().startsWith(lower)).slice(0, 6);
  }, [name]);

  // When medicine type changes, auto-update the unit to a sensible default
  const handleTypeSelect = (type: MedicineFormType) => {
    setMedicineType(type);
    setUnit(FORM_TYPE_DEFAULT_UNIT[type]);
    haptic('light');
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Medicine name is required';
    if (!dosage.trim()) newErrors.dosage = 'Dosage is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    haptic('medium');
    setSaving(true);

    const payload = {
      name: name.trim(),
      dosage: dosage.trim(),
      unit,
      medicineType,
      instructions: instructions.trim(),
      color,
      colorLabel,
      shape: '',
      notes: notes.trim(),
      pillCount: 0,
      refillAt: 7,
      isActive: true,
    };

    if (isEdit && medicationId) {
      dispatch(updateMedication({ id: medicationId, ...payload }));
      setSaving(false);
      navigation.goBack();
    } else {
      const newId = generateId();
      dispatch(addMedication({ id: newId, ...payload }));
      setSaving(false);
      // Navigate to add first reminder for this medicine
      navigation.replace('AddReminder', { medicationId: newId, isFirstReminder: true });
    }
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <Text
      accessible
      accessibilityRole="header"
      style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}
    >
      {title.toUpperCase()}
    </Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Medicine Name + Autocomplete ──────────────────────────────── */}
        <SectionTitle title="Medicine name" />
        <View style={styles.autocompleteWrapper}>
          <AccessibleTextInput
            label="Medicine Name *"
            accessibilityLabel="Medicine name, required"
            accessibilityHint="Type the medicine name. Suggestions will appear below."
            value={name}
            onChangeText={(v) => {
              setName(v);
              setShowSuggestions(true);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            error={errors.name}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${s}`}
                  onPress={() => {
                    setName(s);
                    setShowSuggestions(false);
                  }}
                  style={[styles.suggestion, { borderBottomColor: colors.divider }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionText, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ─── Medicine Type ─────────────────────────────────────────────── */}
        <SectionTitle title="Type of medicine" />
        <View style={styles.typeGrid}>
          {FORM_TYPES.map((ft) => {
            const selected = medicineType === ft.value;
            return (
              <TouchableOpacity
                key={ft.value}
                accessible
                accessibilityRole="radio"
                accessibilityLabel={`${ft.label}, ${selected ? 'selected' : 'not selected'}`}
                accessibilityState={{ selected }}
                onPress={() => handleTypeSelect(ft.value)}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={styles.typeIcon} accessible={false}>{ft.icon}</Text>
                <Text style={[styles.typeLabel, { color: selected ? '#FFF' : colors.text, fontSize: Typography.label.fontSize * textScale }]}>
                  {ft.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Dosage + Unit ─────────────────────────────────────────────── */}
        <SectionTitle title="Dosage" />
        <View style={styles.dosageRow}>
          <View style={styles.dosageInput}>
            <AccessibleTextInput
              label="Amount *"
              accessibilityLabel="Dosage amount, required"
              accessibilityHint="Enter the dosage amount"
              value={dosage}
              onChangeText={(v) => {
                setDosage(v);
                if (errors.dosage) setErrors((e) => ({ ...e, dosage: undefined }));
              }}
              error={errors.dosage}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
          <View style={styles.unitPicker}>
            <Text style={[styles.unitTitle, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]}>
              Unit
            </Text>
            <View style={styles.unitGrid}>
              {UNIT_OPTIONS.map((u) => {
                const sel = unit === u.value;
                return (
                  <TouchableOpacity
                    key={u.value}
                    accessible
                    accessibilityRole="radio"
                    accessibilityLabel={`${u.label}, ${sel ? 'selected' : 'not selected'}`}
                    accessibilityState={{ selected: sel }}
                    onPress={() => { setUnit(u.value); haptic('light'); }}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor: sel ? colors.primary : colors.surface,
                        borderColor: sel ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.unitChipText, { color: sel ? '#FFF' : colors.text }]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ─── Instructions ──────────────────────────────────────────────── */}
        <SectionTitle title="Instructions" />
        <AccessibleTextInput
          label="How to take it (e.g. with food, before bed)"
          accessibilityLabel="Instructions"
          accessibilityHint="Enter how to take this medication"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={2}
        />

        {/* ─── Color ─────────────────────────────────────────────────────── */}
        <SectionTitle title="Pill colour (visual ID)" />
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c.value}
              accessible
              accessibilityRole="radio"
              accessibilityLabel={`${c.label}, ${color === c.value ? 'selected' : 'not selected'}`}
              accessibilityState={{ selected: color === c.value }}
              onPress={() => { setColor(c.value); setColorLabel(c.label); haptic('light'); }}
              style={[
                styles.colorDot,
                {
                  backgroundColor: c.value,
                  borderWidth: color === c.value ? 3 : 1,
                  borderColor: color === c.value ? colors.text : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              {color === c.value && <Text style={styles.colorCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.colorSelectedLabel, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]}>
          Selected: {colorLabel}
        </Text>

        {/* ─── Notes ─────────────────────────────────────────────────────── */}
        <SectionTitle title="Additional notes" />
        <AccessibleTextInput
          label="Notes (optional)"
          accessibilityLabel="Additional notes"
          accessibilityHint="Enter any additional notes about this medication"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />
      </ScrollView>

      {/* ─── Footer CTA ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        {!isEdit && (
          <Text style={[styles.footerHint, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]}>
            You'll set a reminder on the next screen
          </Text>
        )}
        <BigButton
          label={isEdit ? 'Save Changes' : 'Add Medicine & Set Reminder →'}
          onPress={handleSave}
          variant="primary"
          size="large"
          loading={saving}
          accessibilityHint={isEdit ? 'Double-tap to save changes' : 'Double-tap to add this medicine and proceed to set a reminder'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 130 },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Autocomplete
  autocompleteWrapper: { zIndex: 100 },
  suggestions: {
    position: 'absolute',
    top: 64,
    left: 0, right: 0,
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 200,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  suggestionText: { fontWeight: '500' },

  // Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typeCard: {
    width: '30%',
    minWidth: 95,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: Layout.inputBorderRadius,
    borderWidth: 2,
    gap: 4,
  },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontWeight: '600', textAlign: 'center' },

  // Dosage + unit
  dosageRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  dosageInput: { flex: 1 },
  unitPicker: {
    flex: 1.1,
    paddingTop: 2,
  },
  unitTitle: { fontWeight: '600', marginBottom: Spacing.xs },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipText: { fontSize: 14, fontWeight: '700' },

  // Color
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 6 },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheck: { color: '#fff', fontWeight: '900', fontSize: 18, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  colorSelectedLabel: { marginBottom: Spacing.sm },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: 6,
  },
  footerHint: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
