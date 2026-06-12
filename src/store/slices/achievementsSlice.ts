import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AchievementsState, AchievementId, Achievement } from '../../types';
import { nowISO, todayDateString } from '../../utils/dateHelpers';
import { ReminderEvent } from '../../types';

const BADGE_DEFINITIONS: Record<AchievementId, Omit<Achievement, 'unlockedAt'>> = {
  first_dose:    { id: 'first_dose',    title: 'First Dose',    description: 'Took your very first medication', emoji: '🌟' },
  streak_7:      { id: 'streak_7',      title: '7-Day Streak',  description: '7 days of perfect adherence',    emoji: '🔥' },
  streak_30:     { id: 'streak_30',     title: '30-Day Streak', description: '30 days of perfect adherence',   emoji: '🏆' },
  doses_100:     { id: 'doses_100',     title: '100 Doses',     description: 'Took 100 medications total',     emoji: '💯' },
  perfect_week:  { id: 'perfect_week',  title: 'Perfect Week',  description: 'Every dose taken in a full week',emoji: '⭐' },
  perfect_month: { id: 'perfect_month', title: 'Perfect Month', description: 'Every dose taken in a full month',emoji: '🎖️' },
};

function buildInitialBadges(): Record<AchievementId, Achievement> {
  const out = {} as Record<AchievementId, Achievement>;
  (Object.keys(BADGE_DEFINITIONS) as AchievementId[]).forEach((id) => {
    out[id] = { ...BADGE_DEFINITIONS[id], unlockedAt: null };
  });
  return out;
}

const initialState: AchievementsState = {
  badges: buildInitialBadges(),
  totalDosesTaken: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStreakDate: null,
  newlyUnlocked: [],
};

/** Check if every event in the last N days is 'taken' or 'skipped' (not missed). */
function hasPerfectPeriod(allEvents: Record<string, ReminderEvent[]>, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const flat = (Object.values(allEvents) as ReminderEvent[][]).flat();
  const inPeriod = flat.filter((e) => new Date(e.scheduledAt) >= cutoff);
  if (inPeriod.length === 0) return false;
  return inPeriod.every((e) => e.status === 'taken' || e.status === 'skipped');
}

const achievementsSlice = createSlice({
  name: 'achievements',
  initialState,
  reducers: {
    recordDoseTaken(state) {
      state.totalDosesTaken += 1;
      const today = todayDateString();
      const now = nowISO();

      if (state.lastStreakDate === null) {
        state.currentStreak = 1;
      } else {
        const last = new Date(state.lastStreakDate);
        const todayD = new Date(today);
        const diffDays = Math.round((todayD.getTime() - last.getTime()) / 86400000);
        if (diffDays === 1) {
          state.currentStreak += 1;
        } else if (diffDays === 0) {
          // same day — no change
        } else {
          state.currentStreak = 1;
        }
      }
      state.lastStreakDate = today;
      if (state.currentStreak > state.longestStreak) {
        state.longestStreak = state.currentStreak;
      }

      const unlock = (id: AchievementId) => {
        if (!state.badges[id].unlockedAt) {
          state.badges[id].unlockedAt = now;
          state.newlyUnlocked.push(id);
        }
      };

      if (state.totalDosesTaken === 1) unlock('first_dose');
      if (state.totalDosesTaken >= 100) unlock('doses_100');
      if (state.currentStreak >= 7) unlock('streak_7');
      if (state.currentStreak >= 30) unlock('streak_30');
    },

    /**
     * checkPerfectPeriods — called on every app resume with the full event history.
     * Auto-unlocks Perfect Week and Perfect Month if every dose in the past
     * 7 or 30 days has status 'taken' or 'skipped'.
     */
    checkPerfectPeriods(
      state,
      action: PayloadAction<Record<string, ReminderEvent[]>>
    ) {
      const now = nowISO();
      if (!state.badges.perfect_week.unlockedAt && hasPerfectPeriod(action.payload, 7)) {
        state.badges.perfect_week.unlockedAt = now;
        state.newlyUnlocked.push('perfect_week');
      }
      if (!state.badges.perfect_month.unlockedAt && hasPerfectPeriod(action.payload, 30)) {
        state.badges.perfect_month.unlockedAt = now;
        state.newlyUnlocked.push('perfect_month');
      }
    },

    recordPerfectWeek(state) {
      if (!state.badges.perfect_week.unlockedAt) {
        state.badges.perfect_week.unlockedAt = nowISO();
        state.newlyUnlocked.push('perfect_week');
      }
    },

    recordPerfectMonth(state) {
      if (!state.badges.perfect_month.unlockedAt) {
        state.badges.perfect_month.unlockedAt = nowISO();
        state.newlyUnlocked.push('perfect_month');
      }
    },

    clearNewlyUnlocked(state) {
      state.newlyUnlocked = [];
    },

    resetStreak(state) {
      state.currentStreak = 0;
    },
  },
});

export const {
  recordDoseTaken,
  checkPerfectPeriods,
  recordPerfectWeek,
  recordPerfectMonth,
  clearNewlyUnlocked,
  resetStreak,
} = achievementsSlice.actions;
export default achievementsSlice.reducer;
