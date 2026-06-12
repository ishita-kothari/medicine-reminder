/**
 * ResendEmailProvider.ts
 *
 * WHY: SMS is not always the right channel — some caregivers prefer email,
 * especially when caring for multiple patients. Email also provides a written
 * record that SMS lacks. Resend was chosen over SendGrid because:
 *   • Free tier: 3,000 emails/month (vs SendGrid's 100/day on free)
 *   • Clean REST API
 *   • Excellent deliverability for transactional email
 *   • No mandatory unsubscribe links for transactional mail
 *
 * HOW: Same proxy pattern as TwilioSmsProvider — the app calls
 * api/send-email.js on the Vercel backend, which holds the Resend API key.
 *
 * SETUP:
 *   1. Create account at resend.com
 *   2. Verify your sending domain (or use their test domain for dev)
 *   3. Copy API key to Vercel env vars
 *   4. In app: Settings → Alert Settings → toggle Email alerts ON
 */
import { IAlertProvider } from '../AlertService';
import { AlertEvent, FamilyMember } from '../../types';

export class ResendEmailProvider implements IAlertProvider {
  private backendUrl: string;
  private patientName: string;

  constructor(backendUrl: string, patientName: string) {
    this.backendUrl = backendUrl.replace(/\/$/, '');
    this.patientName = patientName;
  }

  getProviderName() { return 'email' as const; }

  async sendAlert(
    event: AlertEvent,
    member: FamilyMember,
    _emergencyContact: string
  ): Promise<boolean> {
    if (!member.email || !this.backendUrl) return false;

    const urgencyLabel = {
      low: 'Reminder',
      medium: 'Alert',
      high: 'Urgent Alert',
      critical: 'CRITICAL Alert',
    }[event.urgency] ?? 'Alert';

    try {
      const response = await fetch(`${this.backendUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: member.email,
          subject: `SeniorCare ${urgencyLabel}: ${event.medicationName} missed`,
          patientName: this.patientName,
          medicationName: event.medicationName,
          minutesPastDue: event.minutesPastDue,
          urgency: event.urgency,
          message: event.message,
        }),
      });

      const data = await response.json();

      if (__DEV__) {
        console.log('[ResendEmailProvider] response:', data);
      }

      return data.success === true;
    } catch (err) {
      if (__DEV__) {
        console.error('[ResendEmailProvider] request failed:', err);
      }
      return false;
    }
  }
}
