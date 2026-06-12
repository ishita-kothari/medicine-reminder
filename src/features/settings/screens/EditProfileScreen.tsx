import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { updateProfile, DEFAULT_EMERGENCY_CONTACT } from '../../../store/slices/userSlice';
import AccessibleTextInput from '../../../components/AccessibleTextInput';
import BigButton from '../../../components/BigButton';
import { Spacing } from '../../../theme/spacing';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  age: z.coerce.number().min(0).max(130).optional().default(0),
  emergencyContact: z.string().max(20).optional().default(''),
});
type FormData = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useAccessibility();
  const { name, age, emergencyContact } = useAppSelector((s) => s.user);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { name, age, emergencyContact: emergencyContact || DEFAULT_EMERGENCY_CONTACT },
  });

  const onSubmit = (data: FormData) => {
    dispatch(updateProfile({
      name: data.name,
      age: data.age ?? 0,
      emergencyContact: data.emergencyContact?.trim() || DEFAULT_EMERGENCY_CONTACT,
    }));
    Alert.alert('Saved', 'Your profile has been updated.');
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control} name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Your Name *"
              accessibilityLabel="Your name"
              accessibilityHint="Enter your first name"
              value={value} onChangeText={onChange} onBlur={onBlur}
              error={errors.name?.message} autoCapitalize="words"
            />
          )}
        />
        <Controller
          control={control} name="age"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Age"
              accessibilityLabel="Your age"
              accessibilityHint="Enter your age"
              value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur}
              keyboardType="numeric"
            />
          )}
        />
        <Controller
          control={control} name="emergencyContact"
          render={({ field: { onChange, onBlur, value } }) => (
            <AccessibleTextInput
              label="Emergency Contact Phone"
              accessibilityLabel="Emergency contact phone number"
              accessibilityHint="Phone number called when you press SOS. Default is +919428201825"
              value={value} onChangeText={onChange} onBlur={onBlur}
              keyboardType="phone-pad"
              placeholder={DEFAULT_EMERGENCY_CONTACT}
            />
          )}
        />
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label="Save Profile"
          onPress={handleSubmit(onSubmit)}
          variant="primary" size="large" loading={isSubmitting}
          accessibilityHint="Double-tap to save profile changes"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, borderTopWidth: 1 },
});
