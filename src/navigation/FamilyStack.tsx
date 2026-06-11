import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FamilyStackParamList } from '../types';
import FamilyListScreen from '../features/family/screens/FamilyListScreen';
import AddEditFamilyMemberScreen from '../features/family/screens/AddEditFamilyMemberScreen';
import AlertHistoryScreen from '../features/family/screens/AlertHistoryScreen';
import { useAccessibility } from '../hooks/useAccessibility';

const Stack = createStackNavigator<FamilyStackParamList>();

export default function FamilyStack() {
  const { colors } = useAccessibility();
  const headerStyle = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontSize: 20, fontWeight: '700' as const },
    cardStyle: { backgroundColor: colors.background },
  };
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="FamilyList" component={FamilyListScreen} options={{ title: 'Family & Caregivers' }} />
      <Stack.Screen name="AddFamilyMember" component={AddEditFamilyMemberScreen} options={{ title: 'Add Caregiver' }} />
      <Stack.Screen name="EditFamilyMember" component={AddEditFamilyMemberScreen} options={{ title: 'Edit Caregiver' }} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} options={{ title: 'Alert History' }} />
    </Stack.Navigator>
  );
}
