import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder, Medication } from '../types';

/**
 * Foreground handler — show notifications even when the app is open.
 * Background/closed delivery is handled by the OS once a CalendarTrigger
 * is scheduled; no extra config is needed beyond setting permissions and
 * having UIBackgroundModes (fetch, remote-notification) in app.json.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Medication Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A6B4A',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('caregiver-alerts', {
        name: 'Caregiver Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#C62828',
      });
    }
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return status === 'granted';
  }

  /**
   * Schedule one OS notification per (time-slot × weekday) pair.
   * Returns all notification IDs created so they can be stored for later cancellation.
   *
   * How background delivery works:
   *   CalendarTrigger with repeats:true is registered with the OS scheduler.
   *   The OS fires it at the exact time regardless of app state (foreground,
   *   background, or terminated). On iOS this requires notification permissions;
   *   on Android it requires the notification channel to be created first.
   */
  async scheduleReminder(reminder: Reminder, medication: Medication): Promise<string[]> {
    const granted = await this.requestPermissions();
    if (!granted) return [];

    const times: string[] = reminder.scheduledTimes?.length
      ? reminder.scheduledTimes
      : ['08:00'];

    const daysToSchedule =
      reminder.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : reminder.daysOfWeek;

    const notificationIds: string[] = [];

    for (const timeSlot of times) {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      for (const weekday of daysToSchedule) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${medication.name}`,
            body: `${medication.dosage} ${medication.unit}${medication.instructions ? ` — ${medication.instructions}` : ''}`,
            data: {
              reminderId: reminder.id,
              medicationId: medication.id,
              scheduledTimeSlot: timeSlot,
              type: 'medication_reminder',
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: hours!,
            minute: minutes!,
            weekday: weekday + 1, // Expo weekday: 1=Sun … 7=Sat
            repeats: true,
          },
        });
        notificationIds.push(id);
      }
    }

    return notificationIds;
  }

  async cancelReminder(notificationIds: string[]): Promise<void> {
    await Promise.all(
      notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
    );
  }

  /**
   * Schedule a one-shot snooze notification.
   * The original repeating notifications are NOT re-cancelled here — they are
   * already cancelled by the caller before snooze() is invoked.
   */
  async snooze(
    reminder: Reminder,
    medication: Medication,
    minutes: 5 | 10 | 15,
    timeSlot: string
  ): Promise<string[]> {
    await this.cancelReminder(reminder.notificationIds);

    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Snoozed: ${medication.name}`,
        body: `${minutes}-minute snooze — please take your ${medication.dosage} ${medication.unit} now`,
        data: {
          reminderId: reminder.id,
          medicationId: medication.id,
          scheduledTimeSlot: timeSlot,
          type: 'medication_snooze',
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });
    return [id];
  }

  /**
   * Called every time the app returns to foreground.
   * Re-schedules any reminders whose OS notifications were dropped (e.g. after
   * phone restart on Android, or iOS background-kill purge).
   */
  async rescheduleAll(
    reminders: Reminder[],
    medications: Record<string, Medication>
  ): Promise<void> {
    const pending = await Notifications.getPendingNotificationRequestsAsync();
    const scheduledIds = new Set(pending.map((r) => r.identifier));

    for (const reminder of reminders) {
      if (!reminder.isActive) continue;
      const medication = medications[reminder.medicationId];
      if (!medication) continue;

      const expectedCount =
        (reminder.scheduledTimes?.length ?? 1) *
        (reminder.daysOfWeek.length === 0 ? 7 : reminder.daysOfWeek.length);

      const presentCount = reminder.notificationIds.filter((id) => scheduledIds.has(id)).length;

      if (presentCount < expectedCount) {
        await this.cancelReminder(reminder.notificationIds);
        await this.scheduleReminder(reminder, medication);
      }
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
