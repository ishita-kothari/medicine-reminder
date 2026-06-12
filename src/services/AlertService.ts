/**
 * AlertService.ts
 *
 * WHY: Sending caregiver alerts is a critical safety feature. The alert
 * delivery mechanism (SMS, phone call, push notification) should be
 * swappable without changing the escalation logic. This is achieved by
 * the IAlertProvider interface — new providers (Twilio, WhatsApp, email)
 * are plugged in by implementing the interface and calling
 * alertService.registerProvider(...).
 *
 * HOW MISSED-DOSE ALERTS WORK (mobile-only, no backend required):
 *   1. BackgroundTask detects an unconfirmed dose past the escalation threshold
 *   2. It creates an AlertEvent and stores it in AsyncStorage
 *   3. When the app opens (or is in foreground), NotificationHandler flushes
 *      the queue and calls alertService.sendEscalation(...)
 *   4. SMSAlertProvider opens the native SMS composer with a pre-filled message
 *   5. PhoneCallProvider opens the dialler for critical (60-min+) escalations
 *
 * NOTE: Mobile apps cannot send SMS silently without a backend (Twilio etc).
 * The current implementation opens the native SMS/phone app which requires
 * one tap from the user. A production v2 would add a Twilio REST provider.
 */
import { Linking, Alert } from 'react-native';
import { AlertEvent, FamilyMember } from '../types';
import { DEFAULT_EMERGENCY_CONTACT } from '../store/slices/userSlice';

// ─── Provider interface ───────────────────────────────────────────────────────

type AlertChannel = AlertEvent['channel'];

export interface IAlertProvider {
  /** Attempt to deliver the alert. Returns true if delivery was initiated. */
  sendAlert(event: AlertEvent, member: FamilyMember, emergencyContact: string): Promise<boolean>;
  getProviderName(): AlertChannel;
}

// ─── SMS Provider ─────────────────────────────────────────────────────────────

/**
 * SMSAlertProvider
 * Opens the native SMS composer with a pre-filled message to the caregiver.
 * Requires one user tap to send — this is a platform limitation on mobile.
 * Replace with TwilioSmsProvider for fully automatic delivery.
 */
export class SMSAlertProvider implements IAlertProvider {
  getProviderName(): AlertChannel { return 'sms'; }

  async sendAlert(event: AlertEvent, member: FamilyMember, emergencyContact: string): Promise<boolean> {
    const phone = member.phone || emergencyContact || DEFAULT_EMERGENCY_CONTACT;
    const urgencyLabel = { low: '⚠️', medium: '⚠️⚠️', high: '🚨', critical: '🆘' }[event.urgency] ?? '⚠️';
    const body = encodeURIComponent(
      `${urgencyLabel} SeniorCare Alert: ${member.name ? `Your patient` : 'Someone you care for'} has missed their ${event.medicationName} dose scheduled ${event.minutesPastDue} minutes ago. Please check on them. — SeniorCare Companion App`
    );
    const url = `sms:${phone}?body=${body}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  }
}

// ─── Phone Call Provider ──────────────────────────────────────────────────────

/**
 * PhoneCallProvider
 * Opens the dialler for critical escalations (60+ min missed).
 * Used as a last resort when the caregiver has not responded.
 */
export class PhoneCallProvider implements IAlertProvider {
  getProviderName(): AlertChannel { return 'push'; }

  async sendAlert(event: AlertEvent, member: FamilyMember, emergencyContact: string): Promise<boolean> {
    if (event.urgency !== 'critical') return false;
    const phone = member.phone || emergencyContact || DEFAULT_EMERGENCY_CONTACT;
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  }
}

// ─── Local (in-app) Provider ──────────────────────────────────────────────────

/**
 * LocalAlertProvider
 * Logs the alert to the console and stores it in the Redux alert queue.
 * Always active — serves as the audit trail regardless of other providers.
 */
export class LocalAlertProvider implements IAlertProvider {
  getProviderName(): AlertChannel { return 'local'; }

  async sendAlert(event: AlertEvent, member: FamilyMember): Promise<boolean> {
    if (__DEV__) {
      console.log(
        `[LocalAlert] ${event.urgency.toUpperCase()} — ${member.name} (${member.relationship})\n` +
        `  Medication: ${event.medicationName}\n` +
        `  Minutes past due: ${event.minutesPastDue}\n` +
        `  Message: ${event.message}`
      );
    }
    return true;
  }
}

// ─── AlertService orchestrator ────────────────────────────────────────────────

/**
 * AlertService
 *
 * Manages a list of IAlertProvider implementations and fans out alert
 * events to all matching providers. Primary caregivers are contacted first.
 *
 * Usage:
 *   alertService.registerProvider(new SMSAlertProvider());
 *   await alertService.sendEscalation(event, familyMembers, emergencyContact);
 */
export class AlertService {
  private providers: IAlertProvider[] = [];

  registerProvider(provider: IAlertProvider): void {
    this.providers.push(provider);
  }

  removeProvider(name: AlertChannel): void {
    this.providers = this.providers.filter((p) => p.getProviderName() !== name);
  }

  /**
   * Send the escalation event to all configured providers for each
   * family member who has opted into alerts.
   *
   * @param event      The AlertEvent with urgency, medication info, timing
   * @param members    All family members from Redux state
   * @param emergencyContact  Fallback phone number from user profile
   */
  async sendEscalation(
    event: AlertEvent,
    members: FamilyMember[],
    emergencyContact: string
  ): Promise<void> {
    const recipients = members
      .filter((m) => m.receiveAlerts)
      .sort((a, b) => (a.isPrimary ? -1 : 1));

    // If no family members configured, fall back to the emergency contact
    if (recipients.length === 0 && emergencyContact) {
      const fallbackMember: FamilyMember = {
        id: 'emergency',
        name: 'Emergency Contact',
        relationship: 'Emergency',
        phone: emergencyContact,
        email: '',
        isPrimary: true,
        receiveAlerts: true,
        alertChannels: ['sms'],
        createdAt: new Date().toISOString(),
      };
      recipients.push(fallbackMember);
    }

    for (const member of recipients) {
      for (const provider of this.providers) {
        try {
          await provider.sendAlert(event, member, emergencyContact);
        } catch (err) {
          if (__DEV__) {
            console.error(`[AlertService] ${provider.getProviderName()} failed:`, err);
          }
        }
      }
    }
  }
}

// ─── Singleton instance ───────────────────────────────────────────────────────
export const alertService = new AlertService();
alertService.registerProvider(new LocalAlertProvider());
alertService.registerProvider(new SMSAlertProvider());
// PhoneCallProvider registered only for critical escalations — registered in App.tsx
