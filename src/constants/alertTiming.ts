import type { AlertUrgency } from '../types';

export interface EscalationTier {
  minutesPastDue: number;
  urgency: AlertUrgency;
  message: string;
}

export const ESCALATION_TIERS: EscalationTier[] = [
  {
    minutesPastDue: 0,
    urgency: 'low',
    message: 'Medication reminder sent',
  },
  {
    minutesPastDue: 10,
    urgency: 'medium',
    message: 'Medication not taken yet — gentle reminder sent',
  },
  {
    minutesPastDue: 20,
    urgency: 'medium',
    message: 'Second reminder — medication still not confirmed',
  },
  {
    minutesPastDue: 30,
    urgency: 'high',
    message: 'Medication missed — caregiver has been notified',
  },
  {
    minutesPastDue: 60,
    urgency: 'critical',
    message: 'URGENT: Medication missed for over 1 hour — please check in',
  },
];

export const SNOOZE_OPTIONS: ReadonlyArray<5 | 10 | 15> = [5, 10, 15];

export const BACKGROUND_TASK_NAME = 'MISSED_DOSE_ESCALATION';

export const ALERT_HISTORY_MAX_ITEMS = 200;

export const MISSED_THRESHOLD_MINUTES = 120;
