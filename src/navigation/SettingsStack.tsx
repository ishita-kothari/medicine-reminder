import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsStackParamList } from '../types';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import AccessibilitySettingsScreen from '../features/settings/screens/AccessibilitySettingsScreen';
import { useAccessibility } from '../hooks/useAccessibility';

const Stack = createStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { colors } = useAccessibility();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 20, fontWeight: '700' },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen
        name="AccessibilitySettings"
        component={AccessibilitySettingsScreen}
        options={{ title: 'Accessibility' }}
      />
    </Stack.Navigator>
  );
}
