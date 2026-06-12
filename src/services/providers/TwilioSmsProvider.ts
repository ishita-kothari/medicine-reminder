/**
 * TwilioSmsProvider.ts
 *
 * WHY: The native SMS approach (Linking.openURL 'sms:...') requires the
 * user to manually tap Send. For a caregiver alert app this is unacceptable —
 * a critically missed dose should trigger an automatic SMS without any user
 * action on the patient's device.
 *
 * HOW: The provider calls your deployed Vercel backend (api/send-sms.js)
 * which holds Twilio credentials server-side. The app never sees the
 * AccountSid or AuthToken.
 *
 * SETUP:
 *   1. Deploy the backend: push to GitHub → import at vercel.com/new
 *   2. Add Twilio env vars in Vercel dashboard (see .env.example)
 *   3. In the app: Settings → Alert Settings → paste your Vercel URL
 *   4. Toggle "Automatic SMS alerts" ON
 *
 * FALLBACK: If the backend URL is not configured or the request fails,
 * the provider returns false and the native SMSAlertProvider in
 * AlertService.ts opens the SMS composer as a fallback.
 */
import { IAlertProvider } from '../AlertService';
import { AlertEvent, FamilyMember } from '../../types';

export class TwilioSmsProvider implements IAlertProvider {
  private backendUrl: string;

  constructor(backendUrl: string) {
    // Strip trailing slash
    this.backendUrl = backendUrl.replace(/\/$/, '');
  }

  getProviderName() { return 'sms' as const; }

  async sendAlert(
    event: AlertEvent,
    member: FamilyMember,
    emergencyContact: string
  ): Promise<boolean> {
    const phone = member.phone || emergencyContact;
    if (!phone || !this.backendUrl) return false;

    const urgencyPrefix = {
      low: '💊',
      medium: '⚠️',
      high: '🚨',
      critical: '🆘',
    }[event.urgency] ?? '⚠️';

    const message =
      `${urgencyPrefix} SeniorCare Alert: ${event.medicationName} dose was not confirmed ` +
      `${event.minutesPastDue} minutes ago. Please check on ${member.name ? 'your patient' : 'them'} immediately.`;

    try {
      const response = await fetch(`${this.backendUrl}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message }),
      });

      const data = await response.json();

      if (__DEV__) {
        console.log('[TwilioSmsProvider] response:', data);
      }

      return data.success === true;
    } catch (err) {
      if (__DEV__) {
        console.error('[TwilioSmsProvider] request failed:', err);
      }
      return false;
    }
  }
}
