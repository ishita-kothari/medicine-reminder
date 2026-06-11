import remindersReducer, {
  addReminder,
  updateReminder,
  deleteReminder,
  addReminderEvent,
  markTaken,
  markMissed,
  skipReminder,
  snoozeReminder,
  openReminderAlert,
  closeReminderAlert,
} from '../../src/store/slices/remindersSlice';
import { RemindersState, Reminder, ReminderEvent } from '../../src/types';

const emptyState: RemindersState = {
  reminders: {},
  events: {},
  activeAlertReminderId: null,
  activeAlertMedicationId: null,
};

const mockReminder: Omit<Reminder, 'createdAt' | 'updatedAt'> = {
  id: 'rem-1',
  medicationId: 'med-1',
  scheduledTime: '08:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  isActive: true,
  voiceEnabled: true,
  vibrationEnabled: true,
  notifyFamilyIfMissed: true,
  notificationIds: [],
  snoozeMinutes: 10,
};

const mockEvent: ReminderEvent = {
  id: 'evt-1',
  reminderId: 'rem-1',
  medicationId: 'med-1',
  scheduledAt: new Date().toISOString(),
  status: 'pending',
  takenAt: null,
  snoozeCount: 0,
  snoozedUntil: null,
};

describe('remindersSlice', () => {
  it('addReminder adds reminder with timestamps', () => {
    const state = remindersReducer(emptyState, addReminder(mockReminder));
    expect(state.reminders['rem-1']).toBeDefined();
    expect(state.reminders['rem-1']!.scheduledTime).toBe('08:00');
    expect(state.reminders['rem-1']!.createdAt).toBeTruthy();
  });

  it('updateReminder updates existing reminder', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, updateReminder({ id: 'rem-1', scheduledTime: '09:30' }));
    expect(state.reminders['rem-1']!.scheduledTime).toBe('09:30');
    expect(state.reminders['rem-1']!.medicationId).toBe('med-1');
  });

  it('deleteReminder removes reminder and its events', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(state, deleteReminder('rem-1'));
    expect(state.reminders['rem-1']).toBeUndefined();
    expect(state.events['rem-1']).toBeUndefined();
  });

  it('addReminderEvent adds event to correct reminder', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    expect(state.events['rem-1']).toHaveLength(1);
    expect(state.events['rem-1']![0]!.status).toBe('pending');
  });

  it('addReminderEvent does not add duplicate events', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    expect(state.events['rem-1']).toHaveLength(1);
  });

  it('markTaken updates event status and sets takenAt', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(state, markTaken({ reminderId: 'rem-1', eventId: 'evt-1' }));
    expect(state.events['rem-1']![0]!.status).toBe('taken');
    expect(state.events['rem-1']![0]!.takenAt).toBeTruthy();
  });

  it('markTaken clears active alert', () => {
    let state = remindersReducer(
      emptyState,
      openReminderAlert({ reminderId: 'rem-1', medicationId: 'med-1' })
    );
    expect(state.activeAlertReminderId).toBe('rem-1');
    state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = { ...state, activeAlertReminderId: 'rem-1', activeAlertMedicationId: 'med-1' };
    state = remindersReducer(state, markTaken({ reminderId: 'rem-1', eventId: 'evt-1' }));
    expect(state.activeAlertReminderId).toBeNull();
  });

  it('markMissed sets status to missed', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(state, markMissed({ reminderId: 'rem-1', eventId: 'evt-1' }));
    expect(state.events['rem-1']![0]!.status).toBe('missed');
  });

  it('skipReminder sets status to skipped', () => {
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(state, skipReminder({ reminderId: 'rem-1', eventId: 'evt-1' }));
    expect(state.events['rem-1']![0]!.status).toBe('skipped');
  });

  it('snoozeReminder increments snoozeCount and sets snoozedUntil', () => {
    const futureISO = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    let state = remindersReducer(emptyState, addReminder(mockReminder));
    state = remindersReducer(state, addReminderEvent(mockEvent));
    state = remindersReducer(
      state,
      snoozeReminder({ reminderId: 'rem-1', eventId: 'evt-1', snoozedUntil: futureISO })
    );
    expect(state.events['rem-1']![0]!.status).toBe('snoozed');
    expect(state.events['rem-1']![0]!.snoozeCount).toBe(1);
    expect(state.events['rem-1']![0]!.snoozedUntil).toBe(futureISO);
  });

  it('openReminderAlert sets active alert IDs', () => {
    const state = remindersReducer(
      emptyState,
      openReminderAlert({ reminderId: 'rem-1', medicationId: 'med-1' })
    );
    expect(state.activeAlertReminderId).toBe('rem-1');
    expect(state.activeAlertMedicationId).toBe('med-1');
  });

  it('closeReminderAlert clears active alert IDs', () => {
    let state = remindersReducer(
      emptyState,
      openReminderAlert({ reminderId: 'rem-1', medicationId: 'med-1' })
    );
    state = remindersReducer(state, closeReminderAlert());
    expect(state.activeAlertReminderId).toBeNull();
    expect(state.activeAlertMedicationId).toBeNull();
  });
});
