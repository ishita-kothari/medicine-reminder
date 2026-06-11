import familyReducer, {
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  addAlertEvent,
  markAlertDelivered,
  clearAlertQueue,
} from '../../src/store/slices/familySlice';
import { FamilyState, FamilyMember, AlertEvent } from '../../src/types';

const emptyState: FamilyState = {
  members: {},
  order: [],
  alertQueue: [],
  alertHistory: [],
};

const mockMember: Omit<FamilyMember, 'createdAt'> = {
  id: 'fam-1',
  name: 'Alice Smith',
  relationship: 'Daughter',
  phone: '+15555555555',
  email: 'alice@example.com',
  isPrimary: true,
  receiveAlerts: true,
  alertChannels: ['local'],
};

const mockAlert: AlertEvent = {
  id: 'alert-1',
  familyMemberId: 'fam-1',
  reminderId: 'rem-1',
  medicationId: 'med-1',
  medicationName: 'Metformin',
  scheduledAt: new Date().toISOString(),
  triggeredAt: new Date().toISOString(),
  urgency: 'medium',
  minutesPastDue: 10,
  channel: 'local',
  delivered: false,
  deliveredAt: null,
  message: 'Medication not taken yet',
};

describe('familySlice', () => {
  it('addFamilyMember adds member with createdAt', () => {
    const state = familyReducer(emptyState, addFamilyMember(mockMember));
    expect(state.members['fam-1']).toBeDefined();
    expect(state.members['fam-1']!.name).toBe('Alice Smith');
    expect(state.members['fam-1']!.createdAt).toBeTruthy();
    expect(state.order).toContain('fam-1');
  });

  it('updateFamilyMember updates existing member', () => {
    let state = familyReducer(emptyState, addFamilyMember(mockMember));
    state = familyReducer(state, updateFamilyMember({ id: 'fam-1', phone: '+15559999999' }));
    expect(state.members['fam-1']!.phone).toBe('+15559999999');
    expect(state.members['fam-1']!.name).toBe('Alice Smith');
  });

  it('deleteFamilyMember removes member and from order', () => {
    let state = familyReducer(emptyState, addFamilyMember(mockMember));
    state = familyReducer(state, deleteFamilyMember('fam-1'));
    expect(state.members['fam-1']).toBeUndefined();
    expect(state.order).not.toContain('fam-1');
  });

  it('addAlertEvent adds to alertQueue', () => {
    const state = familyReducer(emptyState, addAlertEvent(mockAlert));
    expect(state.alertQueue).toHaveLength(1);
    expect(state.alertQueue[0]!.id).toBe('alert-1');
    expect(state.alertHistory).toHaveLength(0);
  });

  it('markAlertDelivered moves event from queue to history', () => {
    let state = familyReducer(emptyState, addAlertEvent(mockAlert));
    state = familyReducer(state, markAlertDelivered('alert-1'));
    expect(state.alertQueue).toHaveLength(0);
    expect(state.alertHistory).toHaveLength(1);
    expect(state.alertHistory[0]!.delivered).toBe(true);
    expect(state.alertHistory[0]!.deliveredAt).toBeTruthy();
  });

  it('clearAlertQueue moves all queue events to history', () => {
    let state = familyReducer(emptyState, addAlertEvent(mockAlert));
    state = familyReducer(state, addAlertEvent({ ...mockAlert, id: 'alert-2' }));
    state = familyReducer(state, clearAlertQueue());
    expect(state.alertQueue).toHaveLength(0);
    expect(state.alertHistory).toHaveLength(2);
  });
});
