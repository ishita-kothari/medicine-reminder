import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAccessibility } from '../hooks/useAccessibility';
import {
  markTaken,
  markMissed,
  skipReminder,
  snoozeReminder,
  closeReminderAlert,
  updateNotificationIds,
  addReminderEvent,
} from '../store/slices/remindersSlice';
import { recordDoseTaken } from '../store/slices/achievementsSlice';
import { notificationService } from '../services/NotificationService';
import BigButton from './BigButton';
import SnoozePicker from './SnoozePicker';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { addMinutesToISO, nowISO, todayDateString } from '../utils/dateHelpers';
import { generateId } from '../utils/idGenerator';

export default function ReminderAlertModal() {
  const dispatch = useAppDispatch();
  const { colors, speak, haptic } = useAccessibility();
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);

  const activeReminderId = useAppSelector((s) => s.reminders.activeAlertReminderId);
  const activeMedicationId = useAppSelector((s) => s.reminders.activeAlertMedicationId);
  const activeTimeSlot = useAppSelector((s) => s.reminders.activeAlertTimeSlot);

  const reminder = useAppSelector((s) =>
    activeReminderId ? s.reminders.reminders[activeReminderId] : undefined
  );
  const medication = useAppSelector((s) =>
    activeMedicationId ? s.medications.items[activeMedicationId] : undefined
  );

  const today = todayDateString();
  const activeEvent = useAppSelector((s) => {
    if (!activeReminderId) return undefined;
    const events = s.reminders.events[activeReminderId] ?? [];
    return events.find(
      (e) =>
        (e.status === 'pending' || e.status === 'snoozed') &&
        e.scheduledTimeSlot === (activeTimeSlot ?? '') &&
        e.scheduledAt.startsWith(today)
    );
  });

  const isVisible = !!reminder && !!medication;
  const snoozeCount = activeEvent?.snoozeCount ?? 0;

  // Background shifts red as snooze count increases
  const bgColor =
    snoozeCount === 0 ? colors.primaryDark : snoozeCount === 1 ? colors.warning : colors.error;

  // Read out the medication on open
  useEffect(() => {
    if (isVisible && medication && reminder) {
      const text = `Time to take ${medication.name}, ${medication.dosage} ${medication.unit}. ${
        medication.instructions || ''
      } Please press TAKEN when done.`;
      const timer = setTimeout(() => speak(text), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, medication?.id]);

  // Ensure there's an active event to act on
  const ensureEvent = (): string => {
    if (activeEvent) return activeEvent.id;
    const id = generateId();
    if (activeReminderId && activeMedicationId) {
      dispatch(
        addReminderEvent({
          id,
          reminderId: activeReminderId,
          medicationId: activeMedicationId,
          scheduledTimeSlot: activeTimeSlot ?? (reminder?.scheduledTimes?.[0] ?? '08:00'),
          scheduledAt: nowISO(),
          status: 'pending',
          takenAt: null,
          snoozeCount: 0,
          snoozedUntil: null,
        })
      );
    }
    return id;
  };

  const handleTaken = () => {
    if (!activeReminderId) return;
    const eventId = ensureEvent();
    haptic('heavy');
    dispatch(markTaken({ reminderId: activeReminderId, eventId }));
    dispatch(recordDoseTaken());
    if (reminder) notificationService.cancelReminder(reminder.notificationIds);
    speak('Medication marked as taken. Well done!');
    dispatch(closeReminderAlert());
  };

  const handleSkip = () => {
    if (!activeReminderId) return;
    const eventId = ensureEvent();
    haptic('light');
    dispatch(skipReminder({ reminderId: activeReminderId, eventId }));
    dispatch(closeReminderAlert());
  };

  /**
   * Snooze behaviour:
   *   snoozeCount === 0 → snooze normally, schedule a new notification
   *   snoozeCount >= 1  → mark as missed (second snooze chance exhausted)
   */
  const handleSnooze = (minutes: 5 | 10 | 15) => {
    if (!activeReminderId || !reminder || !medication) return;
    const eventId = ensureEvent();
    haptic('medium');
    setShowSnoozePicker(false);

    if (snoozeCount >= 1) {
      // Auto-miss: user has already snoozed once without taking
      dispatch(markMissed({ reminderId: activeReminderId, eventId }));
      speak('Dose marked as missed. You can still take it from Today\'s Schedule if needed.');
      dispatch(closeReminderAlert());
      return;
    }

    const snoozedUntil = addMinutesToISO(nowISO(), minutes);
    dispatch(snoozeReminder({ reminderId: activeReminderId, eventId, snoozedUntil }));

    const slot = activeTimeSlot ?? reminder.scheduledTimes?.[0] ?? '08:00';
    notificationService
      .snooze(reminder, medication, minutes, slot)
      .then((ids) => {
        dispatch(updateNotificationIds({ reminderId: activeReminderId, notificationIds: ids }));
      });

    speak(`Reminder snoozed for ${minutes} minutes. This is your last snooze.`);
    dispatch(closeReminderAlert());
  };

  if (!medication || !reminder) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleSkip}
      accessibilityViewIsModal
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerEmoji} accessible={false}>💊</Text>

          <Text accessible accessibilityRole="header" style={styles.headerText}>
            Time for your medicine
          </Text>

          {snoozeCount >= 1 && (
            <View style={[styles.lastChanceBanner, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
              <Text style={styles.lastChanceText}>
                ⚠️ Last chance — snoozed {snoozeCount} time{snoozeCount > 1 ? 's' : ''}. Pressing Snooze again will mark this dose as missed.
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.colorBand, { backgroundColor: medication.color || colors.primary }]} />
            <View style={styles.cardContent}>
              <Text accessible style={[styles.medName, { color: colors.text }]}>
                {medication.name}
              </Text>
              <Text style={[styles.medDosage, { color: colors.textSecondary }]}>
                {medication.dosage} {medication.unit}
              </Text>
              {medication.instructions ? (
                <Text style={[styles.medInstructions, { color: colors.textSecondary }]}>
                  {medication.instructions}
                </Text>
              ) : null}
              <Text style={[styles.medType, { color: colors.textDisabled }]}>
                {medication.colorLabel} {medication.medicineType}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <BigButton
            label="TAKEN ✓"
            onPress={handleTaken}
            variant="primary"
            size="large"
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            accessibilityHint="Double-tap to confirm you have taken this medication"
            testID="btn-taken"
          />
          <BigButton
            label={snoozeCount >= 1 ? '⚠️ Snooze (marks missed)' : 'SNOOZE'}
            onPress={() => setShowSnoozePicker(true)}
            variant="warning"
            size="normal"
            style={styles.actionBtn}
            accessibilityHint={
              snoozeCount >= 1
                ? 'Warning: Double-tap to snooze, which will mark this dose as missed'
                : 'Double-tap to snooze this reminder'
            }
            testID="btn-snooze"
          />
          <BigButton
            label="SKIP"
            onPress={handleSkip}
            variant="ghost"
            size="normal"
            style={[styles.actionBtn, { borderColor: 'rgba(255,255,255,0.5)' }]}
            textStyle={{ color: '#FFFFFF' }}
            accessibilityHint="Double-tap to skip this reminder"
            testID="btn-skip"
          />
        </View>
      </View>

      <SnoozePicker
        visible={showSnoozePicker}
        onSelect={handleSnooze}
        onCancel={() => setShowSnoozePicker(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, alignItems: 'center', paddingTop: Spacing.xxl },
  headerEmoji: { fontSize: 80, marginBottom: Spacing.md },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  lastChanceBanner: {
    width: '100%',
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  lastChanceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    width: '100%',
    borderRadius: Layout.cardBorderRadius,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: Spacing.md,
  },
  colorBand: { width: 8 },
  cardContent: { flex: 1, padding: Spacing.md },
  medName: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  medDosage: { fontSize: 24, fontWeight: '600', marginBottom: 6 },
  medInstructions: { fontSize: 18, marginBottom: 6, lineHeight: 26 },
  medType: { fontSize: 14 },
  actions: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  actionBtn: { width: '100%' },
});
