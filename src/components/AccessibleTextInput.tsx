import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';
import { useAccessibility } from '../hooks/useAccessibility';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface AccessibleTextInputProps extends Omit<TextInputProps, 'theme'> {
  accessibilityLabel: string;
  accessibilityHint: string;
  label: string;
  error?: string;
}

export default function AccessibleTextInput({
  accessibilityLabel,
  accessibilityHint,
  label,
  error,
  style,
  ...props
}: AccessibleTextInputProps) {
  const { colors, textScale } = useAccessibility();

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        mode="outlined"
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="none"
        error={!!error}
        style={[
          styles.input,
          { fontSize: Typography.body.fontSize * textScale },
          style,
        ]}
        outlineColor={error ? colors.error : colors.border}
        activeOutlineColor={error ? colors.error : colors.primary}
        textColor={colors.text}
        theme={{
          colors: {
            onSurfaceVariant: colors.textSecondary,
            background: colors.surface,
          },
        }}
        {...props}
      />
      {error ? (
        <Text
          accessible={true}
          accessibilityRole="alert"
          style={[styles.errorText, { color: colors.error, fontSize: Typography.label.fontSize * textScale }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: 60,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
