/**
 * Uses Reanimated 4 API (useSharedValue + useAnimatedStyle) instead of
 * React Native's legacy Animated — the old API breaks with Reanimated 4
 * because Animated.parallel().start() returns undefined (not a function).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAccessibility } from '../hooks/useAccessibility';
import { clearNewlyUnlocked } from '../store/slices/achievementsSlice';
import BigButton from './BigButton';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';

export default function AchievementCelebration() {
  const dispatch = useAppDispatch();
  const { colors, textScale, speak, haptic } = useAccessibility();
  const newlyUnlocked = useAppSelector((s) => s.achievements.newlyUnlocked);
  const badges = useAppSelector((s) => s.achievements.badges);

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  const firstNew = newlyUnlocked[0] ? badges[newlyUnlocked[0]] : null;
  const visible = !!firstNew;

  useEffect(() => {
    if (visible && firstNew) {
      haptic('heavy');
      speak(`Achievement unlocked! ${firstNew.title}. ${firstNew.description}`);
      scale.value = withSpring(1, { damping: 14, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      scale.value = 0.5;
      opacity.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!firstNew) return null;

  return (
    <Modal visible={visible} transparent animationType="none" accessibilityViewIsModal>
      <Animated.View style={[styles.overlay, overlayStyle, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[styles.card, cardStyle, { backgroundColor: colors.surface }]}>
          <Text style={styles.stars} accessible={false}>✨ ✨ ✨</Text>
          <Text style={styles.badgeEmoji}>{firstNew.emoji}</Text>
          <Text style={styles.unlockLabel} accessible={false}>Achievement Unlocked!</Text>
          <Text
            accessible
            accessibilityRole="header"
            style={[styles.badgeTitle, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}
          >
            {firstNew.title}
          </Text>
          <Text style={[styles.badgeDesc, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
            {firstNew.description}
          </Text>
          <BigButton
            label="Awesome! 🎉"
            onPress={() => dispatch(clearNewlyUnlocked())}
            variant="primary"
            size="large"
            style={styles.button}
            accessibilityHint="Double-tap to close this achievement notification"
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: Layout.cardBorderRadius,
    padding: Spacing.xl,
    alignItems: 'center',
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  stars: { fontSize: 28, marginBottom: Spacing.sm },
  badgeEmoji: { fontSize: 80, marginBottom: Spacing.sm },
  unlockLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#FFA500',
    marginBottom: Spacing.xs,
  },
  badgeTitle: { fontWeight: '800', textAlign: 'center', marginBottom: Spacing.xs },
  badgeDesc: { textAlign: 'center', lineHeight: 24, marginBottom: Spacing.lg },
  button: { width: '100%' },
});
