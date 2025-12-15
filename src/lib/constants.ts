// ============================================
// PARENTS & CHILDREN REWARD PLATFORM - CONSTANTS
// ============================================

// ============================================
// AGE GROUP CONFIGURATIONS
// ============================================

export const AGE_GROUPS = {
    '4-6': {
        label: 'Little Explorer',
        minAge: 4,
        maxAge: 6,
        showNumbers: false,
        showStreaks: false,
        uiComplexity: 'simple',
        defaultTrustLevel: 1,
        parentOversight: 'full',
    },
    '7-10': {
        label: 'Star Collector',
        minAge: 7,
        maxAge: 10,
        showNumbers: true,
        showStreaks: true,
        uiComplexity: 'moderate',
        defaultTrustLevel: 2,
        parentOversight: 'moderate',
    },
    '11-14': {
        label: 'Challenge Seeker',
        minAge: 11,
        maxAge: 14,
        showNumbers: true,
        showStreaks: true,
        uiComplexity: 'full',
        defaultTrustLevel: 3,
        parentOversight: 'light',
    },
    '15+': {
        label: 'Independent',
        minAge: 15,
        maxAge: 18,
        showNumbers: true,
        showStreaks: true,
        uiComplexity: 'full',
        defaultTrustLevel: 4,
        parentOversight: 'minimal',
    },
} as const;

// ============================================
// TRUST LEVEL SYSTEM
// ============================================

export const TRUST_LEVELS = {
    1: {
        name: 'Beginner',
        description: 'All tasks require parent approval',
        autoApprove: false,
        randomCheckPercent: 0,
        color: '#EF4444', // red
    },
    2: {
        name: 'Learning',
        description: 'Most tasks require approval',
        autoApprove: false,
        randomCheckPercent: 0,
        color: '#F97316', // orange
    },
    3: {
        name: 'Trusted',
        description: 'Simple tasks auto-approved',
        autoApprove: true,
        autoApproveCategories: ['chores', 'health'],
        randomCheckPercent: 25,
        color: '#EAB308', // yellow
    },
    4: {
        name: 'Reliable',
        description: 'Most tasks auto-approved with random checks',
        autoApprove: true,
        randomCheckPercent: 15,
        color: '#22C55E', // green
    },
    5: {
        name: 'Champion',
        description: 'Full autonomy with rare checks',
        autoApprove: true,
        randomCheckPercent: 5,
        color: '#3B82F6', // blue
    },
} as const;

export const TRUST_ADJUSTMENTS = {
    taskVerified: 0.1,
    taskRejected: -0.5,
    gamingDetected: -2.0,
    bonusReward: 0.2,
    streakMilestone: 0.3,
    minLevel: 1,
    maxLevel: 5,
} as const;

// ============================================
// STAR SYSTEM DEFAULTS
// ============================================

export const STAR_DEFAULTS = {
    weeklyCap: 100,
    streakBonusPercent: 10, // +10% per day
    maxStreakBonusPercent: 50, // Max 50%
    expiryDays: 90, // For premium optional expiry
} as const;

export const STAR_VALUES = {
    easy: { min: 1, max: 3 },
    medium: { min: 3, max: 7 },
    hard: { min: 7, max: 15 },
    challenge: { min: 15, max: 30 },
} as const;

// ============================================
// TASK CATEGORIES
// ============================================

export const TASK_CATEGORIES = {
    study: {
        label: 'Study',
        icon: '📚',
        color: '#8B5CF6', // purple
    },
    health: {
        label: 'Health',
        icon: '💪',
        color: '#10B981', // emerald
    },
    behavior: {
        label: 'Behavior',
        icon: '🌟',
        color: '#F59E0B', // amber
    },
    chores: {
        label: 'Chores',
        icon: '🏠',
        color: '#6366F1', // indigo
    },
    creativity: {
        label: 'Creativity',
        icon: '🎨',
        color: '#EC4899', // pink
    },
    social: {
        label: 'Social',
        icon: '🤝',
        color: '#14B8A6', // teal
    },
} as const;

// ============================================
// REWARD CATEGORIES
// ============================================

export const REWARD_CATEGORIES = {
    experience: {
        label: 'Experiences',
        icon: '🎢',
        description: 'Activities and outings',
        examples: ['Movie night', 'Park visit', 'Game day'],
    },
    privilege: {
        label: 'Privileges',
        icon: '👑',
        description: 'Special permissions',
        examples: ['Stay up late', 'Choose dinner', 'Skip a chore'],
    },
    choice: {
        label: 'Choices',
        icon: '🎯',
        description: 'Decision-making power',
        examples: ['Pick the movie', 'Choose breakfast', 'Plan an outing'],
    },
    material: {
        label: 'Gifts',
        icon: '🎁',
        description: 'Physical rewards',
        examples: ['Small toy', 'Book', 'Craft supplies'],
    },
    'screen-time': {
        label: 'Screen Time',
        icon: '📱',
        description: 'Bonus device time',
        examples: ['30 min bonus', '1 hour gaming', 'Extra tablet time'],
        restrictions: {
            maxPerWeek: 3,
        },
    },
} as const;

// ============================================
// SCREEN TIME DEFAULTS
// ============================================

export const SCREEN_TIME_DEFAULTS = {
    dailyLimitMinutes: 60,
    bonusAllowedDays: ['weekend', 'holiday'] as const,
    bonusWindowStart: '14:00',
    bonusWindowEnd: '20:00',
    maxBonusMinutesPerDay: 60,
    funStarsPerBonusMinute: 2, // 2 fun stars = 1 minute
} as const;

// ============================================
// STREAK MILESTONES
// ============================================

export const STREAK_MILESTONES = [
    { days: 3, badge: 'streak_3', bonusStars: 5 },
    { days: 7, badge: 'streak_7', bonusStars: 15 },
    { days: 14, badge: 'streak_14', bonusStars: 30 },
    { days: 30, badge: 'streak_30', bonusStars: 75 },
    { days: 60, badge: 'streak_60', bonusStars: 150 },
    { days: 100, badge: 'streak_100', bonusStars: 300 },
] as const;

// ============================================
// ACHIEVEMENTS
// ============================================

export const ACHIEVEMENTS = {
    first_task: {
        name: 'First Step',
        description: 'Complete your first task',
        icon: '🎯',
        rarity: 'common',
    },
    streak_7: {
        name: 'Week Warrior',
        description: 'Complete tasks 7 days in a row',
        icon: '🔥',
        rarity: 'rare',
    },
    streak_30: {
        name: 'Monthly Master',
        description: 'Complete tasks 30 days in a row',
        icon: '⚡',
        rarity: 'epic',
    },
    streak_100: {
        name: 'Legendary Streak',
        description: 'Complete tasks 100 days in a row',
        icon: '👑',
        rarity: 'legendary',
    },
    stars_100: {
        name: 'Star Collector',
        description: 'Earn 100 total stars',
        icon: '⭐',
        rarity: 'common',
    },
    stars_500: {
        name: 'Star Hunter',
        description: 'Earn 500 total stars',
        icon: '🌟',
        rarity: 'rare',
    },
    stars_1000: {
        name: 'Star Champion',
        description: 'Earn 1000 total stars',
        icon: '✨',
        rarity: 'epic',
    },
    first_reward: {
        name: 'First Reward',
        description: 'Redeem your first reward',
        icon: '🎁',
        rarity: 'common',
    },
    category_master: {
        name: 'Category Master',
        description: 'Complete 50 tasks in one category',
        icon: '🏆',
        rarity: 'rare',
    },
    trust_level_5: {
        name: 'Fully Trusted',
        description: 'Reach trust level 5',
        icon: '🛡️',
        rarity: 'epic',
    },
    goal_complete: {
        name: 'Goal Getter',
        description: 'Complete a weekly goal',
        icon: '🎯',
        rarity: 'common',
    },
} as const;

// ============================================
// MOTIVATION THRESHOLDS
// ============================================

export const MOTIVATION_CONFIG = {
    inactivityThresholds: {
        mild: 2, // 2 days
        moderate: 4, // 4 days
        severe: 7, // 7 days
    },
    encouragementMessages: {
        mild: [
            "We miss you! Ready for a quick win?",
            "Your stars are waiting for you!",
            "One small task to get back on track?",
        ],
        moderate: [
            "Let's start fresh! Here's an easy task for you.",
            "Every champion needs a break. Ready to come back?",
            "We saved some special tasks just for you!",
        ],
        severe: [
            "We really miss you! Here's a bonus to help you restart.",
            "Starting over is brave. We're here to help!",
            "Your family is cheering for you!",
        ],
    },
    bonusMultipliers: {
        mild: 1.0,
        moderate: 1.25,
        severe: 1.5,
    },
    bonusDuration: {
        mild: 24, // hours
        moderate: 48,
        severe: 72,
    },
} as const;

// ============================================
// CELEBRATION ANIMATIONS
// ============================================

export const CELEBRATION_ANIMATIONS = {
    taskComplete: 'confetti',
    streakAchieved: 'stars',
    goalComplete: 'fireworks',
    rewardRedeemed: 'rainbow',
    levelUp: 'stars',
    achievementUnlocked: 'fireworks',
} as const;

// ============================================
// SUBSCRIPTION FEATURES
// ============================================

export const SUBSCRIPTION_LIMITS = {
    free: {
        maxChildren: 2,
        maxTasksPerChild: 10,
        maxCustomRewards: 5,
        autoTrustAdjust: false,
        advancedAnalytics: false,
        challenges: false,
        starExpiry: false,
        prioritySupport: false,
    },
    premium: {
        maxChildren: Infinity,
        maxTasksPerChild: Infinity,
        maxCustomRewards: Infinity,
        autoTrustAdjust: true,
        advancedAnalytics: true,
        challenges: true,
        starExpiry: true, // optional feature
        prioritySupport: true,
    },
} as const;

// ============================================
// SESSION & SECURITY
// ============================================

export const SESSION_CONFIG = {
    parentSessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    childSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    qrTokenDuration: 5 * 60 * 1000, // 5 minutes
    maxPinAttempts: 5,
    pinLockoutDuration: 15 * 60 * 1000, // 15 minutes
} as const;

// ============================================
// UI THEMES
// ============================================

export const CHILD_THEMES = {
    ocean: {
        primary: '#0EA5E9',
        secondary: '#38BDF8',
        accent: '#7DD3FC',
        background: '#F0F9FF',
    },
    forest: {
        primary: '#22C55E',
        secondary: '#4ADE80',
        accent: '#86EFAC',
        background: '#F0FDF4',
    },
    sunset: {
        primary: '#F97316',
        secondary: '#FB923C',
        accent: '#FDBA74',
        background: '#FFF7ED',
    },
    galaxy: {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        accent: '#C4B5FD',
        background: '#FAF5FF',
    },
    candy: {
        primary: '#EC4899',
        secondary: '#F472B6',
        accent: '#F9A8D4',
        background: '#FDF2F8',
    },
} as const;

// ============================================
// AVATAR PRESETS
// ============================================

export const AVATAR_CATEGORIES = ['animal', 'character', 'superhero', 'nature'] as const;

export const DEFAULT_AVATARS = [
    { id: 'lion', name: 'Lion', category: 'animal', unlockedByDefault: true },
    { id: 'panda', name: 'Panda', category: 'animal', unlockedByDefault: true },
    { id: 'owl', name: 'Owl', category: 'animal', unlockedByDefault: true },
    { id: 'fox', name: 'Fox', category: 'animal', unlockedByDefault: true },
    { id: 'unicorn', name: 'Unicorn', category: 'character', unlockedByDefault: true },
    { id: 'robot', name: 'Robot', category: 'character', unlockedByDefault: true },
    { id: 'astronaut', name: 'Astronaut', category: 'character', unlockedByDefault: false, unlockCost: 50 },
    { id: 'hero', name: 'Super Hero', category: 'superhero', unlockedByDefault: false, unlockCost: 100 },
    { id: 'tree', name: 'Magic Tree', category: 'nature', unlockedByDefault: true },
    { id: 'star', name: 'Shooting Star', category: 'nature', unlockedByDefault: false, unlockCost: 75 },
] as const;
