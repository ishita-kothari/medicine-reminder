/**
 * AlertSettingsScreen.tsx
 *
 * WHY: Automatic SMS and email alerts require a deployed backend URL.
 * This screen lets the user enter that URL and toggle each alert channel.
 * It includes a "Test" button that fires a real test alert so the user
 * can verify the setup works before relying on it in an emergency.
 *
 * STEP-BY-STEP SETUP GUIDE (shown in the screen):
 *   1. Deploy the Vercel backend from this repo
 *   2. Add Twilio / Resend credentials to Vercel env vars
 *   3. Paste the Vercel deployment URL here
 *   4. Toggle SMS and/or Email ON
 *   5. Tap "Send Test Alert" to verify
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import {
  setAlertBackendUrl,
  toggleTwilioSms,
  toggleResendEmail,
} from '../../../store/slices/settingsSlice';
import ToggleRow from '../components/ToggleRow';
import BigButton from '../../../components/BigButton';
import { Spacing, Layout } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

export default function AlertSettingsScreen() {
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const {
    alertBackendUrl,
    twilioSmsEnabled,
    resendEmailEnabled,
  } = useAppSelector((s) => s.settings);
  const emergencyContact = useAppSelector((s) => s.user.emergencyContact);
  const familyMembers = useAppSelector((s) => Object.values(s.family.members));

  const [urlDraft, setUrlDraft] = useState(alertBackendUrl);
  const [testing, setTesting] = useState(false);

  const handleSaveUrl = () => {
    const clean = urlDraft.trim().replace(/\/$/, '');
    dispatch(setAlertBackendUrl(clean));
    Alert.alert('Saved', 'Backend URL saved.');
  };

  const handleTestSms = async () => {
    const url = alertBackendUrl || urlDraft.trim();
    if (!url) {
      Alert.alert('No URL', 'Enter and save your backend URL first.');
      return;
    }
    const testPhone =
      familyMembers.find((m) => m.isPrimary && m.phone)?.phone ||
      emergencyContact ||
      '+919428201825';

    setTesting(true);
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          message: `✅ SeniorCare test alert — SMS alerts are working correctly! (${new Date().toLocaleTimeString()})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅ Success', `Test SMS sent to ${testPhone}`);
      } else {
        Alert.alert('❌ Failed', data.error || 'SMS not sent. Check your Twilio credentials.');
      }
    } catch (e: any) {
      Alert.alert('❌ Error', `Could not reach backend: ${e.message}\n\nMake sure your Vercel URL is correct.`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestEmail = async () => {
    const url = alertBackendUrl || urlDraft.trim();
    if (!url) {
      Alert.alert('No URL', 'Enter and save your backend URL first.');
      return;
    }
    const testEmail = familyMembers.find((m) => m.email)?.email;
    if (!testEmail) {
      Alert.alert('No Email', 'Add a caregiver email address in the Family tab first.');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: '✅ SeniorCare test alert',
          medicationName: 'Test Medication',
          minutesPastDue: 0,
          urgency: 'low',
          message: `This is a test alert from SeniorCare Companion. Email alerts are configured correctly! (${new Date().toLocaleTimeString()})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅ Success', `Test email sent to ${testEmail}`);
      } else {
        Alert.alert('❌ Failed', data.error || 'Email not sent. Check your Resend credentials.');
      }
    } catch (e: any) {
      Alert.alert('❌ Error', `Could not reach backend: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const Step = ({ num, text }: { num: string; text: string }) => (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Setup guide */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text
          accessible
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
        >
          🔧 Setup Guide
        </Text>
        <Step num="1" text="Push this project to GitHub (already done ✓)" />
        <Step num="2" text="Go to vercel.com/new and import the GitHub repo" />
        <Step num="3" text="In Vercel dashboard → Settings → Environment Variables, add your Twilio and/or Resend credentials (see .env.example)" />
        <Step num="4" text="Copy the deployment URL (e.g. https://my-app.vercel.app) and paste it below" />
        <Step num="5" text="Toggle the channels you want and tap Test to verify" />

        <TouchableOpacity
          onPress={() => Linking.openURL('https://vercel.com/new')}
          accessible
          accessibilityRole="link"
          accessibilityLabel="Open Vercel to deploy"
        >
          <Text style={[styles.link, { color: colors.primary }]}>Open Vercel →</Text>
        </TouchableOpacity>
      </View>

      {/* Backend URL */}
      <Text
        accessible
        accessibilityRole="header"
        style={[styles.sectionLabel, { color: colors.textSecondary }]}
      >
        BACKEND URL
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Your Vercel deployment URL (no trailing slash)
        </Text>
        <View style={[styles.urlRow, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
          <TextInput
            accessible
            accessibilityLabel="Backend URL"
            accessibilityHint="Enter your Vercel deployment URL"
            placeholder="https://your-app.vercel.app"
            placeholderTextColor={colors.textDisabled}
            value={urlDraft}
            onChangeText={setUrlDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.urlInput, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}
            returnKeyType="done"
            onSubmitEditing={handleSaveUrl}
          />
        </View>
        <BigButton
          label="Save URL"
          onPress={handleSaveUrl}
          variant={urlDraft.trim() ? 'primary' : 'secondary'}
          size="normal"
          style={styles.saveBtn}
          accessibilityHint="Double-tap to save this backend URL"
        />
        {alertBackendUrl ? (
          <Text style={[styles.saved, { color: colors.success }]}>
            ✓ Saved: {alertBackendUrl}
          </Text>
        ) : null}
      </View>

      {/* SMS via Twilio */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SMS ALERTS (TWILIO)</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Automatic SMS to caregivers — no user action required. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your Vercel env vars.
        </Text>
        <ToggleRow
          label="Enable automatic SMS"
          description={twilioSmsEnabled ? 'Caregivers receive SMS without any user action' : 'Tap to enable Twilio SMS alerts'}
          value={twilioSmsEnabled}
          onChange={() => dispatch(toggleTwilioSms())}
          hint="Double-tap to toggle automatic SMS alerts"
        />
        {twilioSmsEnabled && (
          <BigButton
            label={testing ? 'Sending...' : '📱 Send Test SMS'}
            onPress={handleTestSms}
            variant="secondary"
            size="normal"
            loading={testing}
            style={styles.testBtn}
            accessibilityHint="Double-tap to send a test SMS to your primary caregiver"
          />
        )}
      </View>

      {/* Email via Resend */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EMAIL ALERTS (RESEND)</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Sends a formatted HTML email to caregivers on missed doses. Requires RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel env vars.
        </Text>
        <ToggleRow
          label="Enable email alerts"
          description={resendEmailEnabled ? 'Caregivers receive email on missed doses' : 'Tap to enable Resend email alerts'}
          value={resendEmailEnabled}
          onChange={() => dispatch(toggleResendEmail())}
          hint="Double-tap to toggle email alerts"
        />
        {resendEmailEnabled && (
          <BigButton
            label={testing ? 'Sending...' : '📧 Send Test Email'}
            onPress={handleTestEmail}
            variant="secondary"
            size="normal"
            loading={testing}
            style={styles.testBtn}
            accessibilityHint="Double-tap to send a test email to the first caregiver with an email address"
          />
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          💡 When automatic SMS/email is disabled, the app falls back to opening the native SMS composer (requires manual Send tap). When enabled and the backend is reachable, alerts fire silently in the background.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { borderRadius: Layout.cardBorderRadius, borderWidth: 1, padding: Spacing.md },
  cardTitle: { fontWeight: '700', marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: Spacing.md, marginBottom: 4,
  },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.sm },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  stepText: { flex: 1, lineHeight: 22 },
  link: { fontWeight: '700', marginTop: Spacing.sm, fontSize: 15 },
  urlRow: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm, minHeight: 52,
    justifyContent: 'center',
  },
  urlInput: { flex: 1 },
  saveBtn: { marginBottom: 6 },
  saved: { fontSize: 13, fontWeight: '600' },
  testBtn: { marginTop: Spacing.sm },
  infoCard: { borderRadius: Layout.cardBorderRadius, padding: Spacing.md },
  infoText: { fontSize: 14, lineHeight: 20 },
});
