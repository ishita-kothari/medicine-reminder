import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LightColors } from '../theme/colors';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={LightColors.primary} />
      <Text style={styles.text}>Loading your medicines...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 18,
    color: LightColors.textSecondary,
  },
});
