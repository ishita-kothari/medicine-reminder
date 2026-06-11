import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { Spacing } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export default function ToggleRow({ label, description, value, onChange, hint }: ToggleRowProps) {
  const { colors, textScale } = useAccessibility();

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint ?? `Double-tap to toggle ${label.toLowerCase()}`}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.row, { borderBottomColor: colors.divider }]}
      activeOpacity={0.7}
    >
      <View style={styles.textGroup}>
        <Text style={[styles.label, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
            {description}
          </Text>
        ) : null}
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
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    minHeight: 70,
  },
  textGroup: { flex: 1, paddingRight: Spacing.md },
  label: { ...Typography.body, fontWeight: '600' },
  description: { ...Typography.label, marginTop: 2, lineHeight: 20 },
});
