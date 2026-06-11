import {
  formatCountdown,
  formatDaysOfWeek,
  getDayName,
  minutesSince,
  addMinutesToISO,
  isOverdue,
  formatTimeFromHHMM,
  secondsUntil,
} from '../../src/utils/dateHelpers';

describe('dateHelpers', () => {
  describe('formatCountdown', () => {
    it('formats 0 as 00:00:00', () => {
      expect(formatCountdown(0)).toBe('00:00:00');
    });
    it('formats negative as 00:00:00', () => {
      expect(formatCountdown(-5)).toBe('00:00:00');
    });
    it('formats 3661 seconds as 01:01:01', () => {
      expect(formatCountdown(3661)).toBe('01:01:01');
    });
    it('formats 90 seconds as 00:01:30', () => {
      expect(formatCountdown(90)).toBe('00:01:30');
    });
    it('formats 3600 seconds as 01:00:00', () => {
      expect(formatCountdown(3600)).toBe('01:00:00');
    });
  });

  describe('formatDaysOfWeek', () => {
    it('returns "Every day" for empty array', () => {
      expect(formatDaysOfWeek([])).toBe('Every day');
    });
    it('returns "Every day" for all 7 days', () => {
      expect(formatDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    });
    it('returns full day name for single day', () => {
      expect(formatDaysOfWeek([1])).toBe('Monday');
    });
    it('returns comma-separated short names for multiple days', () => {
      expect(formatDaysOfWeek([1, 3, 5])).toBe('Mon, Wed, Fri');
    });
  });

  describe('getDayName', () => {
    it('returns Sun for 0', () => expect(getDayName(0)).toBe('Sun'));
    it('returns Mon for 1', () => expect(getDayName(1)).toBe('Mon'));
    it('returns Sat for 6', () => expect(getDayName(6)).toBe('Sat'));
  });

  describe('minutesSince', () => {
    it('returns approximately 0 for now', () => {
      const result = minutesSince(new Date().toISOString());
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(2);
    });
    it('returns positive number for past time', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = minutesSince(fiveMinAgo);
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(6);
    });
  });

  describe('addMinutesToISO', () => {
    it('adds minutes to an ISO string', () => {
      const base = new Date('2024-01-01T08:00:00.000Z').toISOString();
      const result = addMinutesToISO(base, 10);
      const expected = new Date('2024-01-01T08:10:00.000Z').toISOString();
      expect(result).toBe(expected);
    });
  });

  describe('isOverdue', () => {
    it('returns true for past time', () => {
      const pastISO = new Date(Date.now() - 1000).toISOString();
      expect(isOverdue(pastISO)).toBe(true);
    });
    it('returns false for future time', () => {
      const futureISO = new Date(Date.now() + 60000).toISOString();
      expect(isOverdue(futureISO)).toBe(false);
    });
  });

  describe('formatTimeFromHHMM', () => {
    it('formats 08:00 as 8:00 AM', () => {
      expect(formatTimeFromHHMM('08:00')).toBe('8:00 AM');
    });
    it('formats 14:30 as 2:30 PM', () => {
      expect(formatTimeFromHHMM('14:30')).toBe('2:30 PM');
    });
  });

  describe('secondsUntil', () => {
    it('returns 0 for past time', () => {
      const past = new Date(Date.now() - 5000).toISOString();
      expect(secondsUntil(past)).toBe(0);
    });
    it('returns positive number for future time', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const result = secondsUntil(future);
      expect(result).toBeGreaterThan(58);
      expect(result).toBeLessThanOrEqual(60);
    });
  });
});
