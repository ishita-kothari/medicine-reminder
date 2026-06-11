import React, { useState } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { deleteFamilyMember } from '../../../store/slices/familySlice';
import { FamilyStackParamList, FamilyMember } from '../../../types';
import BigButton from '../../../components/BigButton';
import EmptyState from '../../../components/EmptyState';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';

type Nav = StackNavigationProp<FamilyStackParamList>;

export default function FamilyListScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const memberIds = useAppSelector((s) => s.family.order);
  const members = useAppSelector((s) => s.family.members);

  const handleDelete = () => {
    if (confirmDeleteId) {
      dispatch(deleteFamilyMember(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  if (memberIds.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          emoji="👥"
          title="No caregivers yet"
          subtitle="Add a family member or caregiver to receive alerts if you miss a dose."
          actionLabel="Add Caregiver"
          onAction={() => navigation.navigate('AddFamilyMember')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={memberIds}
        keyExtractor={(id) => id}
        removeClippedSubviews={false}
        contentContainerStyle={styles.list}
        renderItem={({ item: id }) => {
          const member = members[id]!;
          return (
            <View
              accessible={true}
              accessibilityLabel={`${member.name}, ${member.relationship}${member.isPrimary ? ', primary caregiver' : ''}`}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.cardShadow }]}
            >
              <View style={styles.cardTop}>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
                      {member.name}
                    </Text>
                    {member.isPrimary && (
                      <View style={[styles.primaryBadge, { backgroundColor: colors.primaryLight + '30' }]}>
                        <Text style={[styles.primaryText, { color: colors.primary }]}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.relationship, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                    {member.relationship}
                  </Text>
                  {member.phone ? (
                    <Text style={[styles.contact, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
                      📞 {member.phone}
                    </Text>
                  ) : null}
                  {member.email ? (
                    <Text style={[styles.contact, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
                      ✉️ {member.email}
                    </Text>
                  ) : null}
                  {!member.receiveAlerts && (
                    <Text style={[styles.alertsOff, { color: colors.warning }]}>Alerts turned off</Text>
                  )}
                </View>
              </View>

              <View style={styles.actions}>
                {member.phone ? (
                  <BigButton
                    label="Call"
                    onPress={() => Linking.openURL(`tel:${member.phone}`)}
                    variant="primary"
                    size="normal"
                    style={styles.actionBtn}
                    accessibilityHint={`Double-tap to call ${member.name}`}
                  />
                ) : null}
                {member.phone ? (
                  <BigButton
                    label="SMS"
                    onPress={() => Linking.openURL(`sms:${member.phone}?body=Checking+on+you`)}
                    variant="secondary"
                    size="normal"
                    style={styles.actionBtn}
                    accessibilityHint={`Double-tap to send a text message to ${member.name}`}
                  />
                ) : null}
                <BigButton
                  label="Edit"
                  onPress={() => navigation.navigate('EditFamilyMember', { memberId: id })}
                  variant="secondary"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Double-tap to edit ${member.name}'s information`}
                />
                <BigButton
                  label="Remove"
                  onPress={() => setConfirmDeleteId(id)}
                  variant="danger"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Double-tap to remove ${member.name}`}
                />
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.fab, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label="📋  View Alert History"
          onPress={() => navigation.navigate('AlertHistory')}
          variant="secondary"
          size="normal"
          accessibilityHint="Double-tap to view missed-dose alert history"
        />
        <BigButton
          label="+ Add Caregiver"
          onPress={() => navigation.navigate('AddFamilyMember')}
          variant="primary"
          size="large"
          accessibilityHint="Double-tap to add a new caregiver"
        />
      </View>

      <ConfirmationModal
        visible={!!confirmDeleteId}
        title="Remove Caregiver?"
        message={`Remove ${confirmDeleteId ? members[confirmDeleteId]?.name ?? 'this person' : 'this person'}? They will no longer receive alerts.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardTop: { marginBottom: Spacing.sm },
  info: {},
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  name: { ...Typography.heading },
  primaryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  primaryText: { fontSize: 12, fontWeight: '700' },
  relationship: { ...Typography.body, marginBottom: 4 },
  contact: { marginBottom: 2 },
  alertsOff: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  actionBtn: { minWidth: 70, paddingHorizontal: Spacing.sm },
  fab: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
