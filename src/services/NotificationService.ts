/**
 * NotificationService.ts
 *
 * Wraps expo-notifications for scheduling, action handling, and snoozing.
 *
 * NOTIFICATION ACTION BUTTONS
 * ───────────────────────────
 * We register a category "medication_reminder" with two action buttons:
 *   • MARK_TAKEN  — "✅ Taken"       (dismisses notification, marks dose taken)
 *   • SNOOZE_10   — "⏰ Snooze 10 min" (reschedules a one-shot notification)
 *
 * How users interact with them:
 *   iOS  : Long-press the notification banner OR swipe left on lock screen
 *          → buttons appear inline without opening the app
 *   Android: Buttons appear directly in the notification drawer below the text
 *
 * The responses are handled in NotificationHandler.tsx via
 * addNotificationResponseReceivedListener, which checks actionIdentifier
 * before deciding whether to open the ReminderAlertModal.
 */
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert, Linking } from 'react-native';
import { Reminder, Medication } from '../types';
import { BACKGROUND_TASK_NAME } from '../constants/alertTiming';

export const NOTIFICATION_CATEGORY = 'medication_reminder';
export const ACTION_MARK_TAKEN = 'MARK_TAKEN';
export const ACTION_SNOOZE_10 = 'SNOOZE_10';

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

    // Register interactive action buttons on the notification
    // iOS: long-press banner or swipe lock-screen notification → buttons appear
    // Android: buttons appear inline in the notification drawer
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
      {
        identifier: ACTION_MARK_TAKEN,
        buttonTitle: '✅ Taken',
        options: {
          opensAppToForeground: true,  // opens app briefly for audio confirmation
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_10,
        buttonTitle: '⏰ Snooze 10 min',
        options: {
          opensAppToForeground: false, // reschedule without opening app
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    // Register background task so OS can wake the app for missed-dose checks
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
      if (!isRegistered) {
        await Notifications.registerTaskAsync(BACKGROUND_TASK_NAME);
      }
    } catch {
      // Background fetch not supported on all platforms (e.g. simulator)
    }
  }

  /** Returns true if granted, false if denied. */
  async requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: false,
      },
    });
    return status === 'granted';
  }

  showPermissionDeniedAlert(): void {
    Alert.alert(
      '🔔 Notifications Disabled',
      'SeniorCare needs notifications to remind you to take medicines. Please enable them in your device Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  /**
   * Schedule one OS notification per (time-slot × weekday) pair.
   * Each notification has action buttons (TAKEN / SNOOZE) via categoryIdentifier.
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
      const [hours, mins] = timeSlot.split(':').map(Number);
      for (const weekday of daysToSchedule) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${medication.name}`,
            body:
              `${medication.dosage} ${medication.unit}` +
              (medication.instructions ? ` — ${medication.instructions}` : '') +
              `\nTap to confirm or long-press for quick actions`,
            data: {
              reminderId: reminder.id,
              medicationId: medication.id,
              scheduledTimeSlot: timeSlot,
              medicationName: medication.name,
              dosage: medication.dosage,
              unit: medication.unit,
              snoozeMinutes: reminder.snoozeMinutes,
              type: 'medication_reminder',
            },
            sound: 'default',
            // Links this notification to the category with action buttons
            categoryIdentifier: NOTIFICATION_CATEGORY,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: hours!,
            minute: mins!,
            weekday: weekday + 1,
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
      notificationIds.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
      )
    );
  }

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
        body:
          `${minutes}-min snooze — take your ${medication.dosage} ${medication.unit} now.\n` +
          `Long-press for quick actions`,
        data: {
          reminderId: reminder.id,
          medicationId: medication.id,
          scheduledTimeSlot: timeSlot,
          medicationName: medication.name,
          dosage: medication.dosage,
          unit: medication.unit,
          snoozeMinutes: reminder.snoozeMinutes,
          type: 'medication_snooze',
        },
        sound: 'default',
        categoryIdentifier: NOTIFICATION_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });
    return [id];
  }

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

      const presentCount = reminder.notificationIds.filter((id) =>
        scheduledIds.has(id)
      ).length;

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
