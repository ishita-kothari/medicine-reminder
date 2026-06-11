import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { getDayName } from '../utils/dateHelpers';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface DaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export default function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const { colors, textScale } = useAccessibility();

  const toggle = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort());
    }
  };

  const selectAll = () => onChange([...ALL_DAYS]);
  const clearAll = () => onChange([]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          Repeat on
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Select every day"
            onPress={selectAll}
          >
            <Text style={[styles.action, { color: colors.primary, fontSize: Typography.label.fontSize * textScale }]}>
              Every day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all days"
            onPress={clearAll}
          >
            <Text style={[styles.action, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.days}>
        {ALL_DAYS.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              accessible={true}
              accessibilityRole="checkbox"
              accessibilityLabel={`${getDayName(day)}, ${isSelected ? 'selected' : 'not selected'}`}
              accessibilityHint="Double-tap to toggle this day"
              accessibilityState={{ checked: isSelected }}
              onPress={() => toggle(day)}
              style={[
                styles.dayButton,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontSize: Typography.label.fontSize * textScale,
                  },
                ]}
              >
                {getDayName(day)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
  },
  action: {
    ...Typography.label,
    fontWeight: '600',
  },
  days: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  dayButton: {
    minWidth: Layout.minTouchTarget,
    minHeight: Layout.minTouchTarget,
    borderRadius: Layout.minTouchTarget / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  dayText: {
    ...Typography.label,
    fontWeight: '700',
  },
});
