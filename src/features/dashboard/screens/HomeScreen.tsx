import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import {
  markTaken,
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

  const userName = useAppSelector((s) => s.user.name);
  const emergencyContact = useAppSelector((s) => s.user.emergencyContact);
  const medicationItems = useAppSelector((s) => s.medications.items);
  const allReminders = useAppSelector((s) => s.reminders.reminders);
  const allEvents = useAppSelector((s) => s.reminders.events);
  const currentStreak = useAppSelector((s) => s.achievements.currentStreak);
  const totalDoses = useAppSelector((s) => s.achievements.totalDosesTaken);

  const todayReminders = useMemo(
    () => Object.values(allReminders).filter((r) => r.isActive),
    [allReminders]
  );

  // Next upcoming slot across all reminders
  const nextSlotInfo = useMemo(() => {
    if (!todayReminders.length) return null;
    const candidates = todayReminders
      .filter((r) => medicationItems[r.medicationId])
      .map((r) => {
        const times = r.scheduledTimes ?? ['08:00'];
        const slot = getNextSlot(times, r.daysOfWeek);
        return { reminder: r, ...slot, medication: medicationItems[r.medicationId]! };
      });
    return candidates.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  }, [todayReminders, medicationItems]);

  const adherenceScore = useMemo(() => {
    const flat = (Object.values(allEvents) as ReminderEvent[][]).reduce<ReminderEvent[]>((acc, arr) => acc.concat(arr ?? []), []);
    const relevant = flat.filter((e) => e.status === 'taken' || e.status === 'missed');
    if (!relevant.length) return null;
    return Math.round((relevant.filter((e) => e.status === 'taken').length / relevant.length) * 100);
  }, [allEvents]);

  // 7-day chart data
  const chartData = useMemo(() => {
    const flat = (Object.values(allEvents) as ReminderEvent[][]).reduce<ReminderEvent[]>((acc, arr) => acc.concat(arr ?? []), []);
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

  // Today's schedule — one row per (reminder × time slot)
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
          (e) =>
            e.scheduledTimeSlot === timeSlot &&
            e.scheduledAt.startsWith(today)
        );
        slots.push({ reminder, timeSlot, medication, eventForToday });
      }
    }
    return slots.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [todayReminders, medicationItems, allEvents, today, todayDow]);

  // ── Auto-mark expired snoozed events as missed on each render ───────────
  useEffect(() => {
    dispatch(autoMarkExpiredSnoozedMissed());
  }, []);

  // ── Live countdown ───────────────────────────────────────────────────────
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

  // ── Confirm dose taken (TAKE NOW + inline tick) ──────────────────────────
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
      speak(`${medicationItems[reminder.medicationId]?.name ?? 'Medication'} marked as taken. Well done!`);
    },
    [dispatch, haptic, speak, medicationItems, today]
  );

  const handleTakeNow = () => {
    if (!nextSlotInfo) return;
    confirmTaken(nextSlotInfo.reminder, nextSlotInfo.timeSlot);
  };

  // ── SOS — placeholder alert (no real call) ───────────────────────────────
  const handleSOS = () => {
    haptic('heavy');
    Alert.alert(
      '🆘 Emergency Help',
      emergencyContact
        ? `This would call ${emergencyContact} in the live version.\n\nIn a real emergency, please dial your local emergency number (e.g. 911 or 999) immediately.`
        : 'No emergency contact set.\n\nPlease add one in Settings → your profile.\n\nIn a real emergency, dial your local emergency number.',
      [
        { text: 'OK', style: 'cancel' },
        ...(emergencyContact
          ? [{ text: `Call ${emergencyContact}`, style: 'destructive' as const, onPress: () => {} }]
          : []),
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(autoMarkExpiredSnoozedMissed());
    spokenMinutes.current.clear();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Status helpers ───────────────────────────────────────────────────────
  const slotStatusIcon = (slot: ScheduleSlot) => {
    const s = slot.eventForToday?.status;
    if (s === 'taken') return '✅';
    if (s === 'missed') return '❌';
    if (s === 'snoozed') return '⏰';
    if (s === 'skipped') return '⏭️';
    return null;
  };

  const slotIsTaken = (slot: ScheduleSlot) =>
    slot.eventForToday?.status === 'taken' || slot.eventForToday?.status === 'skipped';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + streak */}
        <View style={styles.greetingRow}>
          {userName ? (
            <Text style={[styles.greeting, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
              Hello, {userName} 👋
            </Text>
          ) : <View />}
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{currentStreak}d</Text>
            </View>
          )}
        </View>

        {/* Next medicine card */}
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
            <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>until next dose</Text>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
              No medicines scheduled today.{'\n'}Go to Medicines tab to add one.
            </Text>
          </View>
        )}

        {/* CTA buttons */}
        <View style={styles.ctaCol}>
          <BigButton
            label="TAKE NOW ✓"
            onPress={handleTakeNow}
            variant="primary"
            size="large"
            disabled={!nextSlotInfo}
            accessibilityHint="Double-tap to mark your next medication as taken"
            testID="btn-take-now"
          />
          <BigButton
            label="🆘  Call Help (SOS)"
            onPress={handleSOS}
            variant="danger"
            size="normal"
            accessibilityHint="Double-tap to see emergency help options"
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

        {/* 7-day chart */}
        {chartData.some((d) => d.taken + d.missed > 0) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AdherenceChart data={chartData} title="7-Day Adherence" />
          </View>
        )}

        {/* ── Today's Schedule with tick buttons ──────────────────────── */}
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
              Tap ✓ next to any dose to mark it as taken
            </Text>
            {todaysSchedule.map((slot, index) => {
              const taken = slotIsTaken(slot);
              const icon = slotStatusIcon(slot);
              return (
                <View
                  key={`${slot.reminder.id}-${slot.timeSlot}`}
                  accessible
                  accessibilityLabel={`${slot.medication.name}, ${slot.medication.dosage} ${slot.medication.unit} at ${formatTimeFromHHMM(slot.timeSlot)}, ${taken ? 'taken' : 'not yet taken'}`}
                  style={[
                    styles.scheduleItem,
                    {
                      backgroundColor: taken ? colors.successLight : colors.surface,
                      borderColor: taken ? colors.success : colors.border,
                      opacity: taken ? 0.85 : 1,
                    },
                  ]}
                >
                  {/* Time badge */}
                  <View style={[styles.scheduleTimeBadge, { backgroundColor: taken ? colors.success : colors.primary }]}>
                    <Text style={styles.scheduleTimeText}>{formatTimeFromHHMM(slot.timeSlot)}</Text>
                  </View>

                  {/* Details */}
                  <View style={styles.scheduleDetails}>
                    <Text style={[styles.scheduleName, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
                      {slot.medication.name}
                    </Text>
                    <Text style={[styles.scheduleDose, { color: colors.textSecondary }]}>
                      {slot.medication.dosage} {slot.medication.unit}
                    </Text>
                  </View>

                  {/* Status icon or tick button */}
                  {icon ? (
                    <Text style={styles.statusIcon} accessible={false}>{icon}</Text>
                  ) : (
                    <TouchableOpacity
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${slot.medication.name} at ${formatTimeFromHHMM(slot.timeSlot)} as taken`}
                      accessibilityHint="Double-tap to confirm you took this dose"
                      onPress={() =>
                        confirmTaken(
                          slot.reminder,
                          slot.timeSlot,
                          slot.eventForToday?.id
                        )
                      }
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  greeting: { fontWeight: '700', flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  streakEmoji: { fontSize: 16 },
  streakText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  emptyCard: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', lineHeight: 26 },

  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.xs },
  medName: { fontWeight: '800', marginBottom: 4 },
  medDose: { marginBottom: Spacing.sm },
  countdown: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  countdownLabel: { fontSize: 13, marginTop: 2 },

  ctaCol: { gap: Spacing.sm, marginBottom: Spacing.md },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.sm,
    ...Shadows.card,
  },
  statValue: { fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statEmoji: { fontSize: 20, marginTop: 4 },

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
  scheduleTimeBadge: {
    width: 80,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  scheduleTimeText: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  scheduleDetails: { flex: 1, paddingHorizontal: Spacing.sm },
  scheduleName: { fontWeight: '600' },
  scheduleDose: { fontSize: 13 },
  statusIcon: { fontSize: 24, marginHorizontal: Spacing.sm },
  tickBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xs,
  },
  tickBtnText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
});
