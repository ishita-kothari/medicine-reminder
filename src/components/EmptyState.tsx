import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import BigButton from './BigButton';
import { Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ emoji = '💊', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { colors, textScale } = useAccessibility();

  return (
    <View style={styles.container} accessible={true} accessibilityRole="none">
      <Text style={styles.emoji} accessible={false}>
        {emoji}
      </Text>
      <Text
        accessible={true}
        accessibilityRole="header"
        style={[styles.title, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <BigButton
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="large"
          style={styles.button}
          accessibilityHint={`Double-tap to ${actionLabel.toLowerCase()}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 26,
  },
  button: {
    minWidth: 240,
    marginTop: Spacing.md,
  },
});
