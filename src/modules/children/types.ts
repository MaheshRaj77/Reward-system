import { Timestamp } from 'firebase/firestore';

// ============================================
// CHILD SESSION & AUTH
// ============================================

/**
 * Child session stored in localStorage after successful login
 */
export interface ChildSession {
    childId: string;
    name: string;
    avatar: {
        presetId: string;
        backgroundColor: string;
    };
    familyId: string;
    loginAt: number; // Unix timestamp
}

/**
 * Child authentication state
 */
export interface ChildAuthState {
    child: ChildProfile | null;
    session: ChildSession | null;
    loading: boolean;
    error: string | null;
}

// ============================================
// CHILD PROFILE
// ============================================

export interface ChildProfile {
    id: string;
    name: string;
    familyId: string;
    ageGroup: '4-6' | '7-10' | '11-14' | '15+';
    birthYear: number;
    dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
    profileImageBase64?: string; // Base64 encoded profile image
    bio?: string; // Short bio/about me text
    avatar: AvatarConfig;
    themeColor: string;
    starBalances: StarBalances;
    streaks: StreakData;
    pin?: string;
    loginMethod: 'pin' | 'avatar' | 'qr' | 'device-session';
    lastActive: Timestamp;
    createdAt: Timestamp;
}

export interface AvatarConfig {
    type: 'preset' | 'custom';
    presetId?: string;
    customUrl?: string;
    backgroundColor: string;
    accessoryIds?: string[];
}

export interface StarBalances {
    growth: number;
    weeklyEarned?: number;
    weeklyLimit?: number;
    lastWeekReset?: Timestamp;
}

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastCompletionDate: Timestamp | null;
    streakStartDate: Timestamp | null;
}

// ============================================
// CONSTANTS
// ============================================

export const COLLECTIONS = {
    PARENTS: 'parents',
    CHILDREN: 'children',
    FAMILIES: 'families',
    TASKS: 'tasks',
    TASK_COMPLETIONS: 'taskCompletions',
    REWARDS: 'rewards',
    REWARD_REDEMPTIONS: 'rewardRedemptions',
} as const;

/**
 * Avatar emoji mapping for preset avatars
 */
export const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁',
    panda: '🐼',
    owl: '🦉',
    fox: '🦊',
    unicorn: '🦄',
    robot: '🤖',
    astronaut: '👨‍🚀',
    hero: '🦸',
};

/**
 * Category icons for tasks
 */
export const CATEGORY_ICONS: Record<string, string> = {
    study: '📚',
    health: '💪',
    behavior: '⭐',
    chores: '🏠',
    creativity: '🎨',
    social: '🤝',
};

/**
 * Session storage key
 */
export const CHILD_SESSION_KEY = 'childSession';
