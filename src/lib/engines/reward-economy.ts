// ============================================
// REWARD ECONOMY CONTROLLER
// Star management system with single star type
// ============================================

import type {
    Child,
    Task,
    StarType,
    StarBalances,
    StarTransaction,
    FamilySettings,
    Reward,
    RewardRedemption,
} from '@/types';
import { STAR_DEFAULTS, STREAK_MILESTONES } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

export interface StarCalculationResult {
    baseStars: number;
    streakBonus: number;
    cappedAmount: number;
    finalStars: number;
    wasLimited: boolean;
    limitReason?: string;
}

export interface RedemptionValidation {
    isValid: boolean;
    reason?: string;
    availableBalance: number;
    requiredBalance: number;
}

/**
 * Reward Economy Controller
 * 
 * Manages the star economy to prevent inflation and maintain
 * healthy reward dynamics. Implements:
 * - Weekly earning caps
 * - Streak bonuses
 * - Single star type (rewards)
 * - Dynamic reward pricing
 * - Optional star expiry
 */
export class RewardEconomy {
    /**
     * Calculates the final star award for a completed task.
     * Applies streak bonuses and enforces weekly caps.
     */
    static calculateTaskStars(
        task: Task,
        child: Child,
        currentStreak: number,
        settings?: FamilySettings['starSettings']
    ): StarCalculationResult {
        const starSettings = settings || {
            weeklyCap: STAR_DEFAULTS.weeklyCap,
            streakBonusPercent: STAR_DEFAULTS.streakBonusPercent,
            maxStreakBonus: STAR_DEFAULTS.maxStreakBonusPercent,
        };

        const baseStars = task.starValue;

        // Calculate streak bonus
        const streakMultiplier = this.calculateStreakMultiplier(
            currentStreak,
            starSettings.streakBonusPercent,
            starSettings.maxStreakBonus
        );
        const streakBonus = Math.floor(baseStars * (streakMultiplier - 1));
        const withStreak = baseStars + streakBonus;

        // Check weekly cap
        const weeklyLimit = child.starBalances.weeklyLimit;
        const weeklyEarned = child.starBalances.weeklyEarned;

        const remainingCap = Math.max(0, weeklyLimit - weeklyEarned);
        const cappedAmount = Math.min(withStreak, remainingCap);

        const wasLimited = cappedAmount < withStreak;
        const limitReason = wasLimited
            ? `Weekly star cap reached (${weeklyEarned}/${weeklyLimit})`
            : undefined;

        return {
            baseStars,
            streakBonus,
            cappedAmount,
            finalStars: cappedAmount,
            wasLimited,
            limitReason,
        };
    }

    /**
     * Calculates the streak multiplier.
     * +X% per consecutive day, capped at max bonus.
     */
    static calculateStreakMultiplier(
        streakDays: number,
        bonusPercent: number = STAR_DEFAULTS.streakBonusPercent,
        maxBonus: number = STAR_DEFAULTS.maxStreakBonusPercent
    ): number {
        if (streakDays <= 0) return 1;

        const totalBonusPercent = Math.min(streakDays * bonusPercent, maxBonus);
        return 1 + (totalBonusPercent / 100);
    }

    /**
     * Validates if a child can redeem a reward.
     * Checks balance and weekly limits.
     */
    static validateRedemption(
        reward: Reward,
        child: Child,
        weeklyRedemptions: RewardRedemption[]
    ): RedemptionValidation {
        const starCost = reward.starCost;
        const availableBalance = child.starBalances.rewards;

        // Check sufficient balance
        if (availableBalance < starCost) {
            return {
                isValid: false,
                reason: `Insufficient stars`,
                availableBalance,
                requiredBalance: starCost,
            };
        }

        // Check weekly limit for this specific reward
        if (reward.limitPerWeek) {
            const thisWeekRedemptions = weeklyRedemptions.filter(
                r => r.rewardId === reward.id
            ).length;

            if (thisWeekRedemptions >= reward.limitPerWeek) {
                return {
                    isValid: false,
                    reason: `Weekly limit reached (${thisWeekRedemptions}/${reward.limitPerWeek})`,
                    availableBalance,
                    requiredBalance: starCost,
                };
            }
        }

        return {
            isValid: true,
            availableBalance,
            requiredBalance: starCost,
        };
    }

    /**
     * Processes a reward redemption and returns updated star balances.
     */
    static processRedemption(
        reward: Reward,
        currentBalances: StarBalances
    ): {
        newBalances: StarBalances;
        deductedAmount: number;
    } {
        const cost = reward.starCost;
        const newBalances = { ...currentBalances };

        newBalances.rewards -= cost;

        return {
            newBalances,
            deductedAmount: cost,
        };
    }

    /**
     * Resets weekly earning counters (call at week start).
     */
    static resetWeeklyEarnings(
        currentBalances: StarBalances,
        settings?: FamilySettings['starSettings']
    ): StarBalances {
        return {
            ...currentBalances,
            weeklyEarned: 0,
            weeklyLimit: settings?.weeklyCap || STAR_DEFAULTS.weeklyCap,
            lastWeekReset: Timestamp.now(),
        };
    }

    /**
     * Checks for streak milestones and returns bonus stars if applicable.
     */
    static checkStreakMilestone(
        previousStreak: number,
        newStreak: number
    ): { milestone: typeof STREAK_MILESTONES[number] | null; bonusStars: number } {
        for (const milestone of STREAK_MILESTONES) {
            if (previousStreak < milestone.days && newStreak >= milestone.days) {
                return {
                    milestone,
                    bonusStars: milestone.bonusStars,
                };
            }
        }
        return { milestone: null, bonusStars: 0 };
    }

    /**
     * Processes star expiry for premium accounts (optional feature).
     * Stars older than X days are removed.
     */
    static processExpiredStars(
        transactions: StarTransaction[],
        expiryDays: number = STAR_DEFAULTS.expiryDays
    ): {
        expiredAmount: number;
        expiredTransactions: StarTransaction[];
    } {
        const now = Date.now();
        const expiryMs = expiryDays * 24 * 60 * 60 * 1000;

        let expiredAmount = 0;
        const expiredTransactions: StarTransaction[] = [];

        for (const tx of transactions) {
            if (tx.type !== 'earned') continue;

            const txTime = tx.timestamp.toMillis();
            if (now - txTime > expiryMs) {
                expiredAmount += tx.amount;
                expiredTransactions.push(tx);
            }
        }

        return { expiredAmount, expiredTransactions };
    }

    /**
     * Creates a star transaction record.
     */
    static createTransaction(
        childId: string,
        type: StarTransaction['type'],
        starType: StarType,
        amount: number,
        reason: string,
        relatedId?: string
    ): Omit<StarTransaction, 'id'> {
        return {
            childId,
            type,
            starType,
            amount,
            reason,
            relatedId,
            timestamp: Timestamp.now(),
        };
    }

    /**
     * Credits stars to a child's balance after task completion.
     */
    static creditStars(
        currentBalances: StarBalances,
        amount: number
    ): StarBalances {
        const newBalances = { ...currentBalances };

        newBalances.rewards += amount;
        newBalances.weeklyEarned += amount;

        return newBalances;
    }
}

// Export singleton-style functions for convenience
export const calculateTaskStars = RewardEconomy.calculateTaskStars.bind(RewardEconomy);
export const calculateStreakMultiplier = RewardEconomy.calculateStreakMultiplier.bind(RewardEconomy);
export const validateRedemption = RewardEconomy.validateRedemption.bind(RewardEconomy);
export const processRedemption = RewardEconomy.processRedemption.bind(RewardEconomy);
export const resetWeeklyEarnings = RewardEconomy.resetWeeklyEarnings.bind(RewardEconomy);
export const checkStreakMilestone = RewardEconomy.checkStreakMilestone.bind(RewardEconomy);
export const creditStars = RewardEconomy.creditStars.bind(RewardEconomy);
