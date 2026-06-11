import { AlertEvent, FamilyMember } from '../types';

export interface IAlertProvider {
  sendAlert(event: AlertEvent, member: FamilyMember): Promise<boolean>;
  getProviderName(): AlertChannel;
}

// Re-export for convenience
type AlertChannel = AlertEvent['channel'];

export class LocalAlertProvider implements IAlertProvider {
  getProviderName(): AlertChannel {
    return 'local';
  }

  async sendAlert(event: AlertEvent, member: FamilyMember): Promise<boolean> {
    // MVP: log and record. Future: TwilioSmsProvider, SendGridEmailProvider, etc.
    if (__DEV__) {
      console.log(
        `[LocalAlert] Would notify ${member.name} (${member.relationship}) via ${event.channel}`,
        `\n  Urgency: ${event.urgency}`,
        `\n  Message: ${event.message}`,
        `\n  Minutes past due: ${event.minutesPastDue}`
      );
    }
    return true;
  }
}

// Future providers implement IAlertProvider:
// export class TwilioSmsProvider implements IAlertProvider { ... }
// export class SendGridEmailProvider implements IAlertProvider { ... }
// export class WhatsAppProvider implements IAlertProvider { ... }

export class AlertService {
  private providers: IAlertProvider[] = [];

  registerProvider(provider: IAlertProvider): void {
    this.providers.push(provider);
  }

  removeProvider(name: AlertChannel): void {
    this.providers = this.providers.filter((p) => p.getProviderName() !== name);
  }

  async sendEscalation(event: AlertEvent, members: FamilyMember[]): Promise<void> {
    const recipients = members.filter((m) => m.receiveAlerts);
    const primaryFirst = [...recipients].sort((a, b) => (a.isPrimary ? -1 : 1));

    for (const member of primaryFirst) {
      const matchingProviders = this.providers.filter((p) =>
        member.alertChannels.includes(p.getProviderName())
      );

      for (const provider of matchingProviders) {
        try {
          const delivered = await provider.sendAlert(event, member);
          if (delivered) break;
        } catch (err) {
          if (__DEV__) console.error(`[AlertService] Provider ${provider.getProviderName()} failed:`, err);
        }
      }
    }
  }
}

export const alertService = new AlertService();
alertService.registerProvider(new LocalAlertProvider());
