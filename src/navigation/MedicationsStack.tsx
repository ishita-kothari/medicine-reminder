import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MedicationsStackParamList } from '../types';
import MedicationListScreen from '../features/medications/screens/MedicationListScreen';
import AddEditMedicationScreen from '../features/medications/screens/AddEditMedicationScreen';
import ReminderListScreen from '../features/reminders/screens/ReminderListScreen';
import AddEditReminderScreen from '../features/reminders/screens/AddEditReminderScreen';
import { useAccessibility } from '../hooks/useAccessibility';

const Stack = createStackNavigator<MedicationsStackParamList>();

export default function MedicationsStack() {
  const { colors } = useAccessibility();

  const headerStyle = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontSize: 20, fontWeight: '700' as const },
    cardStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen
        name="MedicationList"
        component={MedicationListScreen}
        options={{ title: 'My Medicines' }}
      />
      <Stack.Screen
        name="AddMedication"
        component={AddEditMedicationScreen}
        options={{ title: 'Add Medicine' }}
      />
      <Stack.Screen
        name="EditMedication"
        component={AddEditMedicationScreen}
        options={{ title: 'Edit Medicine' }}
      />
      <Stack.Screen
        name="ReminderList"
        component={ReminderListScreen}
        options={{ title: 'Reminders' }}
      />
      <Stack.Screen
        name="AddReminder"
        component={AddEditReminderScreen}
        options={({ route }) =>
          (route.params as any)?.isFirstReminder
            ? { title: 'Set a Reminder', headerLeft: () => null }
            : { title: 'Add Reminder' }
        }
      />
      <Stack.Screen
        name="EditReminder"
        component={AddEditReminderScreen}
        options={{ title: 'Edit Reminder' }}
      />
    </Stack.Navigator>
  );
}
