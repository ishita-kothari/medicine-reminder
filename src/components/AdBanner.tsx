import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isAdAllowed } from '../constants/adPlacementRules';
import { useAccessibility } from '../hooks/useAccessibility';

interface AdBannerProps {
  screenName: string;
  position?: 'top' | 'bottom';
}

export default function AdBanner({ screenName, position = 'bottom' }: AdBannerProps) {
  const { colors } = useAccessibility();

  if (!isAdAllowed(screenName)) {
    if (__DEV__) {
      console.warn(`[AdBanner] Blocked on screen: ${screenName}`);
    }
    return null;
  }

  // MVP: placeholder — replace with BannerAd from react-native-google-mobile-ads in production
  return (
    <View
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel="Advertisement"
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceVariant,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textDisabled }]}>Ad placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  label: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
