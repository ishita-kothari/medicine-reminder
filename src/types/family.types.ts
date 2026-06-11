export type AlertUrgency = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'local' | 'sms' | 'email' | 'push' | 'whatsapp';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  receiveAlerts: boolean;
  alertChannels: AlertChannel[];
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  familyMemberId: string;
  reminderId: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string;
  triggeredAt: string;
  urgency: AlertUrgency;
  minutesPastDue: number;
  channel: AlertChannel;
  delivered: boolean;
  deliveredAt: string | null;
  message: string;
}

export interface FamilyState {
  members: Record<string, FamilyMember>;
  order: string[];
  alertQueue: AlertEvent[];
  alertHistory: AlertEvent[];
}
