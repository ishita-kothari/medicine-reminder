export type MoodType = 'good' | 'okay' | 'not_great';

export interface WellnessEntry {
  id: string;
  date: string;       // yyyy-MM-dd
  mood: MoodType;
  note?: string;
  createdAt: string;
}

export interface WellnessState {
  entries: Record<string, WellnessEntry>; // keyed by date
  lastCheckinDate: string | null;
}
