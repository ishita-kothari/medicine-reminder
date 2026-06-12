import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect, useRef, useMemo } from 'react';
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
import { TwilioSmsProvider } from './src/services/providers/TwilioSmsProvider';
import { ResendEmailProvider } from './src/services/providers/ResendEmailProvider';
import NotificationHandler from './src/features/notifications/NotificationHandler';
import RootNavigator from './src/navigation/RootNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import { PaperLightTheme, PaperDarkTheme, PaperHighContrastTheme } from './src/theme';

// Register background task definition (import for side effects)
import './src/features/notifications/backgroundTask';

// Register PhoneCallProvider globally — used for critical (60+ min) escalations
alertService.registerProvider(new PhoneCallProvider());

function AppContent() {
  const dispatch = useAppDispatch();
  const { darkMode, highContrast, alertBackendUrl, twilioSmsEnabled, resendEmailEnabled } =
    useAppSelector((s) => s.settings);
  const allEvents = useAppSelector((s) => s.reminders.events);
  const userName = useAppSelector((s) => s.user.name);

  const paperTheme = useMemo(() => {
    if (highContrast) return PaperHighContrastTheme;
    if (darkMode) return PaperDarkTheme;
    return PaperLightTheme;
  }, [highContrast, darkMode]);

  // ── Dynamically register / deregister alert providers based on settings ──
  // WHY: User can toggle Twilio and Resend at runtime without restarting.
  //      We re-register whenever the backend URL or toggle states change.
  useEffect(() => {
    // Remove any existing sms/email providers before re-adding
    alertService.removeProvider('sms');
    alertService.removeProvider('email');

    if (alertBackendUrl && twilioSmsEnabled) {
      alertService.registerProvider(new TwilioSmsProvider(alertBackendUrl));
    }

    if (alertBackendUrl && resendEmailEnabled) {
      alertService.registerProvider(new ResendEmailProvider(alertBackendUrl, userName || 'Patient'));
    }
    // If neither is enabled, SMSAlertProvider (native compose) remains as fallback
    // — it was registered in AlertService.ts singleton initialisation
  }, [alertBackendUrl, twilioSmsEnabled, resendEmailEnabled, userName]);

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

    // Check perfect-period badges on launch and every app-resume
    dispatch(checkPerfectPeriods(allEvents));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        dispatch(checkPerfectPeriods(allEvents));
      }
    });

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
