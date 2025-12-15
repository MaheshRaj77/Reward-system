// ============================================
// PARENTS & CHILDREN REWARD PLATFORM - V2 TYPES
// ============================================

import { Timestamp } from 'firebase/firestore';

// ============================================
// USER ROLES & AUTHENTICATION
// ============================================

export type UserRole = 'parent' | 'admin';
export type ChildLoginMethod = 'pin' | 'avatar' | 'qr' | 'device-session';
export type SubscriptionPlan = 'free' | 'premium';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelledAt?: Timestamp;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface Parent {
  id: string;
  email: string;
  name: string;
  familyId: string;
  role: UserRole;
  subscription: SubscriptionInfo;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}

export interface Child {
  id: string;
  name: string;
  familyId: string;
  ageGroup: AgeGroup;
  birthYear: number;
  avatar: AvatarConfig;
  themeColor: string;
  trustLevel: TrustLevel;
  trustHistory: TrustEvent[];
  starBalances: StarBalances;
  screenTimeLimits: ChildScreenTime;
  goals: Goal[];
  pin?: string; // Hashed PIN (4-6 digits)
  loginMethod: ChildLoginMethod;
  lastActive: Timestamp;
  createdAt: Timestamp;
  streaks: StreakData;
}

// ============================================
// AGE GROUPS & TRUST LEVELS
// ============================================

export type AgeGroup = '4-6' | '7-10' | '11-14' | '15+';
export type TrustLevel = 1 | 2 | 3 | 4 | 5;

export interface TrustEvent {
  timestamp: Timestamp;
  previousLevel: number;
  newLevel: number;
  reason: 'task_verified' | 'task_rejected' | 'gaming_detected' | 'manual_adjustment';
  taskId?: string;
  metadata?: {
    adjustmentReason?: string;
  };
}

// ============================================
// STAR SYSTEM
// ============================================

export type StarType = 'rewards';

export interface StarBalances {
  rewards: number;
  weeklyEarned: number;
  weeklyLimit: number;
  lastWeekReset: Timestamp;
}

export interface StarTransaction {
  id: string;
  childId: string;
  type: 'earned' | 'spent' | 'expired' | 'bonus';
  starType: StarType;
  amount: number;
  reason: string;
  relatedId?: string; // Task or Reward ID
  timestamp: Timestamp;
}

// ============================================
// FAMILY & SETTINGS
// ============================================

export type SubscriptionTier = 'free' | 'premium';

export interface Family {
  id: string;
  name: string;
  createdAt: Timestamp;
  subscription: SubscriptionTier;
  subscriptionExpiresAt?: Timestamp;
  settings: FamilySettings;
  parentIds: string[];
  childIds: string[];
}

export interface FamilySettings {
  timezone: string;
  weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
  notificationPreferences: NotificationPrefs;
  screenTimeDefaults: ScreenTimeSettings;
  starSettings: StarSettings;
}

export interface NotificationPrefs {
  emailDigest: 'daily' | 'weekly' | 'none';
  pushApprovals: boolean;
  pushRedemptions: boolean;
  pushInactivity: boolean;
  inactivityThresholdDays: number;
}

export interface ScreenTimeSettings {
  defaultDailyLimitMinutes: number;
  bonusAllowedDays: ('weekday' | 'weekend' | 'holiday')[];
  bonusWindowStart: string; // "14:00"
  bonusWindowEnd: string; // "20:00"
}

export interface StarSettings {
  weeklyCap: number;
  streakBonusPercent: number;
  maxStreakBonus: number;
  enableExpiry: boolean;
  expiryDays?: number;
}

// ============================================
// CHILD SCREEN TIME
// ============================================

export interface ChildScreenTime {
  dailyLimitMinutes: number;
  bonusMinutesAvailable: number;
  usedTodayMinutes: number;
  bonusUsedTodayMinutes: number;
  lastReset: Timestamp;
}

// ============================================
// TASKS
// ============================================

export type TaskType = 'one-time' | 'recurring' | 'habit' | 'challenge' | 'bonus';
export type TaskCategory = 'study' | 'health' | 'behavior' | 'chores' | 'creativity' | 'social';
export type ProofType = 'none' | 'photo' | 'timer' | 'checklist' | 'parent-confirm';
export type TaskStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assignedChildId: string | 'all';
  taskType: TaskType;
  category: TaskCategory;
  starValue: number;
  proofRequired: ProofType;
  approvalRule: ApprovalRule;
  frequency?: RecurrenceRule;
  status: TaskStatus;
  icon?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalRule {
  trustLevelThreshold: TrustLevel;
  randomCheckPercent: number; // 0-100
  alwaysManual: boolean;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  interval?: number;
  endDate?: Timestamp;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  childId: string;
  familyId: string;
  completedAt: Timestamp;
  proof?: ProofData;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
  starsAwarded: number;
  trustDelta: number;
  streakCount: number;
  bonusApplied: number;
}

export interface ProofData {
  type: ProofType;
  photoUrl?: string;
  timerDuration?: number; // seconds
  checklistItems?: ChecklistItem[];
  submittedAt: Timestamp;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

// ============================================
// REWARDS
// ============================================

export type RewardCategory = 'experience' | 'privilege' | 'choice' | 'material' | 'screen-time';
export type RewardStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export interface Reward {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  category: RewardCategory;
  starCost: number;
  icon: string;
  imageUrl?: string;
  imageBase64?: string; // Base64 encoded image for uploaded images
  availableToChildren: string[] | 'all';
  limitPerWeek?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  rewardName: string;
  childId: string;
  familyId: string;
  requestedAt: Timestamp;
  status: RewardStatus;
  starsDeducted: number;
  starType: StarType;
  parentApprovedBy?: string;
  parentApprovedAt?: Timestamp;
  fulfilledAt?: Timestamp;
  notes?: string;
}

// ============================================
// GOALS & ACHIEVEMENTS
// ============================================

export type GoalType = 'weekly' | 'monthly' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'expired';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  targetCount: number;
  currentCount: number;
  status: GoalStatus;
  rewardStars?: number;
  rewardType?: StarType;
  startDate: Timestamp;
  endDate: Timestamp;
  category?: TaskCategory;
}

export interface Achievement {
  id: string;
  childId: string;
  type: AchievementType;
  unlockedAt: Timestamp;
  metadata?: Record<string, unknown>;
}

export type AchievementType =
  | 'first_task'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'stars_100'
  | 'stars_500'
  | 'stars_1000'
  | 'first_reward'
  | 'category_master'
  | 'trust_level_5'
  | 'goal_complete';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: Timestamp | null;
  streakStartDate: Timestamp | null;
}

// ============================================
// AVATAR SYSTEM
// ============================================

export interface AvatarConfig {
  type: 'preset' | 'custom';
  presetId?: string;
  customUrl?: string;
  backgroundColor: string;
  accessoryIds?: string[];
}

export interface AvatarPreset {
  id: string;
  name: string;
  imageUrl: string;
  category: 'animal' | 'character' | 'superhero' | 'nature';
  unlockedByDefault: boolean;
  unlockStarCost?: number;
}

// ============================================
// PRAISE & EMOTIONAL INTELLIGENCE
// ============================================

export type PraiseType = 'badge' | 'animation' | 'message' | 'voice-note' | 'reaction';

export interface PraiseEvent {
  id: string;
  childId: string;
  type: PraiseType;
  content: PraiseContent;
  from: 'parent' | 'system';
  parentId?: string;
  createdAt: Timestamp;
  seen: boolean;
}

export interface PraiseContent {
  badgeId?: string;
  animationType?: 'confetti' | 'stars' | 'fireworks' | 'rainbow';
  message?: string;
  voiceNoteUrl?: string;
  reactionEmoji?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: TaskCategory | 'special';
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
  | 'approval_needed'
  | 'task_approved'
  | 'task_rejected'
  | 'reward_requested'
  | 'reward_approved'
  | 'streak_achieved'
  | 'goal_completed'
  | 'inactivity_alert'
  | 'weekly_summary';

export interface Notification {
  id: string;
  userId: string;
  userType: 'parent' | 'child';
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Timestamp;
}

// ============================================
// CHILD SESSION (NO PASSWORD AUTH)
// ============================================

export interface ChildSession {
  id: string;
  childId: string;
  familyId: string;
  deviceId: string;
  loginMethod: ChildLoginMethod;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastActive: Timestamp;
  isActive: boolean;
}

export interface QRLoginToken {
  token: string;
  childId: string;
  familyId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
}

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

export interface FamilyStats {
  totalTasksCompleted: number;
  totalStarsEarned: number;
  totalRewardsRedeemed: number;
  averageTasksPerChild: number;
  topCategory: TaskCategory;
  weeklyTrend: 'up' | 'down' | 'stable';
}

export interface ChildStats {
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: TaskCategory;
  trustLevelTrend: 'improving' | 'declining' | 'stable';
  motivationScore: number; // 0-100
}

// ============================================
// MOTIVATION ENGINE TYPES
// ============================================

export type InactivityLevel = 'mild' | 'moderate' | 'severe';

export interface MotivationPlan {
  level: InactivityLevel;
  suggestedTasks: Task[];
  encouragementMessage: string;
  temporaryBonus?: {
    multiplier: number;
    expiresAt: Timestamp;
  };
}
