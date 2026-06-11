import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WellnessStackParamList } from '../types';
import WellnessDashboardScreen from '../features/wellness/screens/WellnessDashboardScreen';
import AchievementsScreen from '../features/wellness/screens/AchievementsScreen';
import { useAccessibility } from '../hooks/useAccessibility';

const Stack = createStackNavigator<WellnessStackParamList>();

export default function WellnessStack() {
  const { colors } = useAccessibility();
  const headerStyle = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontSize: 20, fontWeight: '700' as const },
    cardStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="WellnessDashboard" component={WellnessDashboardScreen} options={{ title: 'Wellness' }} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'My Achievements' }} />
    </Stack.Navigator>
  );
}
