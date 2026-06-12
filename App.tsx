import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect, useMemo } from 'react';
import { StatusBar, AccessibilityInfo, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store, persistor } from './src/store';
import { useAppSelector } from './src/hooks/useAppSelector';
import { useAppDispatch } from './src/hooks/useAppDispatch';
import { setReducedMotion } from './src/store/slices/settingsSlice';
import { checkPerfectPeriods } from './src/store/slices/achievementsSlice';
import { notificationService } from './src/services/NotificationService';
import { alertService, PhoneCallProvider } from './src/services/AlertService';
import NotificationHandler from './src/features/notifications/NotificationHandler';
import RootNavigator from './src/navigation/RootNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import { PaperLightTheme, PaperDarkTheme, PaperHighContrastTheme } from './src/theme';

// Register background task definition (import for side effects)
import './src/features/notifications/backgroundTask';

// Register PhoneCallProvider for critical escalations
alertService.registerProvider(new PhoneCallProvider());

function AppContent() {
  const dispatch = useAppDispatch();
  const { darkMode, highContrast } = useAppSelector((s) => s.settings);
  const allEvents = useAppSelector((s) => s.reminders.events);

  const paperTheme = useMemo(() => {
    if (highContrast) return PaperHighContrastTheme;
    if (darkMode) return PaperDarkTheme;
    return PaperLightTheme;
  }, [highContrast, darkMode]);

  useEffect(() => {
    // Initialize notifications + register background task
    notificationService.initialize().then(async () => {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        notificationService.showPermissionDeniedAlert();
      }
    });

    // Detect OS-level reduce-motion preference
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      dispatch(setReducedMotion(enabled));
    });

    // Check perfect-period badges whenever app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        dispatch(checkPerfectPeriods(allEvents));
      }
    });
    // Also check immediately on launch
    dispatch(checkPerfectPeriods(allEvents));

    return () => sub.remove();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={darkMode || highContrast ? 'light-content' : 'dark-content'}
          backgroundColor={highContrast ? '#000000' : darkMode ? '#121212' : '#F8FAF9'}
        />
        <NavigationContainer>
          <NotificationHandler />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AppContent />
        </PersistGate>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
