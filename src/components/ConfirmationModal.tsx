import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import BigButton from './BigButton';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  dangerous = false,
}: ConfirmationModalProps) {
  const { colors, textScale } = useAccessibility();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal={true}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text
            accessible={true}
            accessibilityRole="header"
            style={[styles.title, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
          >
            {title}
          </Text>
          <Text
            style={[styles.message, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}
          >
            {message}
          </Text>
          <View style={styles.buttons}>
            <BigButton
              label={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
              accessibilityHint="Double-tap to cancel"
            />
            <BigButton
              label={confirmLabel}
              onPress={onConfirm}
              variant={dangerous ? 'danger' : 'primary'}
              style={styles.button}
              accessibilityHint="Double-tap to confirm"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: Layout.cardBorderRadius,
    padding: Spacing.lg,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  title: {
    ...Typography.heading,
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    marginBottom: Spacing.lg,
    lineHeight: 26,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
  },
});
