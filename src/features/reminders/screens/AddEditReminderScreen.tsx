import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import {
  addReminder,
  updateReminder,
  updateNotificationIds,
} from '../../../store/slices/remindersSlice';
import { notificationService } from '../../../services/NotificationService';
import { MedicationsStackParamList } from '../../../types';
import BigButton from '../../../components/BigButton';
import DaySelector from '../../../components/DaySelector';
import TimePicker from '../../../components/TimePicker';
import SnoozeSelector from '../../../components/SnoozeSelector';
import { generateId } from '../../../utils/idGenerator';
import { formatTimeFromHHMM } from '../../../utils/dateHelpers';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<MedicationsStackParamList>;

export default function AddEditReminderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MedicationsStackParamList, 'AddReminder'>>();
  const dispatch = useAppDispatch();
  const { colors, textScale, haptic } = useAccessibility();

  const params = route.params as any;
  const reminderId = params?.reminderId as string | undefined;
  const medicationId = params?.medicationId as string;
  const isFirstReminder = params?.isFirstReminder as boolean | undefined;

  const existingReminder = useAppSelector((s) =>
    reminderId ? s.reminders.reminders[reminderId] : undefined
  );
  const medication = useAppSelector((s) => s.medications.items[medicationId]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(
    existingReminder?.scheduledTimes ?? ['08:00']
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existingReminder?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const [voiceEnabled, setVoiceEnabled] = useState(existingReminder?.voiceEnabled ?? false);
  const [vibrationEnabled, setVibrationEnabled] = useState(existingReminder?.vibrationEnabled ?? true);
  const [notifyFamilyIfMissed, setNotifyFamilyIfMissed] = useState(
    existingReminder?.notifyFamilyIfMissed ?? true
  );
  const [snoozeMinutes, setSnoozeMinutes] = useState<5 | 10 | 15>(
    existingReminder?.snoozeMinutes ?? 10
  );
  const [saving, setSaving] = useState(false);

  // ── Time-slot management ──────────────────────────────────────────────────
  const updateTime = (index: number, newTime: string) => {
    setScheduledTimes((prev) => prev.map((t, i) => (i === index ? newTime : t)));
  };

  const removeTime = (index: number) => {
    if (scheduledTimes.length === 1) {
      Alert.alert('At least one time required', 'A reminder must have at least one daily time.');
      return;
    }
    setScheduledTimes((prev) => prev.filter((_, i) => i !== index));
    haptic('light');
  };

  const addTime = () => {
    // Default next slot 4 hours after the last one
    const last = scheduledTimes[scheduledTimes.length - 1] ?? '08:00';
    const [h, m] = last.split(':').map(Number);
    const nextH = ((h! + 4) % 24).toString().padStart(2, '0');
    const newSlot = `${nextH}:${String(m ?? 0).padStart(2, '0')}`;
    setScheduledTimes((prev) => [...prev, newSlot]);
    haptic('light');
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!medication) {
      Alert.alert('Error', 'Medication not found. Please go back and try again.');
      return;
    }
    if (scheduledTimes.length === 0) {
      Alert.alert('Add a time', 'Please add at least one reminder time.');
      return;
    }

    setSaving(true);
    haptic('medium');

    try {
      const reminderData = {
        scheduledTimes,
        daysOfWeek,
        voiceEnabled,
        vibrationEnabled,
        notifyFamilyIfMissed,
        snoozeMinutes,
      };

      if (existingReminder && reminderId) {
        await notificationService.cancelReminder(existingReminder.notificationIds);
        dispatch(updateReminder({ id: reminderId, ...reminderData }));
        const ids = await notificationService.scheduleReminder(
          { ...existingReminder, ...reminderData },
          medication
        );
        dispatch(updateNotificationIds({ reminderId, notificationIds: ids }));
      } else {
        const newId = generateId();
        const newReminder = {
          id: newId,
          medicationId,
          ...reminderData,
          isActive: true,
          notificationIds: [] as string[],
        };
        dispatch(addReminder(newReminder));
        const ids = await notificationService.scheduleReminder(newReminder, medication);
        dispatch(updateNotificationIds({ reminderId: newId, notificationIds: ids }));
      }

      if (isFirstReminder) {
        navigation.navigate('MedicationList');
      } else {
        navigation.goBack();
      }
    } catch {
      Alert.alert('Error', 'Could not save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const SwitchRow = ({
    label,
    description,
    value,
    onChange,
    hint,
  }: {
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
    hint: string;
  }) => (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      style={[styles.switchRow, { borderColor: colors.divider }]}
    >
      <View style={styles.switchText}>
        <Text style={[styles.switchLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        accessible={false}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Medicine banner */}
        {medication ? (
          <View style={[styles.medBanner, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.medBannerSub, { color: colors.textSecondary }]}>For medicine</Text>
            <Text style={[styles.medBannerName, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
              {medication.name} — {medication.dosage} {medication.unit}
            </Text>
          </View>
        ) : null}

        {/* ── Multiple time slots ───────────────────────────────────────── */}
        <Text
          accessible
          accessibilityRole="header"
          style={[styles.sectionLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}
        >
          Daily reminder times
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Add one time per daily dose. Each fires a separate notification.
        </Text>

        {scheduledTimes.map((time, index) => (
          <View key={index} style={[styles.timeSlotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.timeSlotHeader}>
              <Text style={[styles.timeSlotLabel, { color: colors.textSecondary }]}>
                Dose {index + 1}
              </Text>
              {scheduledTimes.length > 1 && (
                <TouchableOpacity
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Remove dose ${index + 1} at ${formatTimeFromHHMM(time)}`}
                  onPress={() => removeTime(index)}
                  style={[styles.removeBtn, { backgroundColor: colors.errorLight }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.removeBtnText, { color: colors.error }]}>✕ Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TimePicker
              label=""
              value={time}
              onChange={(newTime) => updateTime(index, newTime)}
            />
          </View>
        ))}

        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add another reminder time"
          accessibilityHint="Double-tap to add a second or third daily dose time"
          onPress={addTime}
          style={[styles.addTimeBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.addTimeBtnText, { color: colors.primary, fontSize: Typography.body.fontSize * textScale }]}>
            + Add another time
          </Text>
          <Text style={[styles.addTimeHint, { color: colors.textSecondary }]}>
            e.g. morning and evening doses
          </Text>
        </TouchableOpacity>

        {/* ── Days ─────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          Repeat on which days?
        </Text>
        <DaySelector selectedDays={daysOfWeek} onChange={setDaysOfWeek} />

        {/* ── Options ──────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          Alert options
        </Text>
        <SwitchRow
          label="Voice reminder"
          description="Speaks medication name aloud when reminder fires"
          value={voiceEnabled}
          onChange={setVoiceEnabled}
          hint="Double-tap to toggle voice announcement"
        />
        <SwitchRow
          label="Vibration"
          description="Vibrates phone when reminder fires"
          value={vibrationEnabled}
          onChange={setVibrationEnabled}
          hint="Double-tap to toggle vibration"
        />
        <SwitchRow
          label="Notify family if missed"
          description="Caregivers are alerted when a dose is not confirmed"
          value={notifyFamilyIfMissed}
          onChange={setNotifyFamilyIfMissed}
          hint="Double-tap to toggle family alerts"
        />

        {/* ── Snooze ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          Snooze duration
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          After one snooze without action, the dose is automatically marked missed.
        </Text>
        <SnoozeSelector value={snoozeMinutes} onChange={setSnoozeMinutes} />
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label={
            existingReminder
              ? 'Save Reminder'
              : isFirstReminder
              ? `Save ${scheduledTimes.length} Reminder${scheduledTimes.length > 1 ? 's' : ''} & Finish`
              : `Add ${scheduledTimes.length} Reminder${scheduledTimes.length > 1 ? 's' : ''}`
          }
          onPress={handleSave}
          variant="primary"
          size="large"
          loading={saving}
          accessibilityHint="Double-tap to save this reminder"
        />
        {isFirstReminder && (
          <BigButton
            label="Skip for now"
            onPress={() => navigation.navigate('MedicationList')}
            variant="ghost"
            size="normal"
            style={styles.skipBtn}
            accessibilityHint="Double-tap to skip adding a reminder"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 150 },

  medBanner: {
    borderRadius: Layout.inputBorderRadius,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  medBannerSub: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4 },
  medBannerName: { fontWeight: '700' },

  sectionLabel: { fontWeight: '700', marginTop: Spacing.md, marginBottom: 4 },
  sectionHint: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },

  // Time slots
  timeSlotCard: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeSlotLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  removeBtnText: { fontSize: 13, fontWeight: '700' },

  addTimeBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Layout.cardBorderRadius,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 4,
  },
  addTimeBtnText: { fontWeight: '700' },
  addTimeHint: { fontSize: 12 },

  // Switch rows
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  switchText: { flex: 1, paddingRight: Spacing.sm },
  switchLabel: { fontWeight: '600' },
  switchDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  skipBtn: { marginTop: 4 },
});
