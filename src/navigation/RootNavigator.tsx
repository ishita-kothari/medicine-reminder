import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import BottomTabNavigator from './BottomTabNavigator';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import { useAppSelector } from '../hooks/useAppSelector';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const onboardingCompleted = useAppSelector((s) => s.user.onboardingCompleted);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingCompleted ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="Main" component={BottomTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
