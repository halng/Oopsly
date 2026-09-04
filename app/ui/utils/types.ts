export type Grade = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type Theme =
  | 'light'
  | 'dark'
  | 'system'
  | 'ghibli-meadow'
  | 'ghibli-laputa'
  | 'ghibli-howl'
  | 'ghibli-kiki'
  | 'ghibli-night'
  | 'botanical'
  | 'obsidian'
  | 'midnight'
  | 'sunset'
  | 'nordic'
  | 'emerald';

export type ThemeId =
  | 'ghibli-meadow'
  | 'ghibli-laputa'
  | 'ghibli-howl'
  | 'ghibli-kiki'
  | 'ghibli-night'
  | 'botanical'
  | 'obsidian'
  | 'midnight'
  | 'sunset'
  | 'nordic'
  | 'emerald';
export type Language = 'en' | 'vi' | 'es' | 'fr' | 'ja';

// Garden and Pomodoro Study Types
export type PlantSpecies =
  | 'camphor_tree'
  | 'cherry_blossom'
  | 'sky_bonsai'
  | 'wildflower_meadow'
  | 'kodama_mushrooms'
  | 'citrus_grove'
  | 'spirit_lotus'
  | 'golden_ginkgo';

export type PlantStage = 'seed' | 'sprout' | 'sapling' | 'blooming' | 'ancient';

export interface PlantedTree {
  id: string;
  plotIndex: number;
  species: PlantSpecies;
  stage: PlantStage;
  waterLevel: number; // 0 - 100
  growthProgress: number; // 0 - 100 to next stage
  plantedAt: string;
  lastWateredAt?: string;
  totalWaters: number;
  nickname?: string;
}

export interface LandPlot {
  index: number;
  isUnlocked: boolean;
  unlockCost: number; // in forest coins
  plantId?: string;
}

export interface GardenState {
  plots: LandPlot[];
  plantedTrees: PlantedTree[];
  dewDrops: number; // for watering plants
  sunlightOrbs: number; // earned from study sessions
  growthPoints: number; // earned from Pomodoro focus sessions & XP rewards
  forestCoins: number; // for unlocking plots and buying rare seeds
  seedInventory: Record<PlantSpecies, number>; // inventory of seeds earned from study sessions
  forestLevel: number;
  totalFocusMinutes: number;
  completedSessionsCount: number;
  totalXpContributed?: number;
  activeWeather: 'sunny' | 'rain' | 'twilight';
  selectedSeedToPlant?: PlantSpecies | null;
}

export type SoundscapeType =
  | 'none'
  | 'meadow_breeze'
  | 'rain_leaves'
  | 'campfire'
  | 'stream'
  | 'twilight_crickets';

export interface PomodoroSessionConfig {
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  mode: 'focus' | 'short_break' | 'long_break';
  soundscape: SoundscapeType;
  subjectId?: string;
}

export type CommunityRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'PENDING' | 'NONE';

export interface Community {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  bannerUrl?: string;
  isPrivate: boolean; // if true: requires request & owner/admin approval
  memberCount: number;
  ownerId: string;
  ownerName: string;
  userRole?: CommunityRole;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  xp: number;
  streakDays: number;
  cardsStudiedThisWeek: number;
  rank?: number;
  joinedAt: string;
}

export interface CommunityJoinRequest {
  id: string;
  communityId: string;
  communityName: string;
  userId: string;
  displayName: string;
  userEmail?: string;
  avatarUrl?: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export interface CardState {
  stability: number;
  difficulty: number;
  intervalDays: number;
  repetitions: number;
}

export interface Card {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  hint?: string;
  tags: string[];
  difficulty: number; // 1.0 - 10.0 (FSRS)
  stability: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // ISO date string
  lastReviewedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  mediaUrl?: string;
}

export interface SubjectSchedule {
  days: number[]; // 0-6 (Sun-Sat)
  time: string; // HH:mm
  enabled: boolean;
}

export interface Subject {
  id: string;
  shelfId: string;
  title: string;
  description: string;
  icon?: string;
  color?: string;
  isPublic: boolean;
  isDeleted: boolean;
  cardCount: number;
  dueCount: number;
  tags: string[];
  schedule?: SubjectSchedule;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  authorEmail?: string;
}

export interface Shelf {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isDeleted: boolean;
  subjectCount: number;
  totalCards: number;
  dueCards?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  testSuiteId: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface TestSuite {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  cardIds: string[];
  questions?: Question[];
  createdAt: string;
}

export interface UserSettings {
  theme?: Theme;
  language?: Language;
  dailyGoal: number; // e.g. 20 cards/day
  soundEffects?: boolean;
  soundEffectsEnabled?: boolean;
  hapticFeedback?: boolean;
  hapticFeedbackEnabled?: boolean;
  autoPlayAudio?: boolean;
  fsrsTargetRetention?: number;
  targetRetentionRate?: number; // e.g. 0.90
  allowReminders?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  streakDays: number;
  totalCardsStudied: number;
  totalReviews: number;
  retentionRate: number; // e.g. 88
  xp: number;
  league: string; // e.g. "Emerald", "Diamond"
  settings: UserSettings;
  createdAt: string;
}

export interface StatsData {
  streakDays: number;
  reviewedToday: number;
  totalStudiedToday?: number;
  dailyGoal: number;
  retentionRate: number;
  overallRetention?: number;
  totalReviews: number;
  stateDistribution: {
    new: number;
    learning: number;
    review: number;
    relearning?: number;
    mastered?: number;
  };
  upcomingDueForecast: {
    date: string;
    dayName?: string;
    dueCount: number;
  }[];
  weeklyActivity?: {
    day: string;
    cardsReviewed: number;
    retention: number;
  }[];
}

export interface LeaderboardUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  xp: number;
  streakDays: number;
  rank: number;
  league?: string;
  isCurrentUser?: boolean;
}

export interface ImportCardItem {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  mediaUrl?: string;
  isValid?: boolean;
  validationError?: string;
}

export interface ParsedImportResult {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validCards: ImportCardItem[];
  headers: string[];
  rawRows: any[][];
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
  timestamp: string;
}
