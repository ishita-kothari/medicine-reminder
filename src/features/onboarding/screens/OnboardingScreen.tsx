import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { createProfile, completeOnboarding } from '../../../store/slices/userSlice';
import { toggleHighContrast, toggleLargeText, toggleVoiceGuidance } from '../../../store/slices/settingsSlice';
import AccessibleTextInput from '../../../components/AccessibleTextInput';
import BigButton from '../../../components/BigButton';
import { Spacing, Layout } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

const { width } = Dimensions.get('window');

const profileSchema = z.object({
  name: z.string().min(1, 'Please enter your name').max(100),
  emergencyContact: z.string().max(20).optional().default(''),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const { highContrast, largeText, voiceGuidance } = useAppSelector((s) => s.settings);

  const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: { name: '', emergencyContact: '' },
  });

  const goToPage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
  };

  const handleProfileSubmit = (data: ProfileFormData) => {
    dispatch(createProfile({ name: data.name, age: 0, emergencyContact: data.emergencyContact ?? '' }));
    goToPage(1);
  };

  const handleFinish = () => {
    dispatch(completeOnboarding());
  };

  const SwitchRow = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
  }) => (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={[styles.switchRow, { borderColor: colors.divider }]}
      activeOpacity={0.7}
    >
      <View style={styles.switchText}>
        <Text style={[styles.switchLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          {label}
        </Text>
        <Text style={[styles.switchDesc, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        accessible={false}
      />
    </TouchableOpacity>
  );

  const pages = [
    // Page 1: Name & emergency contact
    <View key="p1" style={[styles.page, { width }]}>
      <Text style={styles.pageEmoji} accessible={false}>👋</Text>
      <Text
        accessible={true}
        accessibilityRole="header"
        style={[styles.pageTitle, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
      >
        Welcome!
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
        Let's set up your profile so we can personalise your reminders.
      </Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <AccessibleTextInput
            label="Your Name *"
            accessibilityLabel="Your name, required"
            accessibilityHint="Enter your first name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
          />
        )}
      />
      <Controller
        control={control}
        name="emergencyContact"
        render={({ field: { onChange, onBlur, value } }) => (
          <AccessibleTextInput
            label="Emergency Contact Phone"
            accessibilityLabel="Emergency contact phone number"
            accessibilityHint="Enter a phone number to call in an emergency"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="phone-pad"
          />
        )}
      />
      <BigButton
        label="Next →"
        onPress={handleSubmit(handleProfileSubmit)}
        variant="primary"
        size="large"
        style={styles.nextBtn}
        accessibilityHint="Double-tap to continue to accessibility settings"
      />
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Skip setup"
        onPress={handleFinish}
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>,

    // Page 2: Accessibility preferences
    <View key="p2" style={[styles.page, { width }]}>
      <Text style={styles.pageEmoji} accessible={false}>♿</Text>
      <Text
        accessible={true}
        accessibilityRole="header"
        style={[styles.pageTitle, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
      >
        Accessibility
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
        Set up the app to work best for you. You can change these anytime in Settings.
      </Text>
      <View style={[styles.switchList, { backgroundColor: colors.surface }]}>
        <SwitchRow
          label="High Contrast"
          description="Black and white for easier reading"
          value={highContrast}
          onChange={() => dispatch(toggleHighContrast())}
        />
        <SwitchRow
          label="Large Text"
          description="Increase all text sizes"
          value={largeText}
          onChange={() => dispatch(toggleLargeText())}
        />
        <SwitchRow
          label="Voice Guidance"
          description="Speak reminders and confirmations aloud"
          value={voiceGuidance}
          onChange={() => dispatch(toggleVoiceGuidance())}
        />
      </View>
      <BigButton
        label="All done! →"
        onPress={handleFinish}
        variant="primary"
        size="large"
        style={styles.nextBtn}
        accessibilityHint="Double-tap to finish setup and start using the app"
      />
    </View>,
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {pages}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? colors.primary : colors.border },
            ]}
            accessible={false}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  pageEmoji: { fontSize: 64, textAlign: 'center', marginBottom: Spacing.md },
  pageTitle: { ...Typography.heading, textAlign: 'center', marginBottom: Spacing.sm },
  pageSubtitle: { ...Typography.body, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 26 },
  nextBtn: { marginTop: Spacing.md },
  skipText: { textAlign: 'center', marginTop: Spacing.lg, fontSize: 16 },
  switchList: { borderRadius: 12, overflow: 'hidden', marginBottom: Spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    minHeight: 70,
  },
  switchText: { flex: 1, paddingRight: Spacing.sm },
  switchLabel: { ...Typography.body, fontWeight: '600' },
  switchDesc: { marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: Spacing.xl },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
