import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsStackParamList } from '../types';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import AccessibilitySettingsScreen from '../features/settings/screens/AccessibilitySettingsScreen';
import EditProfileScreen from '../features/settings/screens/EditProfileScreen';
import DataExportScreen from '../features/settings/screens/DataExportScreen';
import { useAccessibility } from '../hooks/useAccessibility';

const Stack = createStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { colors } = useAccessibility();
  const headerStyle = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontSize: 20, fontWeight: '700' as const },
    cardStyle: { backgroundColor: colors.background },
  };
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsScreen} options={{ title: 'Accessibility' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Export Data' }} />
    </Stack.Navigator>
  );
}
