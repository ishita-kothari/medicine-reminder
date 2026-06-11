import {
  format,
  parseISO,
  isToday,
  addMinutes,
  differenceInMinutes,
  setHours,
  setMinutes,
  setSeconds,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), 'h:mm a');
}

export function formatTimeFromHHMM(hhMM: string): string {
  const [hours, minutes] = hhMM.split(':').map(Number);
  const d = setSeconds(setMinutes(setHours(new Date(), hours), minutes), 0);
  return format(d, 'h:mm a');
}

export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'MMMM d, yyyy');
}

export function formatDateShort(isoString: string): string {
  return format(parseISO(isoString), 'MMM d');
}

export function minutesSince(isoString: string): number {
  return differenceInMinutes(new Date(), parseISO(isoString));
}

export function addMinutesToISO(isoString: string, minutes: number): string {
  return addMinutes(parseISO(isoString), minutes).toISOString();
}

export function isTodayISO(isoString: string): boolean {
  return isToday(parseISO(isoString));
}

export function getNextOccurrenceForTime(scheduledTime: string, daysOfWeek: number[]): Date {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const now = new Date();
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(hours!, minutes!, 0, 0);
    const dayOfWeek = candidate.getDay();
    if (daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek)) {
      if (isAfter(candidate, now)) return candidate;
    }
  }
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hours!, minutes!, 0, 0);
  return fallback;
}

/** Returns the closest upcoming occurrence across all time slots */
export function getNextOccurrence(scheduledTimes: string | string[], daysOfWeek: number[]): Date {
  const times = Array.isArray(scheduledTimes) ? scheduledTimes : [scheduledTimes];
  const candidates = times.map((t) => getNextOccurrenceForTime(t, daysOfWeek));
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0]!;
}

/** Which time slot among scheduledTimes is next, and when */
export function getNextSlot(
  scheduledTimes: string[],
  daysOfWeek: number[]
): { timeSlot: string; date: Date } {
  const times = scheduledTimes.length > 0 ? scheduledTimes : ['08:00'];
  const pairs = times.map((t) => ({
    timeSlot: t,
    date: getNextOccurrenceForTime(t, daysOfWeek),
  }));
  return pairs.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? {
    timeSlot: '08:00',
    date: getNextOccurrenceForTime('08:00', daysOfWeek),
  };
}

export function getTodaysScheduledISO(scheduledTime: string): string {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
}

export function secondsUntil(targetISO: string): number {
  return Math.max(0, Math.floor((parseISO(targetISO).getTime() - Date.now()) / 1000));
}

export function isOverdue(scheduledAtISO: string): boolean {
  return isBefore(parseISO(scheduledAtISO), new Date());
}

export function todayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getDayName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] ?? '';
}

export function getFullDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] ?? '';
}

export function formatDaysOfWeek(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 0 || daysOfWeek.length === 7) return 'Every day';
  if (daysOfWeek.length === 1) return getFullDayName(daysOfWeek[0]!);
  return daysOfWeek.map(getDayName).join(', ');
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
