import React from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { clearAlertQueue } from '../../../store/slices/familySlice';
import { AlertEvent } from '../../../types';
import AdBanner from '../../../components/AdBanner';
import BigButton from '../../../components/BigButton';
import EmptyState from '../../../components/EmptyState';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { formatDate, formatTime } from '../../../utils/dateHelpers';

const URGENCY_EMOJI: Record<AlertEvent['urgency'], string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

export default function AlertHistoryScreen() {
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();

  const alertQueue = useAppSelector((s) => s.family.alertQueue);
  const alertHistory = useAppSelector((s) => s.family.alertHistory);
  const medications = useAppSelector((s) => s.medications.items);
  const members = useAppSelector((s) => s.family.members);

  const allAlerts = [...alertQueue, ...alertHistory].sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
  );

  const urgencyLabel: Record<AlertEvent['urgency'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  const urgencyColor: Record<AlertEvent['urgency'], string> = {
    low: colors.urgencyLow,
    medium: colors.urgencyMedium,
    high: colors.urgencyHigh,
    critical: colors.urgencyCritical,
  };

  if (allAlerts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          emoji="✅"
          title="No missed doses"
          subtitle="All medications have been taken on time. Keep up the great work!"
        />
        <AdBanner screenName="AlertHistory" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={allAlerts}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          alertQueue.length > 0 ? (
            <View style={[styles.pendingBanner, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.pendingText, { color: colors.warning, fontSize: Typography.body.fontSize * textScale }]}>
                {alertQueue.length} pending alert{alertQueue.length !== 1 ? 's' : ''}
              </Text>
              <BigButton
                label="Clear All"
                onPress={() => dispatch(clearAlertQueue())}
                variant="secondary"
                size="normal"
                style={styles.clearBtn}
                accessibilityHint="Double-tap to clear all pending alerts"
              />
            </View>
          ) : null
        }
        renderItem={({ item: alert }) => {
          const member = members[alert.familyMemberId];
          const medication = medications[alert.medicationId];
          return (
            <View
              accessible={true}
              accessibilityLabel={`${urgencyLabel[alert.urgency]} urgency alert for ${medication?.name ?? 'medication'}, ${alert.minutesPastDue} minutes past due, ${formatDate(alert.triggeredAt)}`}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: urgencyColor[alert.urgency], shadowColor: colors.cardShadow }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.urgencyEmoji} accessible={false}>
                  {URGENCY_EMOJI[alert.urgency]}
                </Text>
                <View style={styles.headerText}>
                  <Text style={[styles.medicationName, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
                    {medication?.name ?? alert.medicationName}
                  </Text>
                  <Text style={[styles.urgencyLabel, { color: urgencyColor[alert.urgency], fontSize: Typography.label.fontSize * textScale }]}>
                    {urgencyLabel[alert.urgency]} urgency — {alert.minutesPastDue} min past due
                  </Text>
                </View>
                {!alert.delivered && (
                  <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} accessible={false} />
                )}
              </View>
              <Text style={[styles.message, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                {alert.message}
              </Text>
              {member && (
                <Text style={[styles.member, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
                  Notified: {member.name} ({member.relationship})
                </Text>
              )}
              <Text style={[styles.time, { color: colors.textDisabled, fontSize: Typography.caption.fontSize * textScale }]}>
                {formatDate(alert.triggeredAt)} at {formatTime(alert.triggeredAt)}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={<AdBanner screenName="AlertHistory" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.md, paddingBottom: Spacing.xl },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Layout.inputBorderRadius,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pendingText: { flex: 1, ...Typography.body, fontWeight: '600' },
  clearBtn: { paddingHorizontal: Spacing.sm },
  card: {
    borderRadius: Layout.cardBorderRadius,
    borderLeftWidth: 4,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xs },
  urgencyEmoji: { fontSize: 24, marginRight: Spacing.sm },
  headerText: { flex: 1 },
  medicationName: { ...Typography.large, fontWeight: '700', marginBottom: 2 },
  urgencyLabel: { fontWeight: '600' },
  pendingDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  message: { ...Typography.body, marginBottom: Spacing.xs, lineHeight: 24 },
  member: { marginBottom: 4 },
  time: {},
});
