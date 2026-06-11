import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { Medication } from '../types';
import { Spacing, Layout, Shadows } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { formatTimeFromHHMM } from '../utils/dateHelpers';

interface MedicationCardProps {
  medication: Medication;
  nextReminderTime?: string;
  onPress?: () => void;
  onEdit?: () => void;
  rightAction?: React.ReactNode;
}

export default function MedicationCard({
  medication,
  nextReminderTime,
  onPress,
  onEdit,
  rightAction,
}: MedicationCardProps) {
  const { colors, textScale } = useAccessibility();

  const a11yLabel = [
    medication.name,
    `${medication.dosage} ${medication.unit}`,
    medication.instructions ? medication.instructions : null,
    nextReminderTime ? `Next reminder at ${formatTimeFromHHMM(nextReminderTime)}` : null,
    'Tap to view details',
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double-tap to view and manage this medication"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.colorDot}>
        <View
          style={[
            styles.dot,
            { backgroundColor: medication.color || colors.primary },
          ]}
          accessible={false}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
          numberOfLines={1}
        >
          {medication.name}
        </Text>
        <Text
          style={[styles.dosage, { color: colors.textSecondary, fontSize: Typography.large.fontSize * textScale }]}
        >
          {medication.dosage} {medication.unit} — {medication.colorLabel || medication.color} {medication.shape}
        </Text>
        {medication.instructions ? (
          <Text
            style={[styles.instructions, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}
            numberOfLines={2}
          >
            {medication.instructions}
          </Text>
        ) : null}
        {nextReminderTime ? (
          <Text style={[styles.nextTime, { color: colors.primary, fontSize: Typography.body.fontSize * textScale }]}>
            Next: {formatTimeFromHHMM(nextReminderTime)}
          </Text>
        ) : null}
      </View>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    ...Shadows.card,
  },
  colorDot: {
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
  },
  name: {
    ...Typography.heading,
    marginBottom: 4,
  },
  dosage: {
    ...Typography.large,
    marginBottom: 4,
  },
  instructions: {
    ...Typography.body,
    marginBottom: 4,
    lineHeight: 24,
  },
  nextTime: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: 4,
  },
  rightAction: {
    marginLeft: Spacing.sm,
  },
});
