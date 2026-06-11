import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { recordMood } from '../../../store/slices/wellnessSlice';
import { addAlertEvent } from '../../../store/slices/familySlice';
import { WellnessStackParamList, MoodType } from '../../../types';
import BigButton from '../../../components/BigButton';
import { Spacing, Layout, Shadows } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { todayDateString, formatDate, nowISO } from '../../../utils/dateHelpers';
import { generateId } from '../../../utils/idGenerator';

type Nav = StackNavigationProp<WellnessStackParamList>;

const MOODS: { value: MoodType; emoji: string; label: string; color: string }[] = [
  { value: 'good',     emoji: '😊', label: 'Good',     color: '#2E7D32' },
  { value: 'okay',     emoji: '😐', label: 'Okay',     color: '#E65100' },
  { value: 'not_great',emoji: '😟', label: 'Not Great', color: '#C62828' },
];

const MOOD_MESSAGES: Record<MoodType, string> = {
  good:      'Wonderful! Keep taking good care of yourself. 🌟',
  okay:      'That\'s alright. Every day is different. You\'re doing great. 💙',
  not_great: 'Thank you for letting us know. Your caregivers have been notified and support is on the way. 💚',
};

export default function WellnessDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { colors, textScale, haptic, speak } = useAccessibility();

  const [showCheckin, setShowCheckin] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [showThanks, setShowThanks] = useState(false);

  const today = todayDateString();
  const entries = useAppSelector((s) => s.wellness.entries);
  const lastCheckinDate = useAppSelector((s) => s.wellness.lastCheckinDate);
  const familyMembers = useAppSelector((s) => s.family.members);
  const todayEntry = entries[today];
  const alreadyCheckedIn = lastCheckinDate === today;

  const recentEntries = Object.values(entries)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  const handleSubmitMood = () => {
    if (!selectedMood) return;
    haptic('medium');

    dispatch(recordMood({ mood: selectedMood, note: note.trim() || undefined }));

    // If not_great → create caregiver alert event
    if (selectedMood === 'not_great') {
      const primaryMembers = Object.values(familyMembers).filter(
        (m) => m.receiveAlerts && m.isPrimary
      );
      primaryMembers.forEach((member) => {
        dispatch(
          addAlertEvent({
            id: generateId(),
            familyMemberId: member.id,
            reminderId: '',
            medicationId: '',
            medicationName: '',
            scheduledAt: nowISO(),
            triggeredAt: nowISO(),
            urgency: 'medium',
            minutesPastDue: 0,
            channel: 'local',
            delivered: false,
            deliveredAt: null,
            message: `Wellness check-in: ${member.name.split(' ')[0]} reported not feeling great today. Please check in with them.`,
          })
        );
      });
    }

    speak(MOOD_MESSAGES[selectedMood]);
    setShowCheckin(false);
    setShowThanks(true);
    setNote('');
    setSelectedMood(null);
  };

  const moodEmoji = (m: MoodType) => MOODS.find((x) => x.value === m)?.emoji ?? '😐';
  const moodLabel = (m: MoodType) => MOODS.find((x) => x.value === m)?.label ?? 'Okay';
  const moodColor = (m: MoodType) => MOODS.find((x) => x.value === m)?.color ?? colors.text;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Today's check-in */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessible accessibilityRole="header" style={[styles.cardTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
          How are you feeling today?
        </Text>
        <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
          {formatDate(nowISO())}
        </Text>

        {alreadyCheckedIn && todayEntry ? (
          <View style={styles.checkedInRow}>
            <Text style={styles.checkedInEmoji}>{moodEmoji(todayEntry.mood)}</Text>
            <View>
              <Text style={[styles.checkedInLabel, { color: moodColor(todayEntry.mood), fontSize: Typography.large.fontSize * textScale }]}>
                {moodLabel(todayEntry.mood)}
              </Text>
              {todayEntry.note ? (
                <Text style={[styles.checkedInNote, { color: colors.textSecondary }]}>{todayEntry.note}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`I feel ${m.label}`}
                accessibilityHint={`Double-tap to record that you feel ${m.label} today`}
                onPress={() => {
                  setSelectedMood(m.value);
                  setShowCheckin(true);
                  haptic('light');
                }}
                style={[styles.moodBtn, { backgroundColor: colors.surface, borderColor: m.color, shadowColor: m.color }]}
                activeOpacity={0.75}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, { color: m.color, fontSize: Typography.body.fontSize * textScale }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Achievements shortcut */}
      <TouchableOpacity
        accessible
        accessibilityRole="button"
        accessibilityLabel="View your achievements"
        onPress={() => navigation.navigate('Achievements')}
        style={[styles.card, styles.achievementsCard, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Text style={styles.achievementsEmoji}>🏆</Text>
        <View style={styles.achievementsText}>
          <Text style={[styles.achievementsTitle, { fontSize: Typography.large.fontSize * textScale }]}>My Achievements</Text>
          <Text style={styles.achievementsSubtitle}>Badges & streaks</Text>
        </View>
        <Text style={styles.achievementsChevron}>›</Text>
      </TouchableOpacity>

      {/* 14-day mood history */}
      {recentEntries.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessible accessibilityRole="header" style={[styles.cardTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
            Recent Mood History
          </Text>
          <View style={styles.historyGrid}>
            {recentEntries.map((entry) => (
              <View
                key={entry.date}
                accessible
                accessibilityLabel={`${entry.date}: ${moodLabel(entry.mood)}`}
                style={styles.historyItem}
              >
                <Text style={styles.historyEmoji}>{moodEmoji(entry.mood)}</Text>
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {entry.date.slice(5)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Check-in modal */}
      <Modal
        visible={showCheckin}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckin(false)}
        accessibilityViewIsModal
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {selectedMood && (
              <>
                <Text style={styles.sheetEmoji}>{moodEmoji(selectedMood)}</Text>
                <Text accessible accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
                  Feeling {moodLabel(selectedMood)}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
                  Want to add a note? (optional)
                </Text>
                <TextInput
                  accessible
                  accessibilityLabel="Optional note about how you're feeling"
                  placeholder="I'm feeling this way because..."
                  placeholderTextColor={colors.textDisabled}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.noteInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceVariant, fontSize: Typography.body.fontSize * textScale },
                  ]}
                />
                {selectedMood === 'not_great' && (
                  <View style={[styles.alertInfo, { backgroundColor: colors.errorLight }]}>
                    <Text style={[styles.alertInfoText, { color: colors.error }]}>
                      Your caregivers will be gently notified that you're not feeling great.
                    </Text>
                  </View>
                )}
                <View style={styles.sheetButtons}>
                  <BigButton
                    label="Cancel"
                    onPress={() => setShowCheckin(false)}
                    variant="secondary"
                    style={styles.sheetBtn}
                    accessibilityHint="Double-tap to cancel"
                  />
                  <BigButton
                    label="Save Check-in"
                    onPress={handleSubmitMood}
                    variant="primary"
                    style={styles.sheetBtn}
                    accessibilityHint="Double-tap to save your mood check-in"
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Thank you modal */}
      <Modal
        visible={showThanks}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThanks(false)}
        accessibilityViewIsModal
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.thanksCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.thanksEmoji}>💚</Text>
            <Text accessible accessibilityRole="header" style={[styles.thanksTitle, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
              Thank you!
            </Text>
            <Text style={[styles.thanksMsg, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
              {todayEntry ? MOOD_MESSAGES[todayEntry.mood] : 'Mood recorded.'}
            </Text>
            <BigButton
              label="Done"
              onPress={() => setShowThanks(false)}
              variant="primary"
              size="large"
              style={{ marginTop: Spacing.md }}
              accessibilityHint="Double-tap to close"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  card: {
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardTitle: { fontWeight: '700', marginBottom: 4 },
  cardDate: { fontSize: 13, marginBottom: Spacing.md },

  moodRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 2,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  moodEmoji: { fontSize: 40 },
  moodLabel: { fontWeight: '700' },

  checkedInRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkedInEmoji: { fontSize: 48 },
  checkedInLabel: { fontWeight: '800' },
  checkedInNote: { fontSize: 14, marginTop: 4 },

  achievementsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 0,
  },
  achievementsEmoji: { fontSize: 36 },
  achievementsText: { flex: 1 },
  achievementsTitle: { color: '#FFF', fontWeight: '800' },
  achievementsSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  achievementsChevron: { color: '#FFF', fontSize: 28, fontWeight: '300' },

  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  historyItem: { alignItems: 'center', width: 40 },
  historyEmoji: { fontSize: 22 },
  historyDate: { fontSize: 10, marginTop: 2 },

  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
  },
  sheetEmoji: { fontSize: 56, marginBottom: Spacing.sm },
  sheetTitle: { fontWeight: '800', textAlign: 'center', marginBottom: Spacing.xs },
  sheetSubtitle: { textAlign: 'center', marginBottom: Spacing.md },
  noteInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  alertInfo: {
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    width: '100%',
  },
  alertInfoText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sheetButtons: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  sheetBtn: { flex: 1 },

  // Thanks
  thanksCard: {
    margin: Spacing.lg,
    borderRadius: Layout.cardBorderRadius,
    padding: Spacing.xl,
    alignItems: 'center',
    elevation: 8,
  },
  thanksEmoji: { fontSize: 64, marginBottom: Spacing.md },
  thanksTitle: { fontWeight: '800', textAlign: 'center', marginBottom: Spacing.sm },
  thanksMsg: { textAlign: 'center', lineHeight: 26 },
});
