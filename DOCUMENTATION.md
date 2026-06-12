# SeniorCare Companion — Complete Technical Documentation

> Every file, component, service, hook, and slice explained: **what** it is, **why** it was built this way, and **how** it works internally.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Layer — Redux Slices](#data-layer--redux-slices)
3. [Services](#services)
4. [Navigation](#navigation)
5. [Hooks](#hooks)
6. [Reusable Components](#reusable-components)
7. [Feature Screens](#feature-screens)
8. [Notifications & Background Tasks](#notifications--background-tasks)
9. [Theme System](#theme-system)
10. [Types](#types)
11. [Utilities](#utilities)
12. [Constants](#constants)
13. [Missed Medicine Flow — End to End](#missed-medicine-flow--end-to-end)
14. [Voice Reminder Flow — End to End](#voice-reminder-flow--end-to-end)
15. [Family Alert Flow — End to End](#family-alert-flow--end-to-end)
16. [Accessibility Model](#accessibility-model)
17. [Data Persistence Model](#data-persistence-model)

---

## Architecture Overview

```
App.tsx (root)
├── GestureHandlerRootView
├── Provider (Redux)
│   └── PersistGate (Redux Persist → AsyncStorage)
│       └── AppContent
│           ├── PaperProvider (theme)
│           ├── SafeAreaProvider
│           ├── NavigationContainer
│           │   ├── NotificationHandler (non-rendering, side effects)
│           │   └── RootNavigator
│           │       ├── OnboardingScreen (first launch only)
│           │       └── BottomTabNavigator
│           │           ├── HomeTab (Dashboard)
│           │           ├── MedicinesTab (Stack)
│           │           ├── FamilyTab (Stack)
│           │           ├── WellnessTab (Stack)
│           │           └── SettingsTab (Stack)
│           └── AchievementCelebration (global overlay)
```

### Why this structure?

- **Feature-based folders** (`src/features/medications/`) keep all related code (screens, hooks, components) together. A new developer can find everything about medications without hunting across the project.
- **Offline-first**: Redux Persist serialises all state to AsyncStorage. The app works with zero internet connection — notifications, dose tracking, adherence scores all persist across app restarts.
- **Provider order matters**: GestureHandlerRootView must be the outermost wrapper (Reanimated requirement). PersistGate ensures the persisted store is rehydrated before any UI renders (prevents stale data flashes).

---

## Data Layer — Redux Slices

### `userSlice.ts`

**What**: Stores the patient's profile — name, age, and emergency contact.

**Why**: Centralised identity allows the emergency contact to be used in SOS calls, family alert fallback, and the onboarding screen without prop-drilling. The `DEFAULT_EMERGENCY_CONTACT` constant (`+919428201825`) ensures a working SOS even when the user skips onboarding.

**How**: Simple RTK slice. `createProfile` is called once from OnboardingScreen. `updateProfile` is called from SettingsScreen. The emergency contact field falls back to `DEFAULT_EMERGENCY_CONTACT` if blank.

**State shape**:
```typescript
{
  id: string;             // UUID, generated on first launch
  name: string;           // Display name (e.g. "Margaret")
  age: number;            // Used for future health-context features
  emergencyContact: string; // Phone number for SOS + family fallback
  onboardingCompleted: boolean; // Gates the OnboardingScreen
  createdAt: string;      // ISO timestamp of profile creation
}
```

---

### `medicationsSlice.ts`

**What**: Stores the patient's medication list.

**Why**: Medications are referenced by ID from reminders and alert events. Normalised state (`Record<id, Medication>` + `order: string[]`) gives O(1) lookup when reminders need to display medication details, without scanning an array.

**How**: `addMedication` stamps `createdAt`/`updatedAt`. `updateMedication` merges partial updates and stamps `updatedAt`. `deleteMedication` removes from both `items` and `order`. The `medicineType` field (`tablet`, `capsule`, `liquid`, etc.) was added later — `medicationsSlice` defaults it to `'tablet'` for backward compatibility with persisted old data.

**State shape**:
```typescript
{
  items: Record<string, Medication>;
  order: string[]; // preserves insertion/display order
}
```

---

### `remindersSlice.ts`

**What**: Stores reminder schedules and their event history.

**Why**: This is the most complex slice because it manages two related concepts — the *schedule* (what time does this reminder fire?) and the *events* (did the user take it on Jan 15 at 08:00?). Separating them means the schedule can repeat indefinitely while events accumulate a finite history.

**State shape**:
```typescript
{
  reminders: Record<string, Reminder>;   // schedule config per medicine
  events: Record<string, ReminderEvent[]>; // keyed by reminderId
  activeAlertReminderId: string | null;  // drives ReminderAlertModal visibility
  activeAlertMedicationId: string | null;
  activeAlertTimeSlot: string | null;   // which HH:mm slot fired
}
```

**Key actions**:

| Action | Why it exists |
|---|---|
| `addReminder` | Creates a new reminder schedule with `scheduledTimes: string[]` |
| `markTaken` | Stamps `takenAt` and `status='taken'` on a specific event |
| `markMissed` | Sets `status='missed'` — triggered by escalation logic |
| `markTakenLate` | Corrects a `missed` event to `taken` — for "I forgot to tap but I did take it" |
| `snoozeReminder` | Sets `status='snoozed'`, increments `snoozeCount`, stores `snoozedUntil` |
| `autoMarkExpiredSnoozedMissed` | Scans all snoozed events; if `snoozedUntil < now`, marks missed |
| `migrateReminders` | Handles old persisted data that used single `scheduledTime` string |
| `openReminderAlert` | Sets the three `activeAlert*` fields to show the full-screen modal |

**Multiple daily times per medicine**: `Reminder.scheduledTimes` is an array (`['08:00', '20:00']`). `NotificationService` creates one OS notification per time slot per weekday, so two times × 7 days = 14 scheduled notifications per reminder.

---

### `familySlice.ts`

**What**: Stores caregiver contacts and the missed-dose alert queue.

**Why**: Family members and alert history live together because they are tightly coupled — every alert references a family member ID. The `alertQueue` holds events waiting to be delivered (app was in background); `alertHistory` is the permanent audit log.

**State shape**:
```typescript
{
  members: Record<string, FamilyMember>;
  order: string[];
  alertQueue: AlertEvent[];    // pending delivery
  alertHistory: AlertEvent[];  // delivered, max 200 entries
}
```

---

### `settingsSlice.ts`

**What**: Stores all accessibility and display preferences.

**Why**: Accessibility settings must be instantly reactive — toggling High Contrast should recolour the entire app without a restart. Storing in Redux means every component can subscribe via `useAccessibility` hook and re-render when settings change.

**Key flags**:
- `highContrast` — switches to black/white palette
- `largeText` — multiplies all font sizes by 1.3×
- `voiceGuidance` — enables `Speech.speak()` calls throughout the app
- `vibration` — controls `Haptics.impactAsync()` calls
- `reducedMotion` — disables Reanimated spring animations

---

### `wellnessSlice.ts`

**What**: Stores daily mood check-in entries.

**Why**: Mental and emotional wellbeing directly impacts medication adherence. Tracking mood allows caregivers to spot patterns (e.g. consistently "not great" before missed doses). Each entry is keyed by date string (`yyyy-MM-dd`) so there's at most one entry per day.

---

### `achievementsSlice.ts`

**What**: Tracks gamification badges and dose streaks.

**Why**: Positive reinforcement significantly improves medication adherence in elderly patients (documented in healthcare research). The badge system rewards consistency without any negative messaging — there are no "failure" messages, only "well done" and "keep going" encouragements.

**How**: `recordDoseTaken` increments `totalDosesTaken` and `currentStreak`. It checks thresholds and unlocks badges automatically. `newlyUnlocked` is a transient array — `AchievementCelebration` consumes it and dispatches `clearNewlyUnlocked` after showing the modal.

---

## Services

### `NotificationService.ts`

**What**: Wraps `expo-notifications` API for scheduling, cancelling, and snoozing medication reminders.

**Why**: All notification logic is centralised here so screens never touch the `expo-notifications` API directly. This makes it easy to mock in tests, change the trigger type, or swap the notification library entirely.

**How — background delivery**:
Notifications are scheduled as `CalendarTrigger` with `repeats: true`. The OS (iOS UserNotifications / Android AlarmManager) owns the schedule. Once `scheduleNotificationAsync` is called, the notification fires at the exact time even if the app is killed.

```
App closed → OS fires notification at scheduled time
→ user taps notification banner → OS relaunches app
→ NotificationHandler.addNotificationResponseReceivedListener fires
→ ReminderAlertModal opens
```

`rescheduleAll()` is called every time the app comes to foreground. It cross-checks the `notificationIds` stored in Redux against `getPendingNotificationRequestsAsync()`. Any missing IDs (dropped after phone restart or iOS memory pressure) are rescheduled.

**Multiple times per reminder**:
```
scheduledTimes = ['08:00', '20:00']
daysOfWeek = [0,1,2,3,4,5,6]  → 7 days
→ 2 times × 7 days = 14 OS CalendarTrigger notifications
All 14 IDs stored in reminder.notificationIds[]
```

---

### `AlertService.ts`

**What**: Manages caregiver notification delivery through pluggable providers.

**Why**: The delivery mechanism (SMS, phone, push, email) should be swappable. `IAlertProvider` is the contract; the orchestrator (`AlertService`) fans out to all registered providers without knowing how they work.

**Providers**:

| Provider | Channel | How it works |
|---|---|---|
| `LocalAlertProvider` | `local` | Logs to console, updates Redux audit trail |
| `SMSAlertProvider` | `sms` | `Linking.openURL('sms:+91...?body=...')` opens native SMS composer |
| `PhoneCallProvider` | `push` | `Linking.openURL('tel:...')` opens dialler for critical urgency |

**Fallback**: If no family members are configured, `sendEscalation` creates a synthetic member from `emergencyContact` (`+919428201825` default) and alerts them.

**Future providers** can be added without touching escalation logic:
```typescript
alertService.registerProvider(new TwilioSmsProvider({ accountSid, authToken }));
```

---

## Navigation

### `RootNavigator.tsx`
**Why**: Separates onboarding from the main app with a conditional stack. When `user.onboardingCompleted === false`, only `OnboardingScreen` is visible. After completing onboarding, the navigator swaps to `BottomTabNavigator`. This prevents non-onboarded users from accessing an unconfigured app.

### `BottomTabNavigator.tsx`
**Why**: Bottom tabs are the only navigation pattern used — no drawer, no hamburger menu. This is intentional for elderly accessibility: the tab bar is always visible, always in the same place, and has large touch targets (70px height + safe area inset).

**Tab order**: Home → Medicines → Family → Wellness → Settings. The most-used screen (Home) is first.

### `MedicationsStack.tsx`
Includes a special `isFirstReminder` flag on `AddReminder` — when navigated from `AddMedication`, the back button is hidden and the header title changes to "Set a Reminder", guiding the user through a natural setup flow.

---

## Hooks

### `useAccessibility.ts`

**What**: The single source of truth for accessibility state across the entire app.

**Why**: Without this hook, every component would need to individually subscribe to `settingsSlice` and derive colors, font scales, and speech functions. This hook centralises all of that.

**Returns**:
```typescript
{
  colors: ColorPalette;      // LightColors | DarkColors | HighContrastColors
  textScale: number;         // 1.0 (normal) or 1.3 (large text)
  speak: (text: string) => void; // Speech.speak() if voiceGuidance enabled
  haptic: (type) => void;    // Haptics.impactAsync() if vibration enabled
  highContrast: boolean;
  darkMode: boolean;
  largeText: boolean;
  voiceGuidance: boolean;
  vibration: boolean;
  reducedMotion: boolean;
}
```

**Pattern**: Every interactive component calls `const { colors, textScale, speak, haptic } = useAccessibility()` at the top. Color values, font sizes, and feedback come from this single hook — never hardcoded.

---

## Reusable Components

### `BigButton.tsx`

**What**: The standard button throughout the app.

**Why**: A custom component (instead of React Native Paper's Button) enforces the accessibility constraints: minimum height 60px, minimum width 60px, font size ≥ 18px, required `accessibilityRole="button"`. These cannot be accidentally overridden.

**Variants**: `primary` (green fill), `secondary` (outlined), `danger` (red fill), `warning` (amber fill), `ghost` (transparent, primary border).

**Sizes**: `normal` (60px height), `large` (80px height) — for the most important CTA on a screen.

---

### `TimePicker.tsx`

**What**: A native time picker wrapping `@react-native-community/datetimepicker`.

**Why**: A plain text input for HH:MM caused frequent user errors (typing `25:00`, forgetting the colon). The native picker eliminates all validation issues and is familiar to elderly users.

**How**:
- iOS: shows a spinner wheel inside a slide-up modal with Cancel/Done buttons
- Android: shows the system time dialog (MaterialTimePicker)

---

### `SnoozeSelector.tsx`

**What**: A segmented control for picking snooze duration (5 / 10 / 15 minutes).

**Why**: The previous implementation used three `BigButton` components in a row, which was low-contrast and easy to miss against a light background. The segmented control is a single connected element with a clear filled/unfilled contrast.

---

### `ReminderAlertModal.tsx`

**What**: Full-screen modal that appears when a medication reminder fires.

**Why full-screen?** For elderly users, a small bottom sheet or toast is easy to miss or accidentally dismiss. The full-screen modal demands attention without being dismissible by tapping outside.

**Voice announcement**: 500ms after the modal opens, `Speech.speak()` reads: *"Time to take [Medication], [Dosage]. Please press TAKEN when done."* The delay prevents the speech from overlapping with the slide animation.

**Snooze escalation logic**:
- First snooze: allowed, schedules a new one-shot notification, speaks "This is your last snooze"
- Second snooze: NOT allowed — immediately marks the dose as `missed` and closes the modal

**Background colour escalation**: `snoozeCount === 0` → dark green; `snoozeCount === 1` → amber warning; never reaches 2 (auto-missed).

---

### `AchievementCelebration.tsx`

**What**: An animated modal that appears when a badge is unlocked.

**Why Reanimated 4**: The first implementation used React Native's legacy `Animated` API, which Reanimated 4 intercepts and breaks — `Animated.parallel().start()` returned `undefined` causing a crash. Rewriting with `useSharedValue` + `useAnimatedStyle` + `withSpring` uses Reanimated's proper API and eliminates the bug.

**How**: `newlyUnlocked` array in achievementsSlice — the component shows the first badge, user taps "Awesome!", `clearNewlyUnlocked()` is dispatched. If multiple badges unlock simultaneously, they show one at a time.

---

### `AdherenceChart.tsx`

**What**: A native SVG bar chart showing 7-day taken/missed counts.

**Why react-native-svg instead of Victory Native**: Victory Native 41+ requires `@shopify/react-native-skia` which does not work in Expo Go without a development build. `react-native-svg` works in Expo Go and produces the same visual result for simple bar charts.

**How**: Each day is a stacked bar — green segment for taken, red for missed. Day labels are rendered as SVG Text nodes. The legend below uses plain View/Text for accessibility screen readers (SVG elements are not natively accessible).

---

### `AdBanner.tsx`

**What**: A placement-safe AdMob wrapper.

**Why**: The `AD_BLOCKED_SCREENS` constant inside the component itself enforces that ads can never appear on clinical screens (ReminderAlert, Onboarding, AccessibilitySettings, emergency flows). Defense-in-depth: even if a developer mistakenly adds `<AdBanner>` to a blocked screen, the component renders nothing and logs a warning.

**Current state**: Placeholder (dashed border). Replace the inner content with `BannerAd` from `react-native-google-mobile-ads` when going to production.

---

## Feature Screens

### `HomeScreen.tsx` (Dashboard)

**What**: The primary screen — the one seniors open most often.

**Design philosophy**: Everything the user needs for the *next action* is visible without scrolling: greeting, next medication, countdown, TAKE NOW, and SOS. The schedule and missed doses are below the fold.

**Countdown timer**: Uses `Date.now()` comparison (not a decrementing counter) so JS thread stalls don't cause drift. Announces at 5, 2, and 1 minutes via `speak()` to alert users who aren't looking at the screen.

**SOS button**: `Linking.openURL('tel:+919428201825')` opens the system phone dialler. A confirmation `Alert` first prevents accidental calls. The default number `+919428201825` is always shown even if the user hasn't set up a personal emergency contact.

**Missed medicine section**: Appears only when `status === 'missed'` events exist for today. Each row has a "Taken Late ✓" button that dispatches `markTakenLate` — corrects the record and advances the streak/achievement counter.

---

### `AddEditMedicationScreen.tsx`

**What**: Form to add or edit a medication.

**Key UX decisions**:
- **Medicine type** (tablet, capsule, drop…) is separate from **unit** (mg, ml…). Selecting a type auto-fills the most common unit (tablet → mg, drop → ml). This reduces form friction for elderly users.
- **Name autocomplete**: Filters 60 common medicine names as the user types (appears after 2 characters). Built with plain React state + `FlatList` — no external autocomplete library.
- **Post-save flow**: Adding a *new* medication navigates to `AddReminder` screen automatically (`isFirstReminder: true`). Editing goes back to the list.

---

### `AddEditReminderScreen.tsx`

**What**: Form to configure reminder times and options for one medication.

**Multiple times per day**: Users can add as many time slots as needed. Each slot gets its own `TimePicker`. The "Add another time" button suggests a slot 4 hours after the last one as a sensible default. At least one slot is required (validated before save).

**On save**: Calls `notificationService.scheduleReminder()` which creates one OS notification per (time × weekday) pair. All returned notification IDs are stored in `reminder.notificationIds[]` for later cancellation.

---

### `WellnessDashboardScreen.tsx`

**What**: Daily mood check-in (Good / Okay / Not Great) with 14-day history.

**Why this matters**: If a user selects "Not Great", an `AlertEvent` is dispatched to the family slice and caregivers are notified. This is the only non-medication trigger for caregiver alerts, recognising that emotional wellbeing is as important as physical medication.

**One check-in per day**: `lastCheckinDate` is compared to `todayDateString()`. If already checked in, the screen shows the saved mood instead of the picker buttons.

---

### `AchievementsScreen.tsx`

**What**: Badge gallery showing all 6 achievements and their unlock dates.

**Badge list**:
| Badge | Trigger |
|---|---|
| 🌟 First Dose | First `markTaken` dispatch |
| 🔥 7-Day Streak | `currentStreak >= 7` |
| 🏆 30-Day Streak | `currentStreak >= 30` |
| 💯 100 Doses | `totalDosesTaken >= 100` |
| ⭐ Perfect Week | Manual dispatch (future: auto-detect) |
| 🎖️ Perfect Month | Manual dispatch (future: auto-detect) |

---

## Notifications & Background Tasks

### `NotificationHandler.tsx`

**What**: Non-rendering component mounted at app root. Manages three side-effect channels.

**Channel 1 — Notification tap**:
When the user taps a notification banner (app in background/closed), the OS re-opens the app and `addNotificationResponseReceivedListener` fires. The handler creates a `ReminderEvent` in Redux and opens `ReminderAlertModal`.

**Channel 2 — Foreground notification received**:
When a notification fires while the app is open, `addNotificationReceivedListener` fires. If `reminder.voiceEnabled` is true AND `settings.voiceGuidance` is true, `Speech.speak()` announces the medication. This is the *foreground voice reminder*.

**Channel 3 — App state: background → active**:
Every time the app comes to the foreground, the handler:
1. Calls `autoMarkExpiredSnoozedMissed` — marks snoozed events whose `snoozedUntil < now` as missed
2. Calls `checkEscalations` — finds unconfirmed events past the escalation threshold, dispatches alerts
3. Calls `flushPendingAlerts` — processes the AsyncStorage queue from the background task
4. Calls `rescheduleAll` — restores any dropped OS notifications

---

### `backgroundTask.ts`

**What**: Expo background fetch task that checks for missed doses when the app is sleeping.

**Limitation**: iOS fires this at most every 15 minutes and only when OS conditions allow. It is supplementary — `NotificationHandler` on app resume is the primary detection point.

**How it avoids redux**:
Background tasks run in a separate process with no access to React context or Redux. This file reads the Redux state directly from AsyncStorage (where `redux-persist` serialised it) using `JSON.parse`.

**Output**: Appends `AlertEvent` records to `pending_alert_queue` in AsyncStorage. Also fires an immediate local notification to the user's device (visible even on the lock screen) with the missed-dose details.

---

## Theme System

### `src/theme/colors.ts`

Three complete colour palettes:

| Palette | Background | Text | Primary |
|---|---|---|---|
| `LightColors` | `#F8FAF9` | `#1A1A1A` | `#1A6B4A` (deep green) |
| `DarkColors` | `#121212` | `#F0F0F0` | `#4CAF82` (light green) |
| `HighContrastColors` | `#FFFFFF` | `#000000` | `#000000` |

High contrast mode uses pure black/white with pure red/green for status indicators. This passes WCAG AAA contrast ratio (≥ 7:1) for users with severe visual impairment.

### `src/theme/typography.ts`

Minimum font sizes enforced:
- `body`: 18px — smallest text shown to users
- `large`: 22px
- `heading`: 28px
- `huge`: 36px — countdown timer, key numbers

### `src/theme/spacing.ts`

- Minimum touch target: 60×60px (WCAG 2.5.5 enhanced)
- Normal button height: 60px
- Large button height: 80px (primary CTAs)
- Tab bar height: 60px + bottom safe area inset

---

## Types

### `reminder.types.ts`

**`Reminder`**: The schedule — repeats indefinitely.
- `scheduledTimes: string[]` — array of HH:mm slots. Multiple times support morning + evening doses in one reminder config.
- `notificationIds: string[]` — one OS notification ID per (time × weekday) combination.

**`ReminderEvent`**: One specific occurrence of a reminder.
- `scheduledTimeSlot: string` — which HH:mm slot triggered this event.
- `scheduledAt: string` — full ISO datetime of this occurrence.
- `status`: `pending` → `taken` | `missed` | `snoozed` | `skipped`
- `snoozeCount: number` — second snooze auto-marks as missed.

**`RemindersState`**: Includes `activeAlertTimeSlot` to track which of multiple daily doses triggered the modal.

---

### `family.types.ts`

**`AlertEvent.urgency`**: Four tiers:
- `low` (0 min past due) — initial reminder
- `medium` (10–20 min) — second/third reminder
- `high` (30 min) — caregiver notified via SMS
- `critical` (60 min) — urgent, phone call opened

---

## Utilities

### `dateHelpers.ts`

**`getNextSlot(scheduledTimes, daysOfWeek)`**: Returns the nearest upcoming `{timeSlot, date}` across all time slots. Used by HomeScreen to determine the countdown timer target and which medication to feature.

**`getNextOccurrenceForTime(time, days)`**: For a single HH:mm string, finds the next calendar occurrence (today if still in the future, tomorrow if past).

**`autoMarkExpiredSnoozedMissed`**: Redux reducer that scans all events; any `snoozed` event where `snoozedUntil < now` is automatically promoted to `missed`. Called on every app resume.

**`formatCountdown(seconds)`**: Produces `HH:MM:SS` string with zero-padded fields. Uses `tabular-nums` font variant to prevent layout shift as numbers change.

---

## Constants

### `alertTiming.ts`

```typescript
ESCALATION_TIERS = [
  { minutesPastDue: 0,  urgency: 'low',      message: 'Medication reminder sent' },
  { minutesPastDue: 10, urgency: 'medium',    message: 'Not taken yet — reminder sent' },
  { minutesPastDue: 20, urgency: 'medium',    message: 'Second reminder — not confirmed' },
  { minutesPastDue: 30, urgency: 'high',      message: 'Missed — caregiver notified' },
  { minutesPastDue: 60, urgency: 'critical',  message: 'URGENT: missed for 1 hour' },
]
```

### `adPlacementRules.ts`

Hard-coded lists of allowed/blocked screens for AdBanner. The component enforces these internally — adding `<AdBanner>` to a blocked screen renders nothing.

---

## Missed Medicine Flow — End to End

```
Reminder time arrives (08:00)
│
├── [App in foreground]
│   └── addNotificationReceivedListener fires
│       ├── If voiceEnabled → Speech.speak("Time to take...")
│       └── ReminderAlertModal opens automatically
│           ├── User presses TAKEN → markTaken() → event.status = 'taken'
│           ├── User presses SNOOZE (1st) → snoozeReminder() → status='snoozed', snoozeCount=1
│           │   └── New notification scheduled for +N minutes
│           │       └── If user ignores or snoozes again → markMissed() → status='missed'
│           └── User presses SKIP → skipReminder() → status='skipped'
│
├── [App in background]
│   └── OS notification banner appears
│       └── User taps banner → app opens → NotificationHandler fires
│           └── ReminderAlertModal opens (same flow as above)
│
└── [App closed or user ignores notification]
    └── backgroundTask fires (best-effort, every ~15 min)
    │   ├── Checks: minutesSince(event.scheduledAt) >= 30
    │   ├── Creates AlertEvent with urgency='high'
    │   ├── appendAlertToQueue() → AsyncStorage
    │   └── Fires immediate local notification: "⚠️ Missed Dose: Metformin"
    └── When app next opens:
        ├── autoMarkExpiredSnoozedMissed() → status='missed'
        ├── flushPendingAlerts() → reads AsyncStorage queue
        │   └── alertService.sendEscalation() → SMSAlertProvider
        │       └── Linking.openURL('sms:+91...?body=Missed dose alert...')
        └── HomeScreen Missed Medicines section shows the dose
            └── User can tap "Taken Late ✓" → markTakenLate() → status='taken'
```

---

## Voice Reminder Flow — End to End

```
User enables "Voice reminder" on a specific reminder
(reminder.voiceEnabled = true)

User enables "Voice Guidance" in Accessibility Settings
(settings.voiceGuidance = true)

Both flags must be true for voice to activate.

Reminder fires:
│
├── [App in foreground]
│   └── addNotificationReceivedListener fires in NotificationHandler
│       └── reminder.voiceEnabled && settings.voiceGuidance → true
│           └── setTimeout 300ms → Speech.speak(
│               "Time to take Metformin, 500 mg at 8:00 AM.
│                Please tap the reminder to confirm."
│             )
│
├── [ReminderAlertModal opens]
│   └── useEffect on modal visibility → setTimeout 500ms → Speech.speak(
│       "Time to take Metformin, 500 milligrams.
│        Take with food. Please press TAKEN when done."
│      )
│
├── [User presses TAKEN]
│   └── speak("Medication marked as taken. Well done!")
│
└── [Countdown timer at 5, 2, 1 minutes]
    └── speak("5 minutes until Metformin")
        speak("2 minutes until Metformin")
        speak("1 minute until Metformin")
```

---

## Family Alert Flow — End to End

```
Missed dose detected (30+ minutes past scheduled time)
│
├── AlertService.sendEscalation(event, familyMembers, emergencyContact)
│   │
│   ├── LocalAlertProvider.sendAlert() → console.log + Redux audit trail
│   │
│   └── SMSAlertProvider.sendAlert()
│       └── Linking.openURL(
│             'sms:+919428201825?body=⚠️ SeniorCare Alert: Your patient has
│              missed their Metformin dose scheduled 30 minutes ago.
│              Please check on them. — SeniorCare Companion App'
│           )
│           → Native SMS composer opens with pre-filled message
│           → User reviews and taps Send
│
├── [No family members configured]
│   └── Falls back to emergencyContact from userSlice
│       Default: +919428201825
│
└── [Critical: 60+ minutes missed]
    └── PhoneCallProvider.sendAlert() (for critical urgency only)
        └── Linking.openURL('tel:+919428201825')
            → System phone dialler opens
```

---

## Accessibility Model

Every interactive element in the app follows this pattern:

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Take Metformin 500mg"        // what it IS
  accessibilityHint="Double-tap to confirm dose"   // what it DOES
  accessibilityState={{ disabled: false }}         // current state
  style={styles.button}                            // min 60×60px
>
```

**Screen reader order**: Elements are rendered in logical reading order (top → bottom, left → right). Modals set `accessibilityViewIsModal={true}` to trap focus inside the modal.

**Touch targets**: Every tappable element is at minimum 60×60px. BigButton enforces `minHeight: 60`. Tab bar is 70px + safe area.

**High contrast**: Activated via Settings → Accessibility. Switches the entire app to pure black/white palette. The `useAccessibility` hook returns `HighContrastColors` when this flag is on — no component handles this individually.

**Large text**: `textScale = 1.3` multiplied against every `Typography.*` value. All layout uses `minHeight` (not `height`) to accommodate text wrapping.

---

## Data Persistence Model

```
Redux State (in-memory)
        ↕ redux-persist (whitelist: all slices)
AsyncStorage (on-device SQLite)

Keys:
  persist:root         → serialised Redux state (all 7 slices)
  pending_alert_queue  → AlertEvent[] from background task

Persist config:
  version: 2
  whitelist: ['user', 'medications', 'reminders', 'family',
              'settings', 'wellness', 'achievements']

Migration: remindersSlice.migrateReminders() runs on first mount
  → converts old Reminder.scheduledTime (string) to
    Reminder.scheduledTimes (string[])
  → adds missing scheduledTimeSlot to old ReminderEvents
```

**Why offline-first**: The app's core function (reminders, dose tracking) must work without internet. No API calls are made for core features. Future cloud sync (doctor portal, multi-device) would be additive, not a dependency.
