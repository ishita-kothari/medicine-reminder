import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useAccessibility } from '../hooks/useAccessibility';
import { Spacing, Layout } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  label?: string;
}

/** Returns true if the string is a valid HH:mm value (00:00 – 23:59) */
export function isValidHHMM(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return (h ?? -1) >= 0 && (h ?? 24) <= 23 && (m ?? -1) >= 0 && (m ?? 60) <= 59;
}

/** Parses HH:mm → Date, falling back to 08:00 for corrupted strings */
function hhMmToDate(hhMm: string): Date {
  const safe = isValidHHMM(hhMm) ? hhMm : '08:00';
  const [h, m] = safe.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 8, m ?? 0, 0, 0);
  return d;
}

function dateToHhMm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function format12h(hhMm: string): string {
  const [h, m] = hhMm.split(':').map(Number);
  const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM';
  const hour = (h ?? 0) % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
}

export default function TimePicker({ value, onChange, label = 'Time' }: TimePickerProps) {
  const { colors, textScale } = useAccessibility();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(hhMmToDate(value));

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selected) onChange(dateToHhMm(selected));
    } else if (selected) {
      setTempDate(selected);
    }
  };

  const handleConfirm = () => {
    onChange(dateToHhMm(tempDate));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(hhMmToDate(value)); // reset
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}, currently set to ${format12h(value)}`}
        accessibilityHint="Double-tap to change the time"
        onPress={() => {
          setTempDate(hhMmToDate(value));
          setShowPicker(true);
        }}
        style={[styles.displayBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Text style={styles.clockIcon} accessible={false}>🕐</Text>
        <Text style={[styles.timeText, { color: colors.text, fontSize: Typography.heading.fontSize * textScale }]}>
          {format12h(value)}
        </Text>
        <Text style={[styles.tapHint, { color: colors.textSecondary, fontSize: Typography.label.fontSize * textScale }]}>
          Tap to change
        </Text>
      </TouchableOpacity>

      {/* Android: picker shows inline when showPicker=true */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* iOS: show in a modal with confirm/cancel */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
          accessibilityViewIsModal
        >
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Pick a time</Text>
                <TouchableOpacity
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Confirm selected time"
                  onPress={handleConfirm}
                >
                  <Text style={[styles.confirm, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleChange}
                style={styles.spinner}
                textColor={colors.text}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  displayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: Layout.cardBorderRadius,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minHeight: Layout.buttonHeightLarge,
  },
  clockIcon: { fontSize: 28 },
  timeText: {
    ...Typography.heading,
    fontWeight: '800',
    flex: 1,
  },
  tapHint: {},
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancel: {
    fontSize: 17,
    padding: 4,
  },
  confirm: {
    fontSize: 17,
    fontWeight: '700',
    padding: 4,
  },
  spinner: {
    height: 200,
  },
});
