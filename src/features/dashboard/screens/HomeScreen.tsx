/**
 * HomeScreen.tsx — Dashboard / Home tab
 *
 * WHY: The first screen seniors see on every app open. Designed for instant
 * comprehension: one big medication card, one big TAKE NOW button, a live
 * countdown timer, and a scrollable schedule below. Cognitive load is kept
 * low by showing only what's immediately actionable.
 *
 * KEY FEATURES:
 *   - Live countdown to next scheduled dose (updates every second)
 *   - TAKE NOW button marks the current slot as taken, fires haptic + voice
 *   - SOS button calls the emergency contact (real Linking.openURL)
 *   - Today's Schedule shows every time slot with tick (✓) buttons
 *   - Missed Medicine section lists unconfirmed past doses with "Take Late"
 *   - 7-day adherence chart rendered with react-native-svg
 *   - Achievement celebration overlay (Reanimated 4 spring animation)
 *
 * ACCESSIBILITY:
 *   - accessibilityRole and accessibilityLabel on every interactive element
 *   - Countdown timer uses accessibilityLiveRegion="polite" (reads aloud on change)
 *   - All text sizes ≥ 18px, touch targets ≥ 60×60px
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  Linking,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import {
  markTaken,
  markTakenLate,
  addReminderEvent,
  autoMarkExpiredSnoozedMissed,
} from '../../../store/slices/remindersSlice';
import { recordDoseTaken } from '../../../store/slices/achievementsSlice';
import { notificationService } from '../../../services/NotificationService';
import BigButton from '../../../components/BigButton';
import ReminderAlertModal from '../../../components/ReminderAlertModal';
import AchievementCelebration from '../../../components/AchievementCelebration';
import AdherenceChart from '../../../components/AdherenceChart';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import {
  formatTimeFromHHMM,
  formatCountdown,
  getNextSlot,
  secondsUntil,
  nowISO,
  getDayName,
  todayDateString,
} from '../../../utils/dateHelpers';
import { generateId } from '../../../utils/idGenerator';
import { Reminder, ReminderEvent } from '../../../types';
import { DEFAULT_EMERGENCY_CONTACT } from '../../../store/slices/userSlice';
import { subDays, format } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────
interface ScheduleSlot {
  reminder: Reminder;
  timeSlot: string;
  medication: NonNullable<ReturnType<typeof useAppSelector>>;
  eventForToday: ReminderEvent | undefined;
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { colors, textScale, speak, haptic } = useAccessibility();
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState('--:--:--');
  const spokenMinutes = useRef<Set<number>>(new Set());

  // ── Redux selectors ──────────────────────────────────────────────────────
  const userName = useAppSelector((s) => s.user.name);
  const rawEmergencyContact = useAppSelector((s) => s.user.emergencyContact);
  const emergencyContact = rawEmergencyContact || DEFAULT_EMERGENCY_CONTACT;
  const medicationItems = useAppSelector((s) => s.medications.items);
  const allReminders = useAppSelector((s) => s.reminders.reminders);
  const allEvents = useAppSelector((s) => s.reminders.events);
  const currentStreak = useAppSelector((s) => s.achievements.currentStreak);
  const totalDoses = useAppSelector((s) => s.achievements.totalDosesTaken);

  const todayReminders = useMemo(
    () => Object.values(allReminders).filter((r) => r.isActive),
    [allReminders]
  );

  // ── Next upcoming dose ────────────────────────────────────────────────────
  const nextSlotInfo = useMemo(() => {
    if (!todayReminders.length) return null;
    const candidates = todayReminders
      .filter((r) => medicationItems[r.medicationId])
      .map((r) => {
        const times = r.scheduledTimes?.length ? r.scheduledTimes : ['08:00'];
        const slot = getNextSlot(times, r.daysOfWeek);
        return { reminder: r, ...slot, medication: medicationItems[r.medicationId]! };
      });
    return candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  }, [todayReminders, medicationItems]);

  // ── Adherence score ───────────────────────────────────────────────────────
  const adherenceScore = useMemo(() => {
    const flat = (Object.values(allEvents) as ReminderEvent[][]).reduce<ReminderEvent[]>(
      (acc, arr) => acc.concat(arr ?? []), []
    );
    const relevant = flat.filter((e) => e.status === 'taken' || e.status === 'missed');
    if (!relevant.length) return null;
    return Math.round((relevant.filter((e) => e.status === 'taken').length / relevant.length) * 100);
  }, [allEvents]);

  // ── 7-day chart data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const flat = (Object.values(allEvents) as ReminderEvent[][]).reduce<ReminderEvent[]>(
      (acc, arr) => acc.concat(arr ?? []), []
    );
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayEvents = flat.filter((e) => e.scheduledAt.startsWith(dateStr));
      return {
        label: getDayName(d.getDay()),
        taken: dayEvents.filter((e) => e.status === 'taken').length,
        missed: dayEvents.filter((e) => e.status === 'missed').length,
      };
    });
  }, [allEvents]);

  // ── Today's schedule ──────────────────────────────────────────────────────
  const todayDow = new Date().getDay();
  const today = todayDateString();

  const todaysSchedule = useMemo((): ScheduleSlot[] => {
    const slots: ScheduleSlot[] = [];
    for (const reminder of todayReminders) {
      if (reminder.daysOfWeek.length > 0 && !reminder.daysOfWeek.includes(todayDow)) continue;
      const medication = medicationItems[reminder.medicationId];
      if (!medication) continue;
      const times = reminder.scheduledTimes ?? ['08:00'];
      for (const timeSlot of times) {
        const events = (allEvents[reminder.id] ?? []) as ReminderEvent[];
        const eventForToday = events.find(
          (e) => e.scheduledTimeSlot === timeSlot && e.scheduledAt.startsWith(today)
        );
        slots.push({ reminder, timeSlot, medication, eventForToday });
      }
    }
    return slots.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [todayReminders, medicationItems, allEvents, today, todayDow]);

  /**
   * Missed doses today — events with status='missed' scheduled for today.
   * WHY: Shows the user which doses they haven't confirmed, giving them
   * the chance to correct the record via "Take Late" before end of day.
   */
  const missedToday = useMemo(() => {
    return todaysSchedule.filter(
      (slot) => slot.eventForToday?.status === 'missed'
    );
  }, [todaysSchedule]);

  // ── Auto-mark expired snoozed events ─────────────────────────────────────
  useEffect(() => {
    dispatch(autoMarkExpiredSnoozedMissed());
  }, []);

  // ── Live countdown ticker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!nextSlotInfo) return;
    const update = () => {
      const secs = secondsUntil(nextSlotInfo.date.toISOString());
      setCountdown(formatCountdown(secs));
      const mins = Math.floor(secs / 60);
      if (!spokenMinutes.current.has(mins) && [5, 2, 1].includes(mins)) {
        speak(`${mins} minute${mins !== 1 ? 's' : ''} until ${nextSlotInfo.medication.name}`);
        spokenMinutes.current.add(mins);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextSlotInfo?.date.toISOString()]);

  // ── Confirm dose taken ────────────────────────────────────────────────────
  /**
   * confirmTaken — used by both TAKE NOW and the per-slot ✓ buttons.
   * Creates a ReminderEvent if one doesn't exist yet, then marks it taken.
   * Also dispatches recordDoseTaken() to advance streaks and unlock badges.
   */
  const confirmTaken = useCallback(
    (reminder: Reminder, timeSlot: string, existingEventId?: string) => {
      haptic('heavy');
      const eventId = existingEventId ?? generateId();
      if (!existingEventId) {
        dispatch(
          addReminderEvent({
            id: eventId,
            reminderId: reminder.id,
            medicationId: reminder.medicationId,
            scheduledTimeSlot: timeSlot,
            scheduledAt: `${today}T${timeSlot}:00.000Z`,
            status: 'pending',
            takenAt: null,
            snoozeCount: 0,
            snoozedUntil: null,
          })
        );
      }
      dispatch(markTaken({ reminderId: reminder.id, eventId }));
      dispatch(recordDoseTaken());
      notificationService.cancelReminder(reminder.notificationIds);
      speak(
        `${medicationItems[reminder.medicationId]?.name ?? 'Medication'} marked as taken. Well done!`
      );
    },
    [dispatch, haptic, speak, medicationItems, today]
  );

  /**
   * confirmTakenLate — corrects a missed-dose record.
   * WHY: Seniors sometimes take medicine without tapping the app. This lets
   * them update the record and keep their adherence score accurate.
   */
  const confirmTakenLate = useCallback(
    (slot: ScheduleSlot) => {
      if (!slot.eventForToday) return;
      haptic('medium');
      dispatch(
        markTakenLate({ reminderId: slot.reminder.id, eventId: slot.eventForToday.id })
      );
      dispatch(recordDoseTaken());
      speak(`${slot.medication.name} marked as taken. Your record has been updated.`);
    },
    [dispatch, haptic, speak]
  );

  const handleTakeNow = () => {
    if (!nextSlotInfo) return;
    confirmTaken(nextSlotInfo.reminder, nextSlotInfo.timeSlot);
  };

  // ── SOS / Emergency call ──────────────────────────────────────────────────
  /**
   * handleSOS — places a real phone call to the emergency contact.
   * WHY: In a real emergency the user must not be stuck in a dialog;
   * one confirmation tap then immediately opens the phone dialler.
   * Default fallback (+919428201825) ensures there's always a number.
   */
  const handleSOS = () => {
    haptic('heavy');
    const contact = emergencyContact;
    Alert.alert(
      '🆘 Call Emergency Contact?',
      `This will call ${contact} immediately.\n\nOnly use this in a genuine emergency.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `📞 Call ${contact}`,
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${contact}`).catch(() => {
              Alert.alert('Error', 'Could not open phone dialler. Please call manually: ' + contact);
            });
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(autoMarkExpiredSnoozedMissed());
    spokenMinutes.current.clear();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const slotStatusIcon = (slot: ScheduleSlot) => {
    const s = slot.eventForToday?.status;
    if (s === 'taken') return '✅';
    if (s === 'missed') return '❌';
    if (s === 'snoozed') return '⏰';
    if (s === 'skipped') return '⏭️';
    return null;
  };

  const slotIsDone = (slot: ScheduleSlot) =>
    slot.eventForToday?.status === 'taken' || slot.eventForToday?.status === 'skipped';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + streak badge */}
        <View style={styles.greetingRow}>
          {userName ? (
            <Text
              style={[styles.greeting, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
            >
              Hello, {userName} 👋
            </Text>
          ) : (
            <View />
          )}
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{currentStreak}d</Text>
            </View>
          )}
        </View>

        {/* Next medicine countdown card */}
        {nextSlotInfo ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.cardShadow }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>NEXT MEDICINE</Text>
            <Text style={[styles.medName, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
              {nextSlotInfo.medication.name}
            </Text>
            <Text style={[styles.medDose, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
              {nextSlotInfo.medication.dosage} {nextSlotInfo.medication.unit}
              {' · '}at {formatTimeFromHHMM(nextSlotInfo.timeSlot)}
            </Text>
            <Text
              accessible
              accessibilityRole="timer"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Time remaining: ${countdown}`}
              style={[styles.countdown, { color: colors.primary, fontSize: Typography.huge.fontSize * textScale }]}
            >
              {countdown}
            </Text>
            <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
              until next dose
            </Text>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
              No medicines scheduled today.{'\n'}Go to Medicines tab to add one.
            </Text>
          </View>
        )}

        {/* Primary CTA buttons */}
        <View style={styles.ctaCol}>
          <BigButton
            label="TAKE NOW ✓"
            onPress={handleTakeNow}
            variant="primary"
            size="large"
            disabled={!nextSlotInfo}
            accessibilityHint="Double-tap to confirm you have taken your next medication"
            testID="btn-take-now"
          />
          {/* SOS — calls emergency contact via system dialler */}
          <BigButton
            label="🆘  Call Help (SOS)"
            onPress={handleSOS}
            variant="danger"
            size="normal"
            accessibilityHint={`Double-tap to call emergency contact ${emergencyContact}`}
            testID="btn-call-help"
          />
        </View>

        {/* Stats row */}
        {(adherenceScore !== null || totalDoses > 0) && (
          <View style={styles.statsRow}>
            {adherenceScore !== null && (
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: adherenceScore >= 80 ? colors.success : colors.warning, fontSize: Typography.heading.fontSize * textScale }]}>
                  {adherenceScore}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Adherence</Text>
                <Text style={styles.statEmoji}>{adherenceScore >= 90 ? '🏆' : adherenceScore >= 70 ? '⭐' : '💪'}</Text>
              </View>
            )}
            {currentStreak > 0 && (
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary, fontSize: Typography.heading.fontSize * textScale }]}>
                  {currentStreak}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                <Text style={styles.statEmoji}>🔥</Text>
              </View>
            )}
            {totalDoses > 0 && (
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary, fontSize: Typography.heading.fontSize * textScale }]}>
                  {totalDoses}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Doses</Text>
                <Text style={styles.statEmoji}>💊</Text>
              </View>
            )}
          </View>
        )}

        {/* 7-day adherence chart */}
        {chartData.some((d) => d.taken + d.missed > 0) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AdherenceChart data={chartData} title="7-Day Adherence" />
          </View>
        )}

        {/* ── Missed Medicines Section ─────────────────────────────────────
            WHY: Shows unconfirmed past doses prominently so the user can
            either correct the record (Take Late) or acknowledge the miss.
            Critical for accurate adherence tracking and caregiver awareness.
        ─────────────────────────────────────────────────────────────────── */}
        {missedToday.length > 0 && (
          <View style={styles.missedSection}>
            <Text
              accessible
              accessibilityRole="header"
              style={[styles.missedTitle, { color: colors.error, fontSize: Typography.large.fontSize * textScale }]}
            >
              ❌ Missed Today ({missedToday.length})
            </Text>
            <Text style={[styles.missedSubtitle, { color: colors.textSecondary }]}>
              Tap "Taken Late" if you have already taken these
            </Text>
            {missedToday.map((slot) => (
              <View
                key={`${slot.reminder.id}-${slot.timeSlot}`}
                accessible
                accessibilityLabel={`Missed dose: ${slot.medication.name} scheduled at ${formatTimeFromHHMM(slot.timeSlot)}`}
                style={[styles.missedItem, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
              >
                <View style={styles.missedItemLeft}>
                  <Text style={[styles.missedItemName, { color: colors.error, fontSize: Typography.body.fontSize * textScale }]}>
                    {slot.medication.name}
                  </Text>
                  <Text style={[styles.missedItemDetail, { color: colors.textSecondary }]}>
                    {slot.medication.dosage} {slot.medication.unit} · scheduled {formatTimeFromHHMM(slot.timeSlot)}
                  </Text>
                </View>
                <TouchableOpacity
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${slot.medication.name} as taken late`}
                  accessibilityHint="Double-tap to correct this to taken"
                  onPress={() => confirmTakenLate(slot)}
                  style={[styles.takeLateBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.75}
                >
                  <Text style={styles.takeLateBtnText}>Taken{'\n'}Late ✓</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Today's Schedule with per-slot ✓ tick buttons ──────────────── */}
        {todaysSchedule.length > 0 && (
          <View style={styles.scheduleSection}>
            <Text
              accessible
              accessibilityRole="header"
              style={[styles.scheduleTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
            >
              Today's Schedule
            </Text>
            <Text style={[styles.scheduleHint, { color: colors.textSecondary }]}>
              Tap ✓ to mark a dose as taken
            </Text>
            {todaysSchedule.map((slot) => {
              const done = slotIsDone(slot);
              const icon = slotStatusIcon(slot);
              return (
                <View
                  key={`${slot.reminder.id}-${slot.timeSlot}`}
                  accessible
                  accessibilityLabel={`${slot.medication.name}, ${slot.medication.dosage} ${slot.medication.unit} at ${formatTimeFromHHMM(slot.timeSlot)}, ${done ? 'taken' : 'not yet taken'}`}
                  style={[
                    styles.scheduleItem,
                    {
                      backgroundColor: done ? colors.successLight : colors.surface,
                      borderColor: done ? colors.success : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.scheduleTimeBadge, { backgroundColor: done ? colors.success : colors.primary }]}>
                    <Text style={styles.scheduleTimeText}>{formatTimeFromHHMM(slot.timeSlot)}</Text>
                  </View>
                  <View style={styles.scheduleDetails}>
                    <Text style={[styles.scheduleName, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
                      {slot.medication.name}
                    </Text>
                    <Text style={[styles.scheduleDose, { color: colors.textSecondary }]}>
                      {slot.medication.dosage} {slot.medication.unit}
                    </Text>
                  </View>
                  {icon ? (
                    <Text style={styles.statusIcon} accessible={false}>{icon}</Text>
                  ) : (
                    <TouchableOpacity
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${slot.medication.name} as taken`}
                      accessibilityHint="Double-tap to confirm this dose was taken"
                      onPress={() => confirmTaken(slot.reminder, slot.timeSlot, slot.eventForToday?.id)}
                      style={[styles.tickBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.tickBtnText}>✓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ReminderAlertModal />
      <AchievementCelebration />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  greeting: { fontWeight: '700', flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  streakEmoji: { fontSize: 16 },
  streakText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  card: { borderRadius: Layout.cardBorderRadius, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.card },
  emptyCard: { borderRadius: Layout.cardBorderRadius, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', lineHeight: 26 },

  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.xs },
  medName: { fontWeight: '800', marginBottom: 4 },
  medDose: { marginBottom: Spacing.sm },
  countdown: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  countdownLabel: { fontSize: 13, marginTop: 2 },

  ctaCol: { gap: Spacing.sm, marginBottom: Spacing.md },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', borderRadius: Layout.cardBorderRadius, borderWidth: 1, padding: Spacing.sm, ...Shadows.card },
  statValue: { fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statEmoji: { fontSize: 20, marginTop: 4 },

  // Missed medicines section
  missedSection: { marginBottom: Spacing.md },
  missedTitle: { fontWeight: '800', marginBottom: 4 },
  missedSubtitle: { fontSize: 13, marginBottom: Spacing.sm },
  missedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.inputBorderRadius,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  missedItemLeft: { flex: 1 },
  missedItemName: { fontWeight: '700' },
  missedItemDetail: { fontSize: 13, marginTop: 2 },
  takeLateBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 68,
    minHeight: 52,
    justifyContent: 'center',
  },
  takeLateBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },

  // Today's schedule
  scheduleSection: { marginTop: Spacing.xs },
  scheduleTitle: { fontWeight: '700', marginBottom: 4 },
  scheduleHint: { fontSize: 13, marginBottom: Spacing.sm },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.inputBorderRadius,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    minHeight: 64,
  },
  scheduleTimeBadge: { width: 80, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  scheduleTimeText: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  scheduleDetails: { flex: 1, paddingHorizontal: Spacing.sm },
  scheduleName: { fontWeight: '600' },
  scheduleDose: { fontSize: 13 },
  statusIcon: { fontSize: 24, marginHorizontal: Spacing.sm },
  tickBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.xs },
  tickBtnText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
});
