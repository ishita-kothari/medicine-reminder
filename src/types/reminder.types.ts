export type ReminderStatus = 'pending' | 'taken' | 'missed' | 'snoozed' | 'skipped';
export type SnoozeInterval = 5 | 10 | 15;

export interface Reminder {
  id: string;
  medicationId: string;
  /** Array of HH:mm strings — one per daily dose time (e.g. ["08:00","20:00"]) */
  scheduledTimes: string[];
  daysOfWeek: number[];
  isActive: boolean;
  voiceEnabled: boolean;
  vibrationEnabled: boolean;
  notifyFamilyIfMissed: boolean;
  notificationIds: string[];
  snoozeMinutes: SnoozeInterval;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEvent {
  id: string;
  reminderId: string;
  medicationId: string;
  /** The HH:mm slot that triggered this event (e.g. "08:00") */
  scheduledTimeSlot: string;
  /** Full ISO datetime this event was scheduled for */
  scheduledAt: string;
  status: ReminderStatus;
  takenAt: string | null;
  snoozeCount: number;
  snoozedUntil: string | null;
}

export interface RemindersState {
  reminders: Record<string, Reminder>;
  events: Record<string, ReminderEvent[]>;
  activeAlertReminderId: string | null;
  activeAlertMedicationId: string | null;
  activeAlertTimeSlot: string | null;
}
