import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FamilyMember, AlertEvent, FamilyState } from '../../types';
import { nowISO } from '../../utils/dateHelpers';
import { ALERT_HISTORY_MAX_ITEMS } from '../../constants/alertTiming';

const initialState: FamilyState = {
  members: {},
  order: [],
  alertQueue: [],
  alertHistory: [],
};

const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    addFamilyMember(state, action: PayloadAction<Omit<FamilyMember, 'createdAt'>>) {
      const member: FamilyMember = {
        ...action.payload,
        createdAt: nowISO(),
      };
      state.members[member.id] = member;
      state.order.push(member.id);
    },
    updateFamilyMember(state, action: PayloadAction<Partial<FamilyMember> & { id: string }>) {
      const existing = state.members[action.payload.id];
      if (existing) {
        state.members[action.payload.id] = { ...existing, ...action.payload };
      }
    },
    deleteFamilyMember(state, action: PayloadAction<string>) {
      delete state.members[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
    },
    addAlertEvent(state, action: PayloadAction<AlertEvent>) {
      state.alertQueue.push(action.payload);
    },
    markAlertDelivered(state, action: PayloadAction<string>) {
      const event = state.alertQueue.find((e) => e.id === action.payload);
      if (event) {
        event.delivered = true;
        event.deliveredAt = nowISO();
        state.alertHistory.push(event);
        state.alertQueue = state.alertQueue.filter((e) => e.id !== action.payload);
        if (state.alertHistory.length > ALERT_HISTORY_MAX_ITEMS) {
          state.alertHistory = state.alertHistory.slice(-ALERT_HISTORY_MAX_ITEMS);
        }
      }
    },
    clearAlertQueue(state) {
      state.alertHistory.push(...state.alertQueue);
      state.alertQueue = [];
      if (state.alertHistory.length > ALERT_HISTORY_MAX_ITEMS) {
        state.alertHistory = state.alertHistory.slice(-ALERT_HISTORY_MAX_ITEMS);
      }
    },
    flushQueueToHistory(state) {
      state.alertHistory = [...state.alertHistory, ...state.alertQueue];
      state.alertQueue = [];
    },
  },
});

export const {
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  addAlertEvent,
  markAlertDelivered,
  clearAlertQueue,
  flushQueueToHistory,
} = familySlice.actions;

export default familySlice.reducer;
