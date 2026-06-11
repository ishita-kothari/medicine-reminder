import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { Spacing, Layout } from '../theme/spacing';

const OPTIONS = [5, 10, 15] as const;
type Mins = 5 | 10 | 15;

interface SnoozeSelectorProps {
  value: Mins;
  onChange: (v: Mins) => void;
}

export default function SnoozeSelector({ value, onChange }: SnoozeSelectorProps) {
  const { colors, textScale, haptic } = useAccessibility();

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
      accessible={false}
    >
      {OPTIONS.map((mins) => {
        const selected = value === mins;
        return (
          <TouchableOpacity
            key={mins}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={`${mins} minutes`}
            accessibilityState={{ selected }}
            accessibilityHint={`Double-tap to set snooze to ${mins} minutes`}
            onPress={() => { onChange(mins); haptic('light'); }}
            style={[
              styles.option,
              selected && { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.optionText, { color: selected ? '#FFFFFF' : colors.text, fontSize: 16 * textScale }]}>
              {mins}
            </Text>
            <Text style={[styles.optionUnit, { color: selected ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}>
              min
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 2,
    overflow: 'hidden',
    height: 64,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    gap: 1,
  },
  optionText: {
    fontWeight: '800',
    lineHeight: 22,
  },
  optionUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
});
