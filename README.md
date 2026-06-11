# SeniorCare Companion

A production-ready medication reminder app for elderly users, caregivers, and anyone who needs reliable, accessible reminders.

## Features

- **Medication Management** — Add, edit, and delete medications with visual identification (color + shape + label)
- **Smart Reminders** — Flexible scheduling by day-of-week, voice-guided alerts, vibration, snooze (5/10/15 min)
- **Full-Screen Alert Modal** — Voice reads medication details on reminder; TAKEN / SNOOZE / SKIP actions
- **Family Alerts** — Local escalation queue (0→10→20→30→60 min) with provider-agnostic `AlertService`
- **Accessibility-first** — High contrast mode, large text, voice guidance, 60px minimum touch targets
- **Offline-first** — All data persisted via Redux Persist + AsyncStorage; works with no internet
- **AdMob Architecture** — Placement-safe ad wrapper; ads blocked on all critical screens

## Quick Start

### Prerequisites

- Node.js 20 LTS
- iOS Simulator / Android Emulator or physical device with Expo Go

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Expo
npx expo start
```

Scan the QR code with **Expo Go** on your device, or press `i` for iOS simulator / `a` for Android.

### Run Tests

```bash
npm test           # run once
npm run test:watch # watch mode
npm run test:coverage
```

## Architecture

### Feature-Based Folder Structure

```
src/
  features/
    dashboard/       Home screen with countdown timer and adherence score
    medications/     CRUD for medications
    reminders/       Reminder scheduling and management
    family/          Caregiver contacts and alert history
    notifications/   NotificationHandler + background escalation task
    settings/        Accessibility toggles, dark mode
    onboarding/      First-launch profile + accessibility setup
  store/             Redux Toolkit + Redux Persist
  services/          NotificationService, AlertService (provider-agnostic)
  hooks/             useAccessibility (single source for theming + voice + haptics)
  components/        BigButton, MedicationCard, ReminderAlertModal, AdBanner, etc.
  theme/             3 colour palettes (light / dark / high-contrast)
  types/             All TypeScript interfaces
  constants/         Escalation tiers, snooze options, ad placement rules
  utils/             Date helpers, ID generator
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| Normalized Redux state (`Record<id>` + `order[]`) | O(1) cross-feature lookups |
| `useAccessibility` single hook | All 3 palettes + font scale + voice + haptics in one place |
| `IAlertProvider` interface | Plug in Twilio/SendGrid/WhatsApp without changing escalation logic |
| `AdBanner` enforces its own blocklist | Defense-in-depth — can't accidentally show ad on critical screens |
| Background task reads AsyncStorage directly | Redux not available in TaskManager context |

## Adding a Real Alert Provider (e.g. Twilio SMS)

```typescript
// src/services/TwilioSmsProvider.ts
import { IAlertProvider } from './AlertService';
import { AlertEvent, FamilyMember } from '../types';

export class TwilioSmsProvider implements IAlertProvider {
  constructor(private accountSid: string, private authToken: string, private fromNumber: string) {}

  getProviderName() { return 'sms' as const; }

  async sendAlert(event: AlertEvent, member: FamilyMember): Promise<boolean> {
    // Call Twilio REST API
    // ...
    return true;
  }
}

// In App.tsx or a bootstrap file:
alertService.registerProvider(new TwilioSmsProvider(SID, TOKEN, FROM));
```

## Enabling Real AdMob

1. Replace `react-native-admob-next` with `react-native-google-mobile-ads`
2. Update `AdBanner.tsx` inner content to use the `BannerAd` component
3. Set your real ad unit IDs in environment variables

## Accessibility

Every interactive element has:
- `accessible={true}`
- `accessibilityRole` (button, switch, checkbox, header, timer…)
- `accessibilityLabel` (non-empty, descriptive sentence)
- `accessibilityHint` where action is non-obvious
- Minimum touch target: 60×60px
- Minimum font size: 18px

Run the accessibility audit:
```bash
npx jest tests/accessibility/
```

## License

MIT
