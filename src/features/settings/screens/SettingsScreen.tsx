import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { toggleDarkMode, toggleVoiceGuidance, toggleVibration } from '../../../store/slices/settingsSlice';
import { SettingsStackParamList } from '../../../types';
import ToggleRow from '../components/ToggleRow';
import AdBanner from '../../../components/AdBanner';
import { Spacing } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<SettingsStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();

  const { darkMode, voiceGuidance, vibration } = useAppSelector((s) => s.settings);
  const userName = useAppSelector((s) => s.user.name);

  const sectionLabel = (text: string) => (
    <Text
      accessible={true}
      accessibilityRole="header"
      style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}
    >
      {text.toUpperCase()}
    </Text>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {userName ? (
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.profileName, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
            {userName}
          </Text>
        </View>
      ) : null}

      {sectionLabel('Display')}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <ToggleRow
          label="Dark Mode"
          description="Switch to a dark colour theme"
          value={darkMode}
          onChange={() => dispatch(toggleDarkMode())}
        />
      </View>

      {sectionLabel('Notifications')}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <ToggleRow
          label="Voice Guidance"
          description="Speak medication names when reminders fire"
          value={voiceGuidance}
          onChange={() => dispatch(toggleVoiceGuidance())}
        />
        <ToggleRow
          label="Vibration"
          description="Vibrate device when reminders fire"
          value={vibration}
          onChange={() => dispatch(toggleVibration())}
        />
      </View>

      {sectionLabel('Accessibility')}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Accessibility settings"
          accessibilityHint="Double-tap to open accessibility options including high contrast and large text"
          onPress={() => navigation.navigate('AccessibilitySettings')}
          style={[styles.navRow, { borderBottomColor: colors.divider }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.navLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
            Accessibility Options
          </Text>
          <Text style={[styles.navChevron, { color: colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <AdBanner screenName="SettingsFooter" position="bottom" />

      <View style={styles.footer}>
        <Text style={[styles.version, { color: colors.textDisabled, fontSize: Typography.caption.fontSize }]}>
          SeniorCare Companion v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileName: { ...Typography.heading },
  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'transparent',
    marginBottom: Spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    minHeight: 70,
  },
  navLabel: { ...Typography.body, fontWeight: '600' },
  navChevron: { fontSize: 24, fontWeight: '300' },
  footer: { alignItems: 'center', padding: Spacing.xl },
  version: {},
});
