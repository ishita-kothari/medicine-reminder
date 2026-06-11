import { notificationService } from '../../src/services/NotificationService';
import * as Notifications from 'expo-notifications';
import { Reminder, Medication } from '../../src/types';

const mockReminder: Reminder = {
  id: 'rem-1',
  medicationId: 'med-1',
  scheduledTime: '08:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  isActive: true,
  voiceEnabled: false,
  vibrationEnabled: true,
  notifyFamilyIfMissed: true,
  notificationIds: [],
  snoozeMinutes: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMedication: Medication = {
  id: 'med-1',
  name: 'Metformin',
  dosage: '500',
  unit: 'mg',
  instructions: 'Take with food',
  color: '#45B7D1',
  colorLabel: 'Blue',
  shape: 'round',
  pillCount: 30,
  refillAt: 7,
  notes: '',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

jest.mock('expo-notifications');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('mock-id');
  });

  it('scheduleReminder returns notification IDs', async () => {
    const ids = await notificationService.scheduleReminder(mockReminder, mockMedication);
    expect(ids.length).toBeGreaterThan(0);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('scheduleReminder notification content includes medication name', async () => {
    await notificationService.scheduleReminder(mockReminder, mockMedication);
    const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(callArgs.content.title).toContain('Metformin');
    expect(callArgs.content.data.reminderId).toBe('rem-1');
    expect(callArgs.content.data.medicationId).toBe('med-1');
  });

  it('scheduleReminder schedules one notification per day of week', async () => {
    const ids = await notificationService.scheduleReminder(mockReminder, mockMedication);
    expect(ids).toHaveLength(7);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
  });

  it('scheduleReminder returns empty array when permission denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const ids = await notificationService.scheduleReminder(mockReminder, mockMedication);
    expect(ids).toHaveLength(0);
  });

  it('cancelReminder calls cancel for each notification ID', async () => {
    await notificationService.cancelReminder(['id-1', 'id-2', 'id-3']);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('snooze schedules a new notification and cancels old ones', async () => {
    const reminderWithIds = { ...mockReminder, notificationIds: ['old-id-1'] };
    const newIds = await notificationService.snooze(reminderWithIds, mockMedication, 10);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id-1');
    expect(newIds).toHaveLength(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
