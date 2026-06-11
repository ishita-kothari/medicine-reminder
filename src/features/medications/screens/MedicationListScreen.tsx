import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { deleteMedication } from '../../../store/slices/medicationsSlice';
import { MedicationsStackParamList } from '../../../types';
import BigButton from '../../../components/BigButton';
import EmptyState from '../../../components/EmptyState';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { formatTimeFromHHMM } from '../../../utils/dateHelpers';

type Nav = StackNavigationProp<MedicationsStackParamList>;

const FORM_TYPE_ICON: Record<string, string> = {
  tablet: '⬜', capsule: '💊', liquid: '🧴', drop: '💧',
  injection: '💉', inhaler: '🌬️', patch: '🩹', powder: '🫙',
  cream: '🧴', other: '📦', undefined: '💊',
};

export default function MedicationListScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const medicationIds = useAppSelector((s) => s.medications.order);
  const medications = useAppSelector((s) => s.medications.items);
  const allReminders = useAppSelector((s) => s.reminders.reminders);

  const getReminderCount = (medId: string) =>
    Object.values(allReminders).filter((r) => r.medicationId === medId && r.isActive).length;

  const getNextReminderTime = (medId: string): string | undefined =>
    Object.values(allReminders)
      .filter((r) => r.medicationId === medId && r.isActive)
      .map((r) => r.scheduledTime)
      .sort()[0];

  const handleDelete = () => {
    if (confirmDeleteId) {
      dispatch(deleteMedication(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  if (medicationIds.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          emoji="💊"
          title="No medicines yet"
          subtitle="Add your first medication to get started with reminders."
          actionLabel="Add Medicine"
          onAction={() => navigation.navigate('AddMedication')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={medicationIds}
        keyExtractor={(id) => id}
        removeClippedSubviews={false}
        contentContainerStyle={styles.list}
        renderItem={({ item: id }) => {
          const med = medications[id];
          if (!med) return null;
          const reminderCount = getReminderCount(id);
          const nextTime = getNextReminderTime(id);
          const hasReminders = reminderCount > 0;

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              {/* Top row: icon + name + dosage */}
              <View style={styles.cardTop}>
                <View style={[styles.colorBadge, { backgroundColor: med.color }]}>
                  <Text style={styles.formIcon} accessible={false}>
                    {FORM_TYPE_ICON[med.medicineType] ?? '💊'}
                  </Text>
                </View>
                <View style={styles.medInfo}>
                  <Text
                    accessible
                    accessibilityRole="text"
                    style={[styles.medName, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
                    numberOfLines={1}
                  >
                    {med.name}
                  </Text>
                  <Text style={[styles.medDose, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                    {med.dosage} {med.unit} · {med.medicineType}
                  </Text>
                  {med.instructions ? (
                    <Text style={[styles.medInstructions, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]} numberOfLines={1}>
                      {med.instructions}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Reminder status row */}
              <TouchableOpacity
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  hasReminders
                    ? `${reminderCount} reminder${reminderCount > 1 ? 's' : ''} set. Next at ${nextTime ? formatTimeFromHHMM(nextTime) : 'unknown'}. Tap to manage reminders.`
                    : 'No reminders set. Tap to add a reminder.'
                }
                onPress={() => navigation.navigate('ReminderList', { medicationId: id })}
                style={[
                  styles.reminderRow,
                  {
                    backgroundColor: hasReminders ? colors.primaryLight + '18' : colors.warningLight,
                    borderColor: hasReminders ? colors.primaryLight : colors.warning,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.reminderIcon} accessible={false}>
                  {hasReminders ? '🔔' : '🔕'}
                </Text>
                <View style={styles.reminderText}>
                  {hasReminders ? (
                    <>
                      <Text style={[styles.reminderOn, { color: colors.primary, fontSize: Typography.label.fontSize * textScale }]}>
                        {reminderCount} reminder{reminderCount > 1 ? 's' : ''} active
                      </Text>
                      {nextTime && (
                        <Text style={[styles.reminderNext, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]}>
                          Next: {formatTimeFromHHMM(nextTime)}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.reminderOff, { color: colors.warning, fontSize: Typography.label.fontSize * textScale }]}>
                      No reminder set — tap to add one
                    </Text>
                  )}
                </View>
                <Text style={[styles.chevron, { color: hasReminders ? colors.primary : colors.warning }]}>›</Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actions}>
                {!hasReminders && (
                  <BigButton
                    label="+ Add Reminder"
                    onPress={() => navigation.navigate('AddReminder', { medicationId: id })}
                    variant="primary"
                    size="normal"
                    style={styles.actionBtn}
                    accessibilityHint={`Double-tap to add a reminder for ${med.name}`}
                  />
                )}
                <BigButton
                  label="Edit"
                  onPress={() => navigation.navigate('EditMedication', { medicationId: id })}
                  variant="secondary"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Double-tap to edit ${med.name}`}
                />
                <BigButton
                  label="Delete"
                  onPress={() => setConfirmDeleteId(id)}
                  variant="danger"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Double-tap to delete ${med.name}`}
                />
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <Text style={[styles.count, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
            {medicationIds.length} medicine{medicationIds.length !== 1 ? 's' : ''} tracked
          </Text>
        }
      />

      <View style={[styles.fab, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label="+ Add Medicine"
          onPress={() => navigation.navigate('AddMedication')}
          variant="primary"
          size="large"
          accessibilityHint="Double-tap to add a new medication"
        />
      </View>

      <ConfirmationModal
        visible={!!confirmDeleteId}
        title="Delete Medicine?"
        message={`Are you sure you want to delete ${
          confirmDeleteId ? (medications[confirmDeleteId]?.name ?? 'this medicine') : 'this medicine'
        }? All reminders will also be removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.md, paddingBottom: 110 },
  count: { paddingBottom: Spacing.sm },

  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },

  // Top section
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  colorBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  formIcon: { fontSize: 24 },
  medInfo: { flex: 1 },
  medName: { fontWeight: '700', marginBottom: 2 },
  medDose: { marginBottom: 2 },
  medInstructions: { fontStyle: 'italic' },

  // Reminder row
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: Spacing.sm,
    minHeight: 52,
  },
  reminderIcon: { fontSize: 20 },
  reminderText: { flex: 1 },
  reminderOn: { fontWeight: '700' },
  reminderNext: {},
  reminderOff: { fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '300' },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: { flex: 1, minWidth: 80 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
