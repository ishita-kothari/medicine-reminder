// AdBanner is intentionally NOT rendered on this screen — see AD_BLOCKED_SCREENS
import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAccessibility } from '../../../hooks/useAccessibility';
import {
  toggleHighContrast,
  toggleLargeText,
  toggleVoiceGuidance,
  toggleVibration,
  setFontScale,
} from '../../../store/slices/settingsSlice';
import ToggleRow from '../components/ToggleRow';
import BigButton from '../../../components/BigButton';
import { Spacing } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

export default function AccessibilitySettingsScreen() {
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const { highContrast, largeText, voiceGuidance, vibration, fontScale } = useAppSelector(
    (s) => s.settings
  );

  const fontScaleOptions = [
    { label: 'Normal', value: 1.0 },
    { label: 'Large', value: 1.2 },
    { label: 'Larger', value: 1.4 },
    { label: 'Largest', value: 1.6 },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[styles.intro, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}
      >
        Adjust these settings to make the app easier to use.
      </Text>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <ToggleRow
          label="High Contrast"
          description="Use black and white colours for maximum readability"
          value={highContrast}
          onChange={() => dispatch(toggleHighContrast())}
          hint="Double-tap to toggle high contrast mode"
        />
        <ToggleRow
          label="Large Text"
          description="Increase all text sizes by 30%"
          value={largeText}
          onChange={() => dispatch(toggleLargeText())}
          hint="Double-tap to toggle large text mode"
        />
        <ToggleRow
          label="Voice Guidance"
          description="Speak medication names and reminders aloud"
          value={voiceGuidance}
          onChange={() => dispatch(toggleVoiceGuidance())}
          hint="Double-tap to toggle voice guidance"
        />
        <ToggleRow
          label="Vibration"
          description="Vibrate when reminders and alerts fire"
          value={vibration}
          onChange={() => dispatch(toggleVibration())}
          hint="Double-tap to toggle vibration"
        />
      </View>

      <Text
        accessible={true}
        accessibilityRole="header"
        style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}
      >
        TEXT SIZE
      </Text>
      <View style={[styles.section, { backgroundColor: colors.surface, padding: Spacing.md }]}>
        <View style={styles.fontScaleRow}>
          {fontScaleOptions.map((option) => (
            <BigButton
              key={option.value}
              label={option.label}
              onPress={() => dispatch(setFontScale(option.value))}
              variant={Math.abs(fontScale - option.value) < 0.05 ? 'primary' : 'secondary'}
              size="normal"
              style={styles.fontBtn}
              accessibilityHint={`Double-tap to set text size to ${option.label}`}
            />
          ))}
        </View>
        <Text
          style={[styles.preview, { color: colors.text, fontSize: Typography.body.fontSize * fontScale }]}
        >
          Preview text at this size
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: {
    padding: Spacing.md,
    lineHeight: 26,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
    fontWeight: '600',
  },
  fontScaleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  fontBtn: { flex: 1, minWidth: 80 },
  preview: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
    fontWeight: '500',
  },
});
