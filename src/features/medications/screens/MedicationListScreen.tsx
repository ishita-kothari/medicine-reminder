import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { deleteMedication } from '../../../store/slices/medicationsSlice';
import { MedicationsStackParamList } from '../../../types';
import BigButton from '../../../components/BigButton';
import EmptyState from '../../../components/EmptyState';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { formatTimeFromHHMM } from '../../../utils/dateHelpers';

type Nav = StackNavigationProp<MedicationsStackParamList>;

type SortOrder = 'name' | 'time' | 'added';

const FORM_TYPE_ICON: Record<string, string> = {
  tablet: '⬜', capsule: '💊', liquid: '🧴', drop: '💧',
  injection: '💉', inhaler: '🌬️', patch: '🩹', powder: '🫙',
  cream: '🧴', other: '📦', undefined: '💊',
};

export default function MedicationListScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale } = useAccessibility();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('added');

  const medicationIds = useAppSelector((s) => s.medications.order);
  const medications = useAppSelector((s) => s.medications.items);
  const allReminders = useAppSelector((s) => s.reminders.reminders);

  const getReminderCount = (medId: string) =>
    Object.values(allReminders).filter((r) => r.medicationId === medId && r.isActive).length;

  const getNextReminderTime = (medId: string): string | undefined => {
    const times = Object.values(allReminders)
      .filter((r) => r.medicationId === medId && r.isActive)
      .flatMap((r) => r.scheduledTimes ?? [])
      .sort();
    return times[0];
  };

  // Search + sort
  const filteredIds = useMemo(() => {
    let ids = [...medicationIds];
    if (search.trim()) {
      const q = search.toLowerCase();
      ids = ids.filter((id) => {
        const m = medications[id];
        return (
          m?.name.toLowerCase().includes(q) ||
          m?.medicineType?.toLowerCase().includes(q) ||
          m?.dosage?.toLowerCase().includes(q)
        );
      });
    }
    if (sortOrder === 'name') {
      ids.sort((a, b) =>
        (medications[a]?.name ?? '').localeCompare(medications[b]?.name ?? '')
      );
    } else if (sortOrder === 'time') {
      ids.sort((a, b) => {
        const ta = getNextReminderTime(a) ?? '99:99';
        const tb = getNextReminderTime(b) ?? '99:99';
        return ta.localeCompare(tb);
      });
    }
    // 'added' keeps insertion order (medicationIds order)
    return ids;
  }, [medicationIds, medications, search, sortOrder]);

  const handleDelete = () => {
    if (confirmDeleteId) {
      dispatch(deleteMedication(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  if (medicationIds.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          emoji="💊"
          title="No medicines yet"
          subtitle="Add your first medication to get started with reminders."
          actionLabel="Add Medicine"
          onAction={() => navigation.navigate('AddMedication')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.searchIcon} accessible={false}>🔍</Text>
        <TextInput
          accessible
          accessibilityLabel="Search medicines"
          accessibilityHint="Type to filter your medicine list"
          placeholder="Search by name or type..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.text, fontSize: Typography.body.fontSize * textScale }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort:</Text>
        {(['added', 'name', 'time'] as SortOrder[]).map((s) => (
          <TouchableOpacity
            key={s}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={`Sort by ${s}`}
            accessibilityState={{ selected: sortOrder === s }}
            onPress={() => setSortOrder(s)}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortOrder === s ? colors.primary : colors.surfaceVariant,
                borderColor: sortOrder === s ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.sortChipText, { color: sortOrder === s ? '#FFF' : colors.text }]}>
              {s === 'added' ? 'Recent' : s === 'name' ? 'A–Z' : 'Next dose'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredIds}
        keyExtractor={(id) => id}
        removeClippedSubviews={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.noResults, { color: colors.textSecondary }]}>
            No medicines match "{search}"
          </Text>
        }
        renderItem={({ item: id }) => {
          const med = medications[id];
          if (!med) return null;
          const reminderCount = getReminderCount(id);
          const nextTime = getNextReminderTime(id);
          const hasReminders = reminderCount > 0;
          const lowPills = med.pillCount > 0 && med.pillCount <= med.refillAt;

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: lowPills ? colors.warning : colors.border,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              {/* Low pill warning banner */}
              {lowPills && (
                <View style={[styles.refillBanner, { backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.refillText, { color: colors.warning }]}>
                    ⚠️ Only {med.pillCount} pill{med.pillCount !== 1 ? 's' : ''} left — time to refill
                  </Text>
                </View>
              )}

              {/* Top row: icon + name + dosage */}
              <View style={styles.cardTop}>
                <View style={[styles.colorBadge, { backgroundColor: med.color }]}>
                  <Text style={styles.formIcon} accessible={false}>
                    {FORM_TYPE_ICON[med.medicineType] ?? '💊'}
                  </Text>
                </View>
                <View style={styles.medInfo}>
                  <Text
                    accessible
                    style={[styles.medName, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}
                    numberOfLines={1}
                  >
                    {med.name}
                  </Text>
                  <Text style={[styles.medDose, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                    {med.dosage} {med.unit} · {med.medicineType}
                  </Text>
                  {med.pillCount > 0 && (
                    <Text style={[styles.pillCount, { color: lowPills ? colors.warning : colors.textSecondary }]}>
                      💊 {med.pillCount} remaining
                    </Text>
                  )}
                </View>
              </View>

              {/* Reminder status row */}
              <TouchableOpacity
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  hasReminders
                    ? `${reminderCount} reminder${reminderCount > 1 ? 's' : ''} set. Next at ${nextTime ? formatTimeFromHHMM(nextTime) : 'unknown'}. Tap to manage.`
                    : 'No reminders set. Tap to add one.'
                }
                onPress={() => navigation.navigate('ReminderList', { medicationId: id })}
                style={[
                  styles.reminderRow,
                  {
                    backgroundColor: hasReminders ? colors.primaryLight + '18' : colors.warningLight,
                    borderColor: hasReminders ? colors.primaryLight : colors.warning,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.reminderIcon} accessible={false}>
                  {hasReminders ? '🔔' : '🔕'}
                </Text>
                <View style={styles.reminderText}>
                  {hasReminders ? (
                    <>
                      <Text style={[styles.reminderOn, { color: colors.primary, fontSize: Typography.label.fontSize * textScale }]}>
                        {reminderCount} reminder{reminderCount > 1 ? 's' : ''} active
                      </Text>
                      {nextTime && (
                        <Text style={[styles.reminderNext, { color: colors.textSecondary, fontSize: Typography.label.fontSize }]}>
                          Next: {formatTimeFromHHMM(nextTime)}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.reminderOff, { color: colors.warning, fontSize: Typography.label.fontSize * textScale }]}>
                      No reminder — tap to add one
                    </Text>
                  )}
                </View>
                <Text style={[styles.chevron, { color: hasReminders ? colors.primary : colors.warning }]}>›</Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actions}>
                {!hasReminders && (
                  <BigButton
                    label="+ Reminder"
                    onPress={() => navigation.navigate('AddReminder', { medicationId: id })}
                    variant="primary"
                    size="normal"
                    style={styles.actionBtn}
                    accessibilityHint={`Add a reminder for ${med.name}`}
                  />
                )}
                <BigButton
                  label="Edit"
                  onPress={() => navigation.navigate('EditMedication', { medicationId: id })}
                  variant="secondary"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Edit ${med.name}`}
                />
                <BigButton
                  label="Delete"
                  onPress={() => setConfirmDeleteId(id)}
                  variant="danger"
                  size="normal"
                  style={styles.actionBtn}
                  accessibilityHint={`Delete ${med.name}`}
                />
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.fab, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <BigButton
          label="+ Add Medicine"
          onPress={() => navigation.navigate('AddMedication')}
          variant="primary"
          size="large"
          accessibilityHint="Add a new medication"
        />
      </View>

      <ConfirmationModal
        visible={!!confirmDeleteId}
        title="Delete Medicine?"
        message={`Are you sure you want to delete ${confirmDeleteId ? (medications[confirmDeleteId]?.name ?? 'this medicine') : 'this medicine'}? All reminders will also be removed.`}
        confirmLabel="Delete"
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderRadius: Layout.inputBorderRadius,
    paddingHorizontal: Spacing.sm,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: Spacing.xs },
  searchInput: { flex: 1, height: 52 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  sortLabel: { fontSize: 13, fontWeight: '600' },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortChipText: { fontSize: 13, fontWeight: '600' },
  list: { paddingTop: Spacing.xs, paddingBottom: 110, paddingHorizontal: Spacing.md },
  noResults: { textAlign: 'center', marginTop: Spacing.xl, fontSize: 16 },

  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  refillBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  refillText: { fontSize: 13, fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  colorBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  formIcon: { fontSize: 24 },
  medInfo: { flex: 1 },
  medName: { fontWeight: '700', marginBottom: 2 },
  medDose: { marginBottom: 2 },
  pillCount: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderTopWidth: 1, borderBottomWidth: 1, gap: Spacing.sm, minHeight: 52,
  },
  reminderIcon: { fontSize: 20 },
  reminderText: { flex: 1 },
  reminderOn: { fontWeight: '700' },
  reminderNext: {},
  reminderOff: { fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '300' },
  actions: { flexDirection: 'row', gap: Spacing.xs, padding: Spacing.sm, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: 80 },
  fab: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, borderTopWidth: 1 },
});
