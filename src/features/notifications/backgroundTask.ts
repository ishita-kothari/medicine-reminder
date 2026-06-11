import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_TASK_NAME, ESCALATION_TIERS } from '../../constants/alertTiming';
import { ReminderEvent, AlertEvent, FamilyMember } from '../../types';
import { minutesSince, nowISO } from '../../utils/dateHelpers';
import { generateId } from '../../utils/idGenerator';

async function getPersistedState(): Promise<{ reminders: any; family: any } | null> {
  try {
    const raw = await AsyncStorage.getItem('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    return {
      reminders: JSON.parse(root.reminders || '{}'),
      family: JSON.parse(root.family || '{}'),
    };
  } catch {
    return null;
  }
}

async function appendAlertToQueue(event: AlertEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('pending_alert_queue');
    const queue: AlertEvent[] = raw ? JSON.parse(raw) : [];
    queue.push(event);
    await AsyncStorage.setItem('pending_alert_queue', JSON.stringify(queue));
  } catch (err) {
    if (__DEV__) console.error('[backgroundTask] Failed to persist alert:', err);
  }
}

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

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  const state = await getPersistedState();
  if (!state) return TaskManager.TaskManagerTaskBehavior.CONTINUE;

  const { reminders: remindersState, family: familyState } = state;
  const allEvents: Record<string, ReminderEvent[]> = remindersState?.events ?? {};
  const allReminders = remindersState?.reminders ?? {};
  const familyMembers: FamilyMember[] = Object.values(familyState?.members ?? {});
  const primaryMembers = familyMembers.filter((m: FamilyMember) => m.receiveAlerts);

  for (const [reminderId, events] of Object.entries(allEvents)) {
    const pendingEvents = (events as ReminderEvent[]).filter(
      (e) => e.status === 'pending' || e.status === 'snoozed'
    );

    for (const event of pendingEvents) {
      const minutesPast = minutesSince(event.scheduledAt);
      if (minutesPast < 1) continue;

      const tier = ESCALATION_TIERS.slice()
        .reverse()
        .find((t) => minutesPast >= t.minutesPastDue);
      if (!tier || tier.minutesPastDue === 0) continue;

      const reminder = allReminders[reminderId];
      if (!reminder?.notifyFamilyIfMissed) continue;

      const medId = event.medicationId;
      const alertEvent: AlertEvent = {
        id: generateId(),
        familyMemberId: primaryMembers[0]?.id ?? '',
        reminderId: event.reminderId,
        medicationId: medId,
        medicationName: `Medicine (ID: ${medId})`,
        scheduledAt: event.scheduledAt,
        triggeredAt: nowISO(),
        urgency: tier.urgency,
        minutesPastDue: tier.minutesPastDue,
        channel: 'local',
        delivered: false,
        deliveredAt: null,
        message: tier.message,
      };

      await appendAlertToQueue(alertEvent);

      // Notify the user themselves
      if (primaryMembers.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Missed dose alert (${tier.urgency})`,
            body: tier.message,
            data: { type: 'caregiver_alert', alertEventId: alertEvent.id },
          },
          trigger: null,
        });
      }
    }
  }

  return TaskManager.TaskManagerTaskBehavior.CONTINUE;
});
