import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabParamList } from '../types';
import HomeScreen from '../features/dashboard/screens/HomeScreen';
import MedicationsStack from './MedicationsStack';
import FamilyStack from './FamilyStack';
import WellnessStack from './WellnessStack';
import SettingsStack from './SettingsStack';
import { useAccessibility } from '../hooks/useAccessibility';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_CONFIG: Record<
  keyof BottomTabParamList,
  { label: string; icon: string; a11y: string }
> = {
  HomeTab:      { label: 'Home',      icon: '🏠', a11y: 'Home tab' },
  MedicinesTab: { label: 'Medicines', icon: '💊', a11y: 'Medicines tab' },
  FamilyTab:    { label: 'Family',    icon: '👨‍👩‍👧', a11y: 'Family tab' },
  WellnessTab:  { label: 'Wellness',  icon: '💚', a11y: 'Wellness tab' },
  SettingsTab:  { label: 'Settings',  icon: '⚙️', a11y: 'Settings tab' },
};

export default function BottomTabNavigator() {
  const { colors } = useAccessibility();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CONFIG[route.name as keyof BottomTabParamList];
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            elevation: 8,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDisabled,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused }) => (
            <Text
              accessible={false}
              style={{ fontSize: 22, marginBottom: Platform.OS === 'ios' ? -2 : 0 }}
            >
              {cfg.icon}
            </Text>
          ),
          tabBarLabel: cfg.label,
          tabBarAccessibilityLabel: cfg.a11y,
        };
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          headerShown: true,
          headerTitle: 'SeniorCare',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontSize: 22, fontWeight: '800' as const },
        }}
      />
      <Tab.Screen name="MedicinesTab" component={MedicationsStack} />
      <Tab.Screen name="FamilyTab" component={FamilyStack} />
      <Tab.Screen name="WellnessTab" component={WellnessStack} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}
