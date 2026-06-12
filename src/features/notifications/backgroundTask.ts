/**
 * backgroundTask.ts
 *
 * WHY: iOS and Android support limited background execution via
 * expo-task-manager. When the app is in the background or terminated,
 * this task checks for overdue reminder events and queues caregiver
 * alert events into AsyncStorage.
 *
 * IMPORTANT PLATFORM LIMITATIONS:
 *   - iOS fires background fetch at most once every ~15 minutes and only
 *     when the OS decides conditions are right. This is best-effort.
 *   - Android is more reliable but still subject to Doze mode restrictions.
 *   - The PRIMARY missed-dose detection runs in NotificationHandler when the
 *     app resumes (active state). The background task is supplementary.
 *
 * HOW IT WORKS:
 *   1. Reads persisted Redux state directly from AsyncStorage (Redux store is
 *      not available in background task context — no hooks, no dispatch)
 *   2. Finds reminder events that are overdue (status = pending or snoozed)
 *   3. Creates AlertEvent records and appends them to a separate
 *      "pending_alert_queue" AsyncStorage key
 *   4. When the app comes to foreground, NotificationHandler calls
 *      flushPendingAlerts() to process and dispatch these events
 *   5. Fires an immediate local notification to the user's own device
 *      so they are aware of the missed dose even without unlocking
 */
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_TASK_NAME, ESCALATION_TIERS } from '../../constants/alertTiming';
import { ReminderEvent, AlertEvent, FamilyMember, Reminder, Medication } from '../../types';
import { minutesSince, nowISO } from '../../utils/dateHelpers';
import { generateId } from '../../utils/idGenerator';

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────

/**
 * Reads the full persisted Redux state from AsyncStorage.
 * Returns null if no state exists (first launch or storage error).
 */
async function getPersistedState(): Promise<{
  reminders: any;
  family: any;
  medications: any;
  user: any;
} | null> {
  try {
    const raw = await AsyncStorage.getItem('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    return {
      reminders: JSON.parse(root.reminders || '{}'),
      family: JSON.parse(root.family || '{}'),
      medications: JSON.parse(root.medications || '{}'),
      user: JSON.parse(root.user || '{}'),
    };
  } catch {
    return null;
  }
}

/**
 * Appends a new AlertEvent to the pending queue in AsyncStorage.
 * The queue is drained by NotificationHandler when the app resumes.
 */
export async function appendAlertToQueue(event: AlertEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('pending_alert_queue');
    const queue: AlertEvent[] = raw ? JSON.parse(raw) : [];
    // Deduplicate by reminderId + minutesPastDue to avoid repeat alerts
    const alreadyQueued = queue.some(
      (e) => e.reminderId === event.reminderId && e.minutesPastDue === event.minutesPastDue
    );
    if (!alreadyQueued) {
      queue.push(event);
      await AsyncStorage.setItem('pending_alert_queue', JSON.stringify(queue));
    }
  } catch (err) {
    if (__DEV__) console.error('[backgroundTask] Failed to persist alert:', err);
  }
}

/**
 * Reads and clears the pending alert queue.
 * Called by NotificationHandler on every app resume.
 *
 * @returns Array of queued AlertEvents (empty if none)
 */
export async function flushPendingAlerts(): Promise<AlertEvent[]> {
  try {
    const raw = await AsyncStorage.getItem('pending_alert_queue');
    if (!raw) return [];
    const events: AlertEvent[] = JSON.parse(raw);
    await AsyncStorage.removeItem('pending_alert_queue');
    return events;
  } catch {
    return [];
  }
}

// ─── Task definition ──────────────────────────────────────────────────────────

/**
 * MISSED_DOSE_ESCALATION background task.
 *
 * Registered in NotificationService.initialize() and defined here via
 * TaskManager.defineTask. The task name must match BACKGROUND_TASK_NAME
 * constant.
 *
 * ESCALATION TIERS (from alertTiming.ts):
 *   0 min  → low urgency    (initial reminder)
 *   10 min → medium urgency (second reminder)
 *   20 min → medium urgency (third reminder)
 *   30 min → high urgency   (caregiver alert queued)
 *   60 min → critical       (urgent caregiver alert)
 */
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  const state = await getPersistedState();
  if (!state) return TaskManager.TaskManagerTaskBehavior.CONTINUE;

  const { reminders: remindersState, family: familyState, medications: medsState, user: userState } = state;
  const allEvents: Record<string, ReminderEvent[]> = remindersState?.events ?? {};
  const allReminders: Record<string, Reminder> = remindersState?.reminders ?? {};
  const allMedications: Record<string, Medication> = medsState?.items ?? {};
  const familyMembers: FamilyMember[] = Object.values(familyState?.members ?? {});
  const primaryMembers = familyMembers.filter((m: FamilyMember) => m.receiveAlerts);
  const emergencyContact: string = userState?.emergencyContact || '+919428201825';

  for (const [reminderId, events] of Object.entries(allEvents)) {
    const pendingEvents = (events as ReminderEvent[]).filter(
      (e) => e.status === 'pending' || e.status === 'snoozed'
    );

    for (const event of pendingEvents) {
      const minutesPast = minutesSince(event.scheduledAt);
      if (minutesPast < 1) continue;

      // Find the highest escalation tier that applies
      const tier = ESCALATION_TIERS.slice()
        .reverse()
        .find((t) => minutesPast >= t.minutesPastDue);

      if (!tier || tier.minutesPastDue === 0) continue;

      const reminder = allReminders[reminderId];
      if (!reminder?.notifyFamilyIfMissed) continue;

      // Resolve medication name from Redux state
      const medication = allMedications[event.medicationId];
      const medName = medication?.name ?? `Medicine ID ${event.medicationId}`;

      const recipientId =
        primaryMembers.length > 0
          ? primaryMembers[0]?.id ?? ''
          : '';

      const alertEvent: AlertEvent = {
        id: generateId(),
        familyMemberId: recipientId,
        reminderId: event.reminderId,
        medicationId: event.medicationId,
        medicationName: medName,
        scheduledAt: event.scheduledAt,
        triggeredAt: nowISO(),
        urgency: tier.urgency,
        minutesPastDue: tier.minutesPastDue,
        channel: 'local',
        delivered: false,
        deliveredAt: null,
        message: `${medName} was not taken — ${tier.message}`,
      };

      await appendAlertToQueue(alertEvent);

      // Fire an immediate notification to the user's own device
      // This appears even when the app is closed
      const hasFamily = primaryMembers.length > 0 || emergencyContact;
      if (hasFamily) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${tier.urgency === 'critical' ? '🆘' : '⚠️'} Missed Dose: ${medName}`,
            body:
              tier.urgency === 'critical'
                ? `URGENT: ${medName} missed for ${minutesPast} min. Caregivers are being notified.`
                : `${medName} not confirmed ${minutesPast} min after scheduled time. Open app to confirm.`,
            data: { type: 'caregiver_alert', alertEventId: alertEvent.id },
            sound: 'default',
          },
          trigger: null, // Immediate delivery
        });
      }
    }
  }

  return TaskManager.TaskManagerTaskBehavior.CONTINUE;
});
