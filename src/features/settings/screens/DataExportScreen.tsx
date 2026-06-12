import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAccessibility } from '../../../hooks/useAccessibility';
import BigButton from '../../../components/BigButton';
import { Spacing, Layout } from '../../../theme/spacing';
import { Typography } from '../../../theme/typography';
import { formatDate, formatTime } from '../../../utils/dateHelpers';
import { ReminderEvent } from '../../../types';

export default function DataExportScreen() {
  const { colors, textScale } = useAccessibility();
  const [exporting, setExporting] = useState(false);

  const medications = useAppSelector((s) => s.medications.items);
  const allEvents = useAppSelector((s) => s.reminders.events);
  const allReminders = useAppSelector((s) => s.reminders.reminders);
  const wellnessEntries = useAppSelector((s) => s.wellness.entries);
  const user = useAppSelector((s) => s.user);
  const achievements = useAppSelector((s) => s.achievements);

  const buildCSV = (): string => {
    const lines: string[] = [];

    // Header
    lines.push('SeniorCare Companion — Dose History Export');
    lines.push(`Patient: ${user.name || 'Unknown'}`);
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push('');

    // Adherence summary
    const flat = (Object.values(allEvents) as ReminderEvent[][]).flat();
    const taken = flat.filter((e) => e.status === 'taken').length;
    const missed = flat.filter((e) => e.status === 'missed').length;
    const total = taken + missed;
    const score = total > 0 ? Math.round((taken / total) * 100) : 0;
    lines.push('=== ADHERENCE SUMMARY ===');
    lines.push(`Total Doses Taken: ${achievements.totalDosesTaken}`);
    lines.push(`Current Streak: ${achievements.currentStreak} days`);
    lines.push(`Best Streak: ${achievements.longestStreak} days`);
    lines.push(`Overall Adherence: ${score}% (${taken} taken, ${missed} missed)`);
    lines.push('');

    // Medication list
    lines.push('=== MEDICATIONS ===');
    lines.push('Name,Dosage,Unit,Type,Instructions');
    Object.values(medications).forEach((med) => {
      lines.push(`"${med.name}","${med.dosage}","${med.unit}","${med.medicineType}","${med.instructions || ''}"`);
    });
    lines.push('');

    // Dose history
    lines.push('=== DOSE HISTORY ===');
    lines.push('Date,Time,Medication,Dosage,Status,Taken At');

    const eventRows: { date: Date; line: string }[] = [];
    for (const [reminderId, events] of Object.entries(allEvents)) {
      const reminder = allReminders[reminderId];
      const medication = reminder ? medications[reminder.medicationId] : undefined;
      for (const event of (events as ReminderEvent[])) {
        const scheduled = new Date(event.scheduledAt);
        const medName = medication?.name ?? 'Unknown';
        const dosage = medication ? `${medication.dosage} ${medication.unit}` : '';
        const takenAt = event.takenAt ? formatTime(event.takenAt) : '';
        eventRows.push({
          date: scheduled,
          line: `"${formatDate(event.scheduledAt)}","${event.scheduledTimeSlot || ''}","${medName}","${dosage}","${event.status}","${takenAt}"`,
        });
      }
    }
    eventRows
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .forEach((r) => lines.push(r.line));
    lines.push('');

    // Mood history
    lines.push('=== WELLNESS CHECK-INS ===');
    lines.push('Date,Mood,Note');
    Object.values(wellnessEntries)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((entry) => {
        lines.push(`"${entry.date}","${entry.mood}","${entry.note || ''}"`);
      });

    return lines.join('\n');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = buildCSV();
      const filename = `seniorcare-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share Dose History',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        // Fallback to native Share for plain text
        await Share.share({ message: csv, title: 'SeniorCare Dose History' });
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const flat = (Object.values(allEvents) as ReminderEvent[][]).flat();
  const taken = flat.filter((e) => e.status === 'taken').length;
  const missed = flat.filter((e) => e.status === 'missed').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessible accessibilityRole="header" style={[styles.cardTitle, { color: colors.text, fontSize: Typography.large.fontSize * textScale }]}>
          What's included in the export
        </Text>
        {[
          `💊 ${Object.keys(medications).length} medication${Object.keys(medications).length !== 1 ? 's' : ''}`,
          `✅ ${taken} doses taken`,
          `❌ ${missed} doses missed`,
          `😊 ${Object.keys(wellnessEntries).length} mood check-ins`,
          `🏆 ${achievements.totalDosesTaken} total doses, ${achievements.currentStreak}-day streak`,
        ].map((line) => (
          <Text key={line} style={[styles.bulletLine, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
            {line}
          </Text>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: Typography.body.fontSize * textScale }]}>
          The CSV file can be opened in Microsoft Excel, Apple Numbers, or Google Sheets. Share it directly with your doctor or caregiver.
        </Text>
      </View>

      <BigButton
        label="📤  Export & Share CSV"
        onPress={handleExport}
        variant="primary"
        size="large"
        loading={exporting}
        accessibilityHint="Double-tap to export your full dose history as a CSV file and share it"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: { borderRadius: Layout.cardBorderRadius, borderWidth: 1, padding: Spacing.md },
  cardTitle: { fontWeight: '700', marginBottom: Spacing.sm },
  bulletLine: { lineHeight: 28 },
  hint: { lineHeight: 24 },
});
