import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  openReminderAlert,
  addReminderEvent,
  autoMarkExpiredSnoozedMissed,
  migrateReminders,
} from '../../store/slices/remindersSlice';
import { notificationService } from '../../services/NotificationService';
import { generateId } from '../../utils/idGenerator';
import { nowISO } from '../../utils/dateHelpers';

export default function NotificationHandler() {
  const dispatch = useAppDispatch();
  const reminders = useAppSelector((s) => s.reminders.reminders);
  const medications = useAppSelector((s) => s.medications.items);
  const hasMigrated = useRef(false);

  // Run data migration once on mount (handles reminders persisted with old scheduledTime field)
  useEffect(() => {
    if (!hasMigrated.current) {
      dispatch(migrateReminders());
      dispatch(autoMarkExpiredSnoozedMissed());
      hasMigrated.current = true;
    }
  }, []);

  useEffect(() => {
    // Handle tap on a delivered notification → open ReminderAlertModal
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

    // On app resume: auto-mark expired snoozed events + reschedule missing notifications
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        dispatch(autoMarkExpiredSnoozedMissed());
        const activeReminders = Object.values(reminders).filter((r) => r.isActive);
        notificationService.rescheduleAll(activeReminders, medications);
      }
    });

    return () => {
      responseSub.remove();
      appStateSub.remove();
    };
  }, [reminders, medications]);

  return null;
}
