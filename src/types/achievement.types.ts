export type AchievementId =
  | 'first_dose'
  | 'streak_7'
  | 'streak_30'
  | 'doses_100'
  | 'perfect_week'
  | 'perfect_month';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  emoji: string;
  unlockedAt: string | null;  // ISO string when earned, null if not yet
}

export interface AchievementsState {
  badges: Record<AchievementId, Achievement>;
  totalDosesTaken: number;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  newlyUnlocked: AchievementId[];   // cleared after showing celebration
}
