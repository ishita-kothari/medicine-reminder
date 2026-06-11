import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Reminder, ReminderEvent, RemindersState } from '../../types';
import { nowISO, minutesSince } from '../../utils/dateHelpers';

const initialState: RemindersState = {
  reminders: {},
  events: {},
  activeAlertReminderId: null,
  activeAlertMedicationId: null,
  activeAlertTimeSlot: null,
};

/** Migrate a persisted reminder that still uses old single `scheduledTime` field */
function migrate(r: any): Reminder {
  if (!r.scheduledTimes) {
    return { ...r, scheduledTimes: [r.scheduledTime ?? '08:00'] };
  }
  return r as Reminder;
}

/** Migrate a persisted event that lacks scheduledTimeSlot */
function migrateEvent(e: any): ReminderEvent {
  if (!e.scheduledTimeSlot) {
    return { ...e, scheduledTimeSlot: '08:00' };
  }
  return e as ReminderEvent;
}

const remindersSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    addReminder(state, action: PayloadAction<Omit<Reminder, 'createdAt' | 'updatedAt'>>) {
      const reminder: Reminder = {
        ...action.payload,
        scheduledTimes: action.payload.scheduledTimes ?? ['08:00'],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      state.reminders[reminder.id] = reminder;
    },

    updateReminder(state, action: PayloadAction<Partial<Reminder> & { id: string }>) {
      const existing = state.reminders[action.payload.id];
      if (existing) {
        state.reminders[action.payload.id] = {
          ...existing,
          ...action.payload,
          updatedAt: nowISO(),
        };
      }
    },

    deleteReminder(state, action: PayloadAction<string>) {
      delete state.reminders[action.payload];
      delete state.events[action.payload];
    },

    addReminderEvent(state, action: PayloadAction<ReminderEvent>) {
      const { reminderId } = action.payload;
      if (!state.events[reminderId]) state.events[reminderId] = [];
      const events = state.events[reminderId]!;
      // Deduplicate by id
      if (!events.some((e) => e.id === action.payload.id)) {
        events.push(action.payload);
        if (events.length > 90) state.events[reminderId] = events.slice(-90);
      }
    },

    markTaken(state, action: PayloadAction<{ reminderId: string; eventId: string }>) {
      const events = state.events[action.payload.reminderId];
      if (events) {
        const event = events.find((e) => e.id === action.payload.eventId);
        if (event) { event.status = 'taken'; event.takenAt = nowISO(); }
      }
      if (state.activeAlertReminderId === action.payload.reminderId) {
        state.activeAlertReminderId = null;
        state.activeAlertMedicationId = null;
        state.activeAlertTimeSlot = null;
      }
    },

    markMissed(state, action: PayloadAction<{ reminderId: string; eventId: string }>) {
      const events = state.events[action.payload.reminderId];
      if (events) {
        const event = events.find((e) => e.id === action.payload.eventId);
        if (event) event.status = 'missed';
      }
    },

    /** Mark all snoozed events whose snoozedUntil has passed as missed */
    autoMarkExpiredSnoozedMissed(state) {
      for (const reminderId of Object.keys(state.events)) {
        const events = state.events[reminderId];
        if (!events) continue;
        for (const event of events) {
          if (
            event.status === 'snoozed' &&
            event.snoozedUntil &&
            minutesSince(event.snoozedUntil) > 0
          ) {
            event.status = 'missed';
          }
        }
      }
    },

    skipReminder(state, action: PayloadAction<{ reminderId: string; eventId: string }>) {
      const events = state.events[action.payload.reminderId];
      if (events) {
        const event = events.find((e) => e.id === action.payload.eventId);
        if (event) event.status = 'skipped';
      }
      if (state.activeAlertReminderId === action.payload.reminderId) {
        state.activeAlertReminderId = null;
        state.activeAlertMedicationId = null;
        state.activeAlertTimeSlot = null;
      }
    },

    snoozeReminder(
      state,
      action: PayloadAction<{ reminderId: string; eventId: string; snoozedUntil: string }>
    ) {
      const events = state.events[action.payload.reminderId];
      if (events) {
        const event = events.find((e) => e.id === action.payload.eventId);
        if (event) {
          event.status = 'snoozed';
          event.snoozeCount += 1;
          event.snoozedUntil = action.payload.snoozedUntil;
        }
      }
      if (state.activeAlertReminderId === action.payload.reminderId) {
        state.activeAlertReminderId = null;
        state.activeAlertMedicationId = null;
        state.activeAlertTimeSlot = null;
      }
    },

    openReminderAlert(
      state,
      action: PayloadAction<{ reminderId: string; medicationId: string; timeSlot?: string }>
    ) {
      state.activeAlertReminderId = action.payload.reminderId;
      state.activeAlertMedicationId = action.payload.medicationId;
      state.activeAlertTimeSlot = action.payload.timeSlot ?? null;
    },

    closeReminderAlert(state) {
      state.activeAlertReminderId = null;
      state.activeAlertMedicationId = null;
      state.activeAlertTimeSlot = null;
    },

    updateNotificationIds(
      state,
      action: PayloadAction<{ reminderId: string; notificationIds: string[] }>
    ) {
      const reminder = state.reminders[action.payload.reminderId];
      if (reminder) {
        reminder.notificationIds = action.payload.notificationIds;
        reminder.updatedAt = nowISO();
      }
    },

    /** Run migrations on rehydration — called once when persist rehydrates */
    migrateReminders(state) {
      for (const id of Object.keys(state.reminders)) {
        state.reminders[id] = migrate(state.reminders[id]);
      }
      for (const remId of Object.keys(state.events)) {
        state.events[remId] = state.events[remId]?.map(migrateEvent) ?? [];
      }
    },
  },
});

export const {
  addReminder,
  updateReminder,
  deleteReminder,
  addReminderEvent,
  markTaken,
  markMissed,
  autoMarkExpiredSnoozedMissed,
  skipReminder,
  snoozeReminder,
  openReminderAlert,
  closeReminderAlert,
  updateNotificationIds,
  migrateReminders,
} = remindersSlice.actions;

export default remindersSlice.reducer;
