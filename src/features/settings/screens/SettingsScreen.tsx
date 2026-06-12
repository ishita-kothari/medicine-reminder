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
import { Spacing, Layout } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<SettingsStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();

  const { darkMode, voiceGuidance, vibration } = useAppSelector((s) => s.settings);
  const user = useAppSelector((s) => s.user);

  const NavRow = ({ label, desc, screen }: { label: string; desc?: string; screen: keyof SettingsStackParamList }) => (
    <TouchableOpacity
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`Double-tap to open ${label}`}
      onPress={() => navigation.navigate(screen as any)}
      style={[styles.navRow, { borderBottomColor: colors.divider }]}
      activeOpacity={0.7}
    >
      <View style={styles.navTextGroup}>
        <Text style={[styles.navLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          {label}
        </Text>
        {desc ? <Text style={[styles.navDesc, { color: colors.textSecondary }]}>{desc}</Text> : null}
      </View>
      <Text style={[styles.navChevron, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  const sectionLabel = (text: string) => (
    <Text
      accessible
      accessibilityRole="header"
      style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}
    >
      {text.toUpperCase()}
    </Text>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
            {user.name || 'Your Profile'}
          </Text>
          {user.emergencyContact ? (
            <Text style={[styles.profileSub, { color: colors.textSecondary }]}>
              SOS: {user.emergencyContact}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => navigation.navigate('EditProfile')}
          style={[styles.editBtn, { backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

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
        <NavRow label="Accessibility Options" desc="High contrast, large text, font size" screen="AccessibilitySettings" />
      </View>

      {sectionLabel('Alerts')}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <NavRow label="Alert Settings" desc="Automatic SMS & email via Twilio / Resend backend" screen="AlertSettings" />
      </View>

      {sectionLabel('Data')}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <NavRow label="Export Dose History" desc="Share a CSV report with your doctor" screen="DataExport" />
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
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
  },
  profileInfo: { flex: 1 },
  profileName: { fontWeight: '700' },
  profileSub: { fontSize: 13, marginTop: 2 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  editBtnText: { fontSize: 14, fontWeight: '700' },
  sectionLabel: {
    marginTop: Spacing.lg, marginBottom: Spacing.xs,
    marginHorizontal: Spacing.md, letterSpacing: 1,
  },
  section: { borderTopWidth: 1, borderBottomWidth: 1, marginBottom: Spacing.xs },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, minHeight: 70,
  },
  navTextGroup: { flex: 1 },
  navLabel: { fontWeight: '600' },
  navDesc: { fontSize: 13, marginTop: 2 },
  navChevron: { fontSize: 24, fontWeight: '300' },
  footer: { alignItems: 'center', padding: Spacing.xl },
  version: {},
});
