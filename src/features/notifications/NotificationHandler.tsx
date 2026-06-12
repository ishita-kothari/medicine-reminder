/**
 * NotificationHandler.tsx
 *
 * WHY: A non-rendering React component mounted at the root of the app that
 * wires three critical side-effect channels:
 *
 *   1. NOTIFICATION TAP (from OS tray) → opens the ReminderAlertModal
 *   2. FOREGROUND NOTIFICATION → speaks medication name if voiceEnabled
 *   3. APP RESUME (background → foreground) → auto-marks expired snoozed
 *      events as missed, reschedules any dropped OS notifications, and
 *      flushes the pending family-alert queue stored in AsyncStorage
 *
 * HOW: Mounted inside <NavigationContainer> in App.tsx so it has access to
 * the Redux store and navigation context. Returns null — no UI rendered.
 *
 * BACKGROUND DELIVERY: Expo Notifications CalendarTrigger fires even when
 * the app is closed. When the user taps the notification, iOS/Android
 * re-opens the app; this component's listener handles it immediately.
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { AppState, AppStateStatus, Linking, Alert } from 'react-native';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  openReminderAlert,
  addReminderEvent,
  markMissed,
  autoMarkExpiredSnoozedMissed,
  migrateReminders,
} from '../../store/slices/remindersSlice';
import { addAlertEvent, markAlertDelivered } from '../../store/slices/familySlice';
import { alertService } from '../../services/AlertService';
import { flushPendingAlerts } from './backgroundTask';
import { notificationService } from '../../services/NotificationService';
import { generateId } from '../../utils/idGenerator';
import { nowISO, minutesSince, formatTimeFromHHMM } from '../../utils/dateHelpers';
import { DEFAULT_EMERGENCY_CONTACT } from '../../store/slices/userSlice';
import { ESCALATION_TIERS } from '../../constants/alertTiming';

export default function NotificationHandler() {
  const dispatch = useAppDispatch();
  const reminders = useAppSelector((s) => s.reminders.reminders);
  const events = useAppSelector((s) => s.reminders.events);
  const medications = useAppSelector((s) => s.medications.items);
  const familyMembers = useAppSelector((s) => Object.values(s.family.members));
  const emergencyContact =
    useAppSelector((s) => s.user.emergencyContact) || DEFAULT_EMERGENCY_CONTACT;
  const settings = useAppSelector((s) => s.settings);
  const hasMigrated = useRef(false);

  // ── Migration: runs once on first mount ────────────────────────────────────
  useEffect(() => {
    if (!hasMigrated.current) {
      dispatch(migrateReminders());
      dispatch(autoMarkExpiredSnoozedMissed());
      hasMigrated.current = true;
    }
  }, []);

  // ── Flush background-queued alerts on foreground ───────────────────────────
  const flushAlerts = async () => {
    const queued = await flushPendingAlerts();
    if (queued.length === 0) return;

    for (const alertEvent of queued) {
      dispatch(addAlertEvent(alertEvent));
      // Send SMS / log the alert
      await alertService.sendEscalation(alertEvent, familyMembers, emergencyContact);
      dispatch(markAlertDelivered(alertEvent.id));
    }

    if (queued.length > 0) {
      const medName = queued[0]?.medicationName ?? 'a medication';
      Alert.alert(
        '⚠️ Missed Dose Detected',
        `${medName} was not taken on time. Your caregivers have been notified.`,
        [{ text: 'OK' }]
      );
    }
  };

  // ── Check for pending escalations on foreground ────────────────────────────
  const checkEscalations = () => {
    for (const [reminderId, reminderEvents] of Object.entries(events)) {
      if (!reminderEvents) continue;
      const reminder = reminders[reminderId];
      if (!reminder?.notifyFamilyIfMissed) continue;

      for (const event of reminderEvents) {
        if (event.status !== 'pending' && event.status !== 'snoozed') continue;
        const minutesPast = minutesSince(event.scheduledAt);
        if (minutesPast < 1) continue;

        const tier = ESCALATION_TIERS.slice()
          .reverse()
          .find((t) => minutesPast >= t.minutesPastDue);
        if (!tier || tier.minutesPastDue === 0) continue;

        const medication = medications[event.medicationId];
        if (!medication) continue;

        // Mark as missed if past 30-min threshold
        if (minutesPast >= 30 && event.status !== 'missed') {
          dispatch(markMissed({ reminderId, eventId: event.id }));
        }

        const alertEvent = {
          id: generateId(),
          familyMemberId: familyMembers.find((m) => m.isPrimary)?.id ?? '',
          reminderId,
          medicationId: event.medicationId,
          medicationName: medication.name,
          scheduledAt: event.scheduledAt,
          triggeredAt: nowISO(),
          urgency: tier.urgency,
          minutesPastDue: tier.minutesPastDue,
          channel: 'local' as const,
          delivered: false,
          deliveredAt: null,
          message: tier.message,
        };

        dispatch(addAlertEvent(alertEvent));
        alertService.sendEscalation(alertEvent, familyMembers, emergencyContact);
      }
    }
  };

  useEffect(() => {
    // ── 1. Notification tap listener (OS → app) ────────────────────────────
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        reminderId?: string;
        medicationId?: string;
        scheduledTimeSlot?: string;
        type?: string;
      };

      if (data.reminderId && data.medicationId) {
        const eventId = generateId();
        const timeSlot = data.scheduledTimeSlot ?? '08:00';

        dispatch(
          addReminderEvent({
            id: eventId,
            reminderId: data.reminderId,
            medicationId: data.medicationId,
            scheduledTimeSlot: timeSlot,
            scheduledAt: response.notification.date
              ? new Date(response.notification.date * 1000).toISOString()
              : nowISO(),
            status: 'pending',
            takenAt: null,
            snoozeCount: 0,
            snoozedUntil: null,
          })
        );
        dispatch(
          openReminderAlert({
            reminderId: data.reminderId,
            medicationId: data.medicationId,
            timeSlot,
          })
        );
      }
    });

    // ── 2. Foreground notification listener — speak if voiceEnabled ────────
    /**
     * WHY: When the app is in the foreground, tapping TAKE NOW or the alert
     * modal serves as the acknowledgement. But we still want to *announce*
     * the medication name audibly if the user has voice guidance enabled.
     * This fires as soon as the OS delivers the notification while app is open.
     */
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as {
        reminderId?: string;
        medicationId?: string;
        scheduledTimeSlot?: string;
      };

      if (!data.reminderId) return;

      const reminder = data.reminderId ? reminders[data.reminderId] : undefined;
      const medication = data.medicationId ? medications[data.medicationId] : undefined;

      // Speak if reminder.voiceEnabled is true — independent of global voiceGuidance.
      // voiceEnabled is a PER-REMINDER setting; voiceGuidance is for UI confirmations.
      if (reminder?.voiceEnabled && medication) {
        const timeSlot = data.scheduledTimeSlot
          ? `at ${formatTimeFromHHMM(data.scheduledTimeSlot)}`
          : '';
        const text = `Time to take ${medication.name}, ${medication.dosage} ${medication.unit} ${timeSlot}. Please tap the reminder to confirm.`;
        setTimeout(() => {
          Speech.speak(text, { rate: 0.85, pitch: 1.0 });
        }, 300);
      }
    });

    // ── 3. App state change → active (resume) ─────────────────────────────
    /**
     * WHY: iOS background tasks and Android background services are not
     * guaranteed to run. The most reliable time to process missed-dose
     * escalations and reschedule notifications is when the app comes back
     * to the foreground — the user is present and can act on alerts.
     */
    const appStateSub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        dispatch(autoMarkExpiredSnoozedMissed());
        checkEscalations();
        await flushAlerts();
        const activeReminders = Object.values(reminders).filter((r) => r.isActive);
        notificationService.rescheduleAll(activeReminders, medications);
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
      appStateSub.remove();
    };
  }, [reminders, medications, events, familyMembers, emergencyContact, settings]);

  return null;
}
