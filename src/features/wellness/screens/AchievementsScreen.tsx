import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { AchievementId } from '../../../types';
import { formatDate } from '../../../utils/dateHelpers';

export default function AchievementsScreen() {
  const { colors, textScale } = useAccessibility();
  const badges = useAppSelector((s) => s.achievements.badges);
  const totalDoses = useAppSelector((s) => s.achievements.totalDosesTaken);
  const currentStreak = useAppSelector((s) => s.achievements.currentStreak);
  const longestStreak = useAppSelector((s) => s.achievements.longestStreak);

  const unlockedCount = Object.values(badges).filter((b) => b.unlockedAt !== null).length;
  const totalCount = Object.keys(badges).length;

  const orderedBadges = (Object.keys(badges) as AchievementId[]).sort((a, b) => {
    const ua = badges[a].unlockedAt;
    const ub = badges[b].unlockedAt;
    if (ua && !ub) return -1;
    if (!ua && ub) return 1;
    if (ua && ub) return ub.localeCompare(ua);
    return 0;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats summary */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total Doses', value: String(totalDoses), icon: '💊' },
          { label: 'Current Streak', value: `${currentStreak}d`, icon: '🔥' },
          { label: 'Best Streak', value: `${longestStreak}d`, icon: '🏆' },
        ].map((s) => (
          <View
            key={s.label}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: colors.primary, fontSize: Typography.heading.fontSize * textScale }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.progressTitle, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}>
          Badges Earned: {unlockedCount} / {totalCount}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.round((unlockedCount / totalCount) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Badge grid */}
      <Text
        accessible
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
      >
        Badge Collection
      </Text>

      <View style={styles.badgeGrid}>
        {orderedBadges.map((id) => {
          const badge = badges[id];
          const unlocked = badge.unlockedAt !== null;
          return (
            <View
              key={id}
              accessible
              accessibilityLabel={`${badge.title}${unlocked ? ', earned' : ', not yet earned'}. ${badge.description}`}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: unlocked ? colors.surface : colors.surfaceVariant,
                  borderColor: unlocked ? colors.primary : colors.border,
                  opacity: unlocked ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[styles.badgeEmoji, { opacity: unlocked ? 1 : 0.4 }]}>
                {unlocked ? badge.emoji : '🔒'}
              </Text>
              <Text
                style={[
                  styles.badgeTitle,
                  { color: unlocked ? colors.text : colors.textDisabled, fontSize: Typography.label.fontSize * textScale },
                ]}
                numberOfLines={1}
              >
                {badge.title}
              </Text>
              <Text
                style={[styles.badgeDesc, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {badge.description}
              </Text>
              {unlocked && badge.unlockedAt ? (
                <Text style={[styles.badgeDate, { color: colors.primary }]}>
                  {formatDate(badge.unlockedAt)}
                </Text>
              ) : (
                <Text style={[styles.badgeLocked, { color: colors.textDisabled }]}>Locked</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    ...Shadows.card,
  },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  progressCard: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressTitle: { fontWeight: '600', marginBottom: Spacing.sm },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },

  sectionTitle: { fontWeight: '700', marginBottom: Spacing.md },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badgeCard: {
    width: '47%',
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 2,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  badgeEmoji: { fontSize: 40, marginBottom: Spacing.xs },
  badgeTitle: { fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16, marginBottom: 6 },
  badgeDate: { fontSize: 11, fontWeight: '600' },
  badgeLocked: { fontSize: 11 },
});
