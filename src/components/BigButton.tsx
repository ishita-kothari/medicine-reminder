import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { Layout, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
type Size = 'normal' | 'large';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export default function BigButton({
  label,
  onPress,
  variant = 'primary',
  size = 'normal',
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  textStyle,
  testID,
}: BigButtonProps) {
  const { colors, textScale, haptic } = useAccessibility();

  const height = size === 'large' ? Layout.buttonHeightLarge : Layout.buttonHeightNormal;

  const backgroundColors: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceVariant,
    danger: colors.error,
    ghost: 'transparent',
    warning: colors.warning,
  };

  const textColors: Record<Variant, string> = {
    primary: '#FFFFFF',
    secondary: colors.text,
    danger: '#FFFFFF',
    ghost: colors.primary,
    warning: '#FFFFFF',
  };

  const borderColors: Record<Variant, string | undefined> = {
    primary: undefined,
    secondary: colors.border,
    danger: undefined,
    ghost: colors.primary,
    warning: undefined,
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      haptic(size === 'large' ? 'heavy' : 'medium');
      onPress();
    }
  };

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      style={[
        styles.base,
        {
          height,
          backgroundColor: backgroundColors[variant],
          borderColor: borderColors[variant],
          borderWidth: borderColors[variant] ? 2 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColors[variant], fontSize: Typography.button.fontSize * textScale },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: Layout.minTouchTarget,
    borderRadius: Layout.inputBorderRadius,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.button,
    textAlign: 'center',
  },
});
