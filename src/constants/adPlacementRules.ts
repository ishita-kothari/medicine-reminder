export const AD_ALLOWED_SCREENS = [
  'AlertHistory',
  'SettingsFooter',
] as const;

export const AD_BLOCKED_SCREENS = [
  'ReminderAlert',
  'MedicationConfirmation',
  'EmergencyFlow',
  'AccessibilitySettings',
  'Onboarding',
  'AddMedication',
  'EditMedication',
  'AddReminder',
  'EditReminder',
  'AddFamilyMember',
  'EditFamilyMember',
] as const;

export type AdAllowedScreen = typeof AD_ALLOWED_SCREENS[number];
export type AdBlockedScreen = typeof AD_BLOCKED_SCREENS[number];

export function isAdAllowed(screenName: string): boolean {
  return (AD_ALLOWED_SCREENS as readonly string[]).includes(screenName);
}
