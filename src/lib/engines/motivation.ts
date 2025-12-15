// ============================================
// MOTIVATION ENGINE
// Re-engagement and emotional intelligence layer
// ============================================

import type {
    Child,
    Task,
    Achievement,
    AchievementType,
    PraiseEvent,
    PraiseContent,
    InactivityLevel,
    MotivationPlan,
    TaskCompletion,
    StreakData,
} from '@/types';
import { MOTIVATION_CONFIG, ACHIEVEMENTS, CELEBRATION_ANIMATIONS, AGE_GROUPS } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

export interface InactivityDetection {
    level: InactivityLevel | null;
    daysSinceActive: number;
    isInactive: boolean;
}

export interface AchievementCheck {
    unlocked: Achievement[];
    alreadyHad: AchievementType[];
}

/**
 * Motivation Engine
 * 
 * Provides non-transactional motivation through:
 * - Inactivity detection and re-engagement
 * - Praise badges and celebrations
 * - Encouragement messages
 * - Temporary bonuses to restart momentum
 * 
 * Goal: Prevent purely transactional parenting by adding emotional layers.
 */
export class MotivationEngine {
    /**
     * Detects if a child is inactive and at what level.
     */
    static detectInactivity(child: Child, currentTime?: Date): InactivityDetection {
        const now = currentTime || new Date();
        const lastActive = child.lastActive?.toDate?.() || new Date(0);
        const daysSince = Math.floor(
            (now.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000)
        );

        const thresholds = MOTIVATION_CONFIG.inactivityThresholds;

        if (daysSince >= thresholds.severe) {
            return { level: 'severe', daysSinceActive: daysSince, isInactive: true };
        }
        if (daysSince >= thresholds.moderate) {
            return { level: 'moderate', daysSinceActive: daysSince, isInactive: true };
        }
        if (daysSince >= thresholds.mild) {
            return { level: 'mild', daysSinceActive: daysSince, isInactive: true };
        }

        return { level: null, daysSinceActive: daysSince, isInactive: false };
    }

    /**
     * Generates a motivation plan for an inactive child.
     */
    static generateMotivationPlan(
        child: Child,
        inactivityLevel: InactivityLevel,
        availableTasks: Task[]
    ): MotivationPlan {
        const messages = MOTIVATION_CONFIG.encouragementMessages[inactivityLevel];
        const multiplier = MOTIVATION_CONFIG.bonusMultipliers[inactivityLevel];
        const bonusDurationHours = MOTIVATION_CONFIG.bonusDuration[inactivityLevel];

        // Select random encouragement message
        const message = messages[Math.floor(Math.random() * messages.length)];

        // Filter to easy tasks appropriate for the child
        const easyTasks = availableTasks
            .filter(t =>
                (t.assignedChildId === child.id || t.assignedChildId === 'all') &&
                t.starValue <= 5 &&
                t.status === 'active'
            )
            .slice(0, 3);

        // Create temporary bonus (if moderate or severe)
        const temporaryBonus = inactivityLevel !== 'mild'
            ? {
                multiplier,
                expiresAt: Timestamp.fromDate(
                    new Date(Date.now() + bonusDurationHours * 60 * 60 * 1000)
                ),
            }
            : undefined;

        return {
            level: inactivityLevel,
            suggestedTasks: easyTasks,
            encouragementMessage: message,
            temporaryBonus,
        };
    }

    /**
     * Generates praise content for an achievement/completion.
     */
    static generatePraise(
        child: Child,
        trigger: 'task_complete' | 'streak' | 'goal' | 'reward' | 'achievement',
        metadata?: { streakCount?: number; achievementType?: AchievementType }
    ): PraiseContent {
        const ageConfig = AGE_GROUPS[child.ageGroup];

        // Determine animation type
        let animationType: PraiseContent['animationType'];
        switch (trigger) {
            case 'task_complete':
                animationType = 'confetti';
                break;
            case 'streak':
                animationType = 'stars';
                break;
            case 'goal':
            case 'achievement':
                animationType = 'fireworks';
                break;
            case 'reward':
                animationType = 'rainbow';
                break;
        }

        // Age-appropriate messages
        const messages: Record<typeof trigger, string[]> = {
            task_complete: [
                "Amazing job! You're a superstar! ⭐",
                "Woohoo! You did it! 🎉",
                "Fantastic work! Keep going! 💪",
                "You're on fire! 🔥",
            ],
            streak: [
                `${metadata?.streakCount} days in a row! Incredible! 🔥`,
                `Streak master! ${metadata?.streakCount} days strong! ⚡`,
                "You're unstoppable! Keep the streak alive! 🌟",
            ],
            goal: [
                "Goal crushed! You're a champion! 🏆",
                "You set a goal and achieved it! So proud! 🎯",
                "Goal complete! What's next? 🚀",
            ],
            reward: [
                "Enjoy your reward! You earned it! 🎁",
                "Your hard work paid off! Treat yourself! 🌈",
            ],
            achievement: [
                "Achievement unlocked! You're legendary! 🏅",
                "New badge earned! You're collecting greatness! ✨",
            ],
        };

        const messagePool = messages[trigger];
        const message = messagePool[Math.floor(Math.random() * messagePool.length)];

        return {
            animationType,
            message,
        };
    }

    /**
     * Checks which achievements a child has unlocked based on current state.
     */
    static checkAchievements(
        child: Child,
        completions: TaskCompletion[],
        existingAchievements: Achievement[]
    ): AchievementCheck {
        const existingTypes = new Set(existingAchievements.map(a => a.type));
        const unlocked: Achievement[] = [];
        const alreadyHad: AchievementType[] = Array.from(existingTypes);

        const checks: Array<{ type: AchievementType; condition: () => boolean }> = [
            // First task
            {
                type: 'first_task',
                condition: () => completions.length >= 1,
            },
            // Streak achievements
            {
                type: 'streak_7',
                condition: () => child.streaks.longestStreak >= 7,
            },
            {
                type: 'streak_30',
                condition: () => child.streaks.longestStreak >= 30,
            },
            {
                type: 'streak_100',
                condition: () => child.streaks.longestStreak >= 100,
            },
            // Star achievements
            {
                type: 'stars_100',
                condition: () => {
                    const total = completions.reduce((sum, c) => sum + c.starsAwarded, 0);
                    return total >= 100;
                },
            },
            {
                type: 'stars_500',
                condition: () => {
                    const total = completions.reduce((sum, c) => sum + c.starsAwarded, 0);
                    return total >= 500;
                },
            },
            {
                type: 'stars_1000',
                condition: () => {
                    const total = completions.reduce((sum, c) => sum + c.starsAwarded, 0);
                    return total >= 1000;
                },
            },
        ];

        for (const check of checks) {
            if (!existingTypes.has(check.type) && check.condition()) {
                unlocked.push({
                    id: `${child.id}_${check.type}_${Date.now()}`,
                    childId: child.id,
                    type: check.type,
                    unlockedAt: Timestamp.now(),
                });
            }
        }

        return { unlocked, alreadyHad };
    }

    /**
     * Updates streak data based on a new completion.
     */
    static updateStreak(
        currentStreak: StreakData,
        completionDate: Date
    ): StreakData {
        const lastDate = currentStreak.lastCompletionDate?.toDate?.();
        const today = new Date(completionDate);
        today.setHours(0, 0, 0, 0);

        if (!lastDate) {
            // First completion ever
            return {
                currentStreak: 1,
                longestStreak: 1,
                lastCompletionDate: Timestamp.fromDate(completionDate),
                streakStartDate: Timestamp.fromDate(completionDate),
            };
        }

        const lastDateNormalized = new Date(lastDate);
        lastDateNormalized.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
            (today.getTime() - lastDateNormalized.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysDiff === 0) {
            // Same day, no streak change
            return currentStreak;
        }

        if (daysDiff === 1) {
            // Consecutive day, increment streak
            const newCurrent = currentStreak.currentStreak + 1;
            return {
                currentStreak: newCurrent,
                longestStreak: Math.max(currentStreak.longestStreak, newCurrent),
                lastCompletionDate: Timestamp.fromDate(completionDate),
                streakStartDate: currentStreak.streakStartDate,
            };
        }

        // Streak broken, start new
        return {
            currentStreak: 1,
            longestStreak: currentStreak.longestStreak,
            lastCompletionDate: Timestamp.fromDate(completionDate),
            streakStartDate: Timestamp.fromDate(completionDate),
        };
    }

    /**
     * Gets the celebration animation type for an event.
     */
    static getCelebrationAnimation(
        event: keyof typeof CELEBRATION_ANIMATIONS
    ): string {
        return CELEBRATION_ANIMATIONS[event];
    }

    /**
     * Gets achievement info from constants.
     */
    static getAchievementInfo(type: AchievementType) {
        return ACHIEVEMENTS[type];
    }

    /**
     * Creates a praise event for storing.
     */
    static createPraiseEvent(
        childId: string,
        content: PraiseContent,
        from: 'parent' | 'system',
        parentId?: string
    ): Omit<PraiseEvent, 'id'> {
        return {
            childId,
            type: content.animationType ? 'animation' : content.message ? 'message' : 'badge',
            content,
            from,
            parentId,
            createdAt: Timestamp.now(),
            seen: false,
        };
    }
}

// Export singleton-style functions for convenience
export const detectInactivity = MotivationEngine.detectInactivity.bind(MotivationEngine);
export const generateMotivationPlan = MotivationEngine.generateMotivationPlan.bind(MotivationEngine);
export const generatePraise = MotivationEngine.generatePraise.bind(MotivationEngine);
export const checkAchievements = MotivationEngine.checkAchievements.bind(MotivationEngine);
export const updateStreak = MotivationEngine.updateStreak.bind(MotivationEngine);
