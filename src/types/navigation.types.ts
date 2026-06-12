export type RootStackParamList = {
  Main: undefined;
  ReminderAlert: { reminderId: string; medicationId: string };
  Onboarding: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  MedicinesTab: undefined;
  FamilyTab: undefined;
  WellnessTab: undefined;
  SettingsTab: undefined;
};

export type MedicationsStackParamList = {
  MedicationList: undefined;
  AddMedication: undefined;
  EditMedication: { medicationId: string };
  ReminderList: { medicationId: string };
  AddReminder: { medicationId: string; isFirstReminder?: boolean };
  EditReminder: { reminderId: string; medicationId: string };
};

export type FamilyStackParamList = {
  FamilyList: undefined;
  AddFamilyMember: undefined;
  EditFamilyMember: { memberId: string };
  AlertHistory: undefined;
};

export type WellnessStackParamList = {
  WellnessDashboard: undefined;
  Achievements: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  AccessibilitySettings: undefined;
  EditProfile: undefined;
  DataExport: undefined;
  AlertSettings: undefined;
};
