import { AlertService, LocalAlertProvider, IAlertProvider } from '../../src/services/AlertService';
import { AlertEvent, FamilyMember } from '../../src/types';

const mockAlert: AlertEvent = {
  id: 'alert-1',
  familyMemberId: 'fam-1',
  reminderId: 'rem-1',
  medicationId: 'med-1',
  medicationName: 'Metformin',
  scheduledAt: new Date().toISOString(),
  triggeredAt: new Date().toISOString(),
  urgency: 'high',
  minutesPastDue: 30,
  channel: 'local',
  delivered: false,
  deliveredAt: null,
  message: 'Medication missed — caregiver notified',
};

const mockMember: FamilyMember = {
  id: 'fam-1',
  name: 'Alice',
  relationship: 'Daughter',
  phone: '+15555555555',
  email: 'alice@example.com',
  isPrimary: true,
  receiveAlerts: true,
  alertChannels: ['local'],
  createdAt: new Date().toISOString(),
};

describe('AlertService', () => {
  it('registerProvider adds provider', async () => {
    const service = new AlertService();
    const mockProvider: IAlertProvider = {
      sendAlert: jest.fn().mockResolvedValue(true),
      getProviderName: () => 'local',
    };
    service.registerProvider(mockProvider);
    await service.sendEscalation(mockAlert, [mockMember]);
    expect(mockProvider.sendAlert).toHaveBeenCalledWith(mockAlert, mockMember);
  });

  it('sendEscalation only sends to members with receiveAlerts=true', async () => {
    const service = new AlertService();
    const mockProvider: IAlertProvider = {
      sendAlert: jest.fn().mockResolvedValue(true),
      getProviderName: () => 'local',
    };
    service.registerProvider(mockProvider);
    const memberWithAlertsOff: FamilyMember = { ...mockMember, id: 'fam-2', receiveAlerts: false };
    await service.sendEscalation(mockAlert, [memberWithAlertsOff]);
    expect(mockProvider.sendAlert).not.toHaveBeenCalled();
  });

  it('LocalAlertProvider returns true', async () => {
    const provider = new LocalAlertProvider();
    const result = await provider.sendAlert(mockAlert, mockMember);
    expect(result).toBe(true);
  });

  it('LocalAlertProvider channel name is local', () => {
    const provider = new LocalAlertProvider();
    expect(provider.getProviderName()).toBe('local');
  });

  it('handles provider failure gracefully without throwing', async () => {
    const service = new AlertService();
    const failingProvider: IAlertProvider = {
      sendAlert: jest.fn().mockRejectedValue(new Error('network error')),
      getProviderName: () => 'local',
    };
    service.registerProvider(failingProvider);
    await expect(service.sendEscalation(mockAlert, [mockMember])).resolves.not.toThrow();
  });
});
