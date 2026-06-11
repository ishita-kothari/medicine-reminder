import React from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { deleteReminder, updateReminder } from '../../../store/slices/remindersSlice';
import { notificationService } from '../../../services/NotificationService';
import { MedicationsStackParamList, Reminder } from '../../../types';
import BigButton from '../../../components/BigButton';
import EmptyState from '../../../components/EmptyState';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { formatTimeFromHHMM, formatDaysOfWeek } from '../../../utils/dateHelpers';

type Nav = StackNavigationProp<MedicationsStackParamList>;
type RouteType = RouteProp<MedicationsStackParamList, 'ReminderList'>;

export default function ReminderListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const { medicationId } = route.params;
  const medication = useAppSelector((s) => s.medications.items[medicationId]);
  const allReminders = useAppSelector((s) => s.reminders.reminders);

  const reminders = Object.values(allReminders).filter((r) => r.medicationId === medicationId);

  const handleToggle = (reminder: Reminder) => {
    dispatch(updateReminder({ id: reminder.id, isActive: !reminder.isActive }));
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const r = allReminders[confirmDeleteId];
    if (r) await notificationService.cancelReminder(r.notificationIds);
    dispatch(deleteReminder(confirmDeleteId));
    setConfirmDeleteId(null);
  };

  if (!medication) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {reminders.length === 0 ? (
        <EmptyState
          emoji="⏰"
          title="No reminders yet"
          subtitle={`Add a reminder for ${medication.name} to get notified.`}
          actionLabel="Add Reminder"
          onAction={() => navigation.navigate('AddReminder', { medicationId })}
        />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(r) => r.id}
          removeClippedSubviews={false}
          contentContainerStyle={styles.list}
          renderItem={({ item: reminder }) => (
            <View
              accessible={true}
              accessibilityLabel={`Reminder: ${(reminder.scheduledTimes ?? ['08:00']).map(formatTimeFromHHMM).join(', ')}, ${formatDaysOfWeek(reminder.daysOfWeek)}, ${reminder.isActive ? 'active' : 'disabled'}`}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.cardShadow }]}
            >
              <View style={styles.cardMain}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  {(reminder.scheduledTimes ?? ['08:00']).map((t, i) => (
                    <View key={i} style={[styles.timeChip, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.timeChipText, { fontSize: Typography.body.fontSize * textScale }]}>
                        {formatTimeFromHHMM(t)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.days, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                  {formatDaysOfWeek(reminder.daysOfWeek)}
                </Text>
                <View style={styles.badges}>
                  {reminder.voiceEnabled && (
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight + '30' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Voice</Text>
                    </View>
                  )}
                  {reminder.vibrationEnabled && (
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight + '30' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Vibrate</Text>
                    </View>
                  )}
                  {reminder.notifyFamilyIfMissed && (
                    <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
                      <Text style={[styles.badgeText, { color: colors.warning }]}>Alert family</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityLabel={reminder.isActive ? 'Reminder is active' : 'Reminder is disabled'}
                  accessibilityHint="Double-tap to toggle this reminder on or off"
                  accessibilityState={{ checked: reminder.isActive }}
                  onPress={() => handleToggle(reminder)}
                  style={[styles.toggle, { backgroundColor: reminder.isActive ? colors.success : colors.border }]}
                >
                  <Text style={styles.toggleText}>{reminder.isActive ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
                <BigButton
                  label="Edit"
                  onPress={() => navigation.navigate('EditReminder', { reminderId: reminder.id, medicationId })}
                  variant="secondary"
                  size="normal"
                  style={styles.smallBtn}
                  accessibilityHint="Double-tap to edit this reminder"
                />
                <BigButton
                  label="Delete"
                  onPress={() => setConfirmDeleteId(reminder.id)}
                  variant="danger"
                  size="normal"
                  style={styles.smallBtn}
                  accessibilityHint="Double-tap to delete this reminder"
                />
              </View>
            </View>
          )}
        />
      )}

      <View style={[styles.fab, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label="+ Add Reminder"
          onPress={() => navigation.navigate('AddReminder', { medicationId })}
          variant="primary"
          size="large"
          accessibilityHint="Double-tap to add a new reminder for this medication"
        />
      </View>

      <ConfirmationModal
        visible={!!confirmDeleteId}
        title="Delete Reminder?"
        message="This reminder will be removed and no longer fire."
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
  list: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardMain: { marginBottom: Spacing.sm },
  time: { ...Typography.heading, marginBottom: 4 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timeChipText: { color: '#FFF', fontWeight: '800' },
  days: { ...Typography.body, marginBottom: Spacing.xs },
  badges: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  toggle: {
    height: 40,
    minWidth: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toggleText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  smallBtn: { minWidth: 70, paddingHorizontal: Spacing.sm },
  fab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
