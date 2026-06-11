import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { SNOOZE_OPTIONS } from '../constants/alertTiming';
import { SnoozeInterval } from '../types';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';

export type { SnoozeInterval } from '../types';

interface SnoozePickerProps {
  visible: boolean;
  onSelect: (minutes: 5 | 10 | 15) => void;
  onCancel: () => void;
}

export default function SnoozePicker({ visible, onSelect, onCancel }: SnoozePickerProps) {
  const { colors, textScale } = useAccessibility();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      accessibilityViewIsModal={true}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text
            accessible={true}
            accessibilityRole="header"
            style={[styles.title, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
          >
            Snooze for how long?
          </Text>
          {SNOOZE_OPTIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Snooze for ${minutes} minutes`}
              accessibilityHint={`Double-tap to snooze reminder for ${minutes} minutes`}
              onPress={() => onSelect(minutes)}
              style={[
                styles.option,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.optionText, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
              >
                {minutes} minutes
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel snooze"
            onPress={onCancel}
            style={[styles.cancelButton, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  option: {
    height: Layout.buttonHeightLarge,
    borderRadius: Layout.inputBorderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  optionText: {
    ...Typography.large,
    fontWeight: '600',
  },
  cancelButton: {
    height: Layout.buttonHeightNormal,
    borderRadius: Layout.inputBorderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  cancelText: {
    ...Typography.body,
  },
});
