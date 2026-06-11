import React from 'react';
import { View, ScrollView, StyleSheet, Switch, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { addFamilyMember, updateFamilyMember } from '../../../store/slices/familySlice';
import { FamilyStackParamList } from '../../../types';
import AccessibleTextInput from '../../../components/AccessibleTextInput';
import BigButton from '../../../components/BigButton';
import { generateId } from '../../../utils/idGenerator';
import { Spacing } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<FamilyStackParamList>;
type RouteType = RouteProp<FamilyStackParamList, 'EditFamilyMember'>;

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  relationship: z.string().min(1, 'Relationship is required').max(50),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')).default(''),
  isPrimary: z.boolean().default(false),
  receiveAlerts: z.boolean().default(true),
});

type MemberFormData = z.infer<typeof memberSchema>;

export default function AddEditFamilyMemberScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();

  const memberId = (route.params as any)?.memberId as string | undefined;
  const existing = useAppSelector((s) => (memberId ? s.family.members[memberId] : undefined));

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    mode: 'onBlur',
    defaultValues: existing
      ? {
          name: existing.name,
          relationship: existing.relationship,
          phone: existing.phone,
          email: existing.email,
          isPrimary: existing.isPrimary,
          receiveAlerts: existing.receiveAlerts,
        }
      : { isPrimary: false, receiveAlerts: true, phone: '', email: '' },
  });

  const onSubmit = (data: MemberFormData) => {
    if (existing) {
      dispatch(updateFamilyMember({ id: memberId!, ...data, phone: data.phone ?? '', email: data.email ?? '', alertChannels: existing.alertChannels }));
    } else {
      dispatch(
        addFamilyMember({
          id: generateId(),
          ...data,
          phone: data.phone ?? '',
          email: data.email ?? '',
          alertChannels: ['local'],
        })
      );
    }
    navigation.goBack();
  };

  const SwitchRow = ({
    label,
    name,
    hint,
  }: {
    label: string;
    name: 'isPrimary' | 'receiveAlerts';
    hint: string;
  }) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View
          accessible={true}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ checked: value as boolean }}
          style={[styles.switchRow, { borderColor: colors.divider }]}
        >
          <Text style={[styles.switchLabel, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
            {label}
          </Text>
          <Switch
            value={value as boolean}
            onValueChange={onChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            accessible={false}
          />
        </View>
      )}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Full Name *"
              accessibilityLabel="Caregiver full name, required"
              accessibilityHint="Enter the full name of this caregiver"
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
          name="relationship"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Relationship *"
              accessibilityLabel="Relationship to you, required"
              accessibilityHint="Enter how this person is related to you, for example daughter or doctor"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.relationship?.message}
              autoCapitalize="words"
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Phone Number"
              accessibilityLabel="Phone number"
              accessibilityHint="Enter the phone number for calls and text messages"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Email Address"
              accessibilityLabel="Email address"
              accessibilityHint="Enter the email address for alerts"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.message}
            />
          )}
        />
        <SwitchRow
          label="Primary caregiver"
          name="isPrimary"
          hint="Double-tap to mark this person as your primary caregiver who is contacted first"
        />
        <SwitchRow
          label="Receive missed-dose alerts"
          name="receiveAlerts"
          hint="Double-tap to toggle whether this person receives alerts when you miss a dose"
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label={existing ? 'Save Changes' : 'Add Caregiver'}
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          size="large"
          loading={isSubmitting}
          accessibilityHint="Double-tap to save this caregiver"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 100 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
    minHeight: 60,
  },
  switchLabel: { flex: 1, ...Typography.body },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
