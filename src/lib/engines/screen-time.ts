// ============================================
// SCREEN TIME MANAGER
// Hard limits with bonus unlocks via Fun Stars
// ============================================

import type { Child, ChildScreenTime, FamilySettings } from '@/types';
import { SCREEN_TIME_DEFAULTS } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

export interface ScreenTimeStatus {
    dailyLimitMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    bonusAvailable: number;
    bonusUsed: number;
    isLimitReached: boolean;
    isBonusWindowOpen: boolean;
    canUseBonusNow: boolean;
}

export interface ConsumeResult {
    success: boolean;
    minutesConsumed: number;
    usedFromDaily: number;
    usedFromBonus: number;
    remainingDaily: number;
    remainingBonus: number;
    error?: string;
}

/**
 * Screen Time Manager
 * 
 * Manages daily screen time limits with bonus minutes earned via Fun Stars.
 * Key principles:
 * - Hard daily limits are NOT negotiable (not star-based)
 * - Bonus minutes can only be earned with Fun Stars
 * - Bonus usage is restricted to specific windows (weekends, holidays, evenings)
 */
export class ScreenTimeManager {
    /**
     * Gets the current screen time status for a child.
     */
    static getStatus(
        child: Child,
        familySettings?: FamilySettings['screenTimeDefaults'],
        currentTime?: Date
    ): ScreenTimeStatus {
        const settings = familySettings || {
            defaultDailyLimitMinutes: SCREEN_TIME_DEFAULTS.dailyLimitMinutes,
            bonusAllowedDays: SCREEN_TIME_DEFAULTS.bonusAllowedDays as unknown as ('weekday' | 'weekend' | 'holiday')[],
            bonusWindowStart: SCREEN_TIME_DEFAULTS.bonusWindowStart,
            bonusWindowEnd: SCREEN_TIME_DEFAULTS.bonusWindowEnd,
        };

        const screenTime = child.screenTimeLimits;
        const now = currentTime || new Date();

        const remainingDaily = Math.max(0, screenTime.dailyLimitMinutes - screenTime.usedTodayMinutes);
        const remainingBonus = Math.max(0, screenTime.bonusMinutesAvailable - screenTime.bonusUsedTodayMinutes);
        const isBonusWindowOpen = this.isBonusWindowOpen(now, settings);

        return {
            dailyLimitMinutes: screenTime.dailyLimitMinutes,
            usedMinutes: screenTime.usedTodayMinutes,
            remainingMinutes: remainingDaily,
            bonusAvailable: screenTime.bonusMinutesAvailable,
            bonusUsed: screenTime.bonusUsedTodayMinutes,
            isLimitReached: remainingDaily <= 0,
            isBonusWindowOpen,
            canUseBonusNow: isBonusWindowOpen && remainingBonus > 0,
        };
    }

    /**
     * Checks if current time is within the allowed bonus window.
     */
    static isBonusWindowOpen(
        currentTime: Date,
        settings: FamilySettings['screenTimeDefaults']
    ): boolean {
        const dayOfWeek = currentTime.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check if today is an allowed bonus day
        const allowedDays = settings.bonusAllowedDays || SCREEN_TIME_DEFAULTS.bonusAllowedDays;
        const isDayAllowed =
            (isWeekend && allowedDays.includes('weekend')) ||
            (!isWeekend && allowedDays.includes('weekday'));

        if (!isDayAllowed) return false;

        // Check time window
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        const windowStart = settings.bonusWindowStart || SCREEN_TIME_DEFAULTS.bonusWindowStart;
        const windowEnd = settings.bonusWindowEnd || SCREEN_TIME_DEFAULTS.bonusWindowEnd;

        return currentTimeStr >= windowStart && currentTimeStr <= windowEnd;
    }

    /**
     * Checks if daily limit has been reached.
     */
    static isDailyLimitReached(screenTime: ChildScreenTime): boolean {
        return screenTime.usedTodayMinutes >= screenTime.dailyLimitMinutes;
    }

    /**
     * Consumes screen time (from daily allowance first, then bonus if available).
     */
    static consumeMinutes(
        screenTime: ChildScreenTime,
        minutes: number,
        settings?: FamilySettings['screenTimeDefaults'],
        currentTime?: Date
    ): ConsumeResult {
        const status = this.getStatusFromScreenTime(screenTime, settings, currentTime);

        if (minutes <= 0) {
            return {
                success: false,
                minutesConsumed: 0,
                usedFromDaily: 0,
                usedFromBonus: 0,
                remainingDaily: status.remainingMinutes,
                remainingBonus: status.bonusAvailable - status.bonusUsed,
                error: 'Invalid minutes value',
            };
        }

        let remainingToConsume = minutes;
        let usedFromDaily = 0;
        let usedFromBonus = 0;

        // First, consume from daily allowance
        const availableDaily = status.remainingMinutes;
        if (availableDaily > 0) {
            usedFromDaily = Math.min(remainingToConsume, availableDaily);
            remainingToConsume -= usedFromDaily;
        }

        // Then, consume from bonus if in window and available
        if (remainingToConsume > 0 && status.canUseBonusNow) {
            const availableBonus = screenTime.bonusMinutesAvailable - screenTime.bonusUsedTodayMinutes;
            usedFromBonus = Math.min(remainingToConsume, availableBonus);
            remainingToConsume -= usedFromBonus;
        }

        // If still remaining, we couldn't fulfill the request
        if (remainingToConsume > 0) {
            return {
                success: false,
                minutesConsumed: usedFromDaily + usedFromBonus,
                usedFromDaily,
                usedFromBonus,
                remainingDaily: status.remainingMinutes - usedFromDaily,
                remainingBonus: (status.bonusAvailable - status.bonusUsed) - usedFromBonus,
                error: `Not enough screen time. Requested ${minutes}, available ${usedFromDaily + usedFromBonus}`,
            };
        }

        return {
            success: true,
            minutesConsumed: usedFromDaily + usedFromBonus,
            usedFromDaily,
            usedFromBonus,
            remainingDaily: status.remainingMinutes - usedFromDaily,
            remainingBonus: (status.bonusAvailable - status.bonusUsed) - usedFromBonus,
        };
    }

    /**
     * Helper to get status from ScreenTime object directly.
     */
    private static getStatusFromScreenTime(
        screenTime: ChildScreenTime,
        settings?: FamilySettings['screenTimeDefaults'],
        currentTime?: Date
    ): ScreenTimeStatus {
        const now = currentTime || new Date();
        const settingsWithDefaults = settings || {
            defaultDailyLimitMinutes: SCREEN_TIME_DEFAULTS.dailyLimitMinutes,
            bonusAllowedDays: SCREEN_TIME_DEFAULTS.bonusAllowedDays as unknown as ('weekday' | 'weekend' | 'holiday')[],
            bonusWindowStart: SCREEN_TIME_DEFAULTS.bonusWindowStart,
            bonusWindowEnd: SCREEN_TIME_DEFAULTS.bonusWindowEnd,
        };

        const remainingDaily = Math.max(0, screenTime.dailyLimitMinutes - screenTime.usedTodayMinutes);
        const remainingBonus = Math.max(0, screenTime.bonusMinutesAvailable - screenTime.bonusUsedTodayMinutes);
        const isBonusWindowOpen = this.isBonusWindowOpen(now, settingsWithDefaults);

        return {
            dailyLimitMinutes: screenTime.dailyLimitMinutes,
            usedMinutes: screenTime.usedTodayMinutes,
            remainingMinutes: remainingDaily,
            bonusAvailable: screenTime.bonusMinutesAvailable,
            bonusUsed: screenTime.bonusUsedTodayMinutes,
            isLimitReached: remainingDaily <= 0,
            isBonusWindowOpen,
            canUseBonusNow: isBonusWindowOpen && remainingBonus > 0,
        };
    }

    /**
     * Adds bonus minutes (purchased with Fun Stars).
     */
    static addBonusMinutes(
        screenTime: ChildScreenTime,
        minutes: number
    ): ChildScreenTime {
        return {
            ...screenTime,
            bonusMinutesAvailable: screenTime.bonusMinutesAvailable + minutes,
        };
    }

    /**
     * Calculates Fun Stars cost for bonus minutes.
     */
    static calculateBonusCost(minutes: number): number {
        return minutes * SCREEN_TIME_DEFAULTS.funStarsPerBonusMinute;
    }

    /**
     * Calculates bonus minutes from Fun Stars.
     */
    static calculateBonusMinutes(funStars: number): number {
        return Math.floor(funStars / SCREEN_TIME_DEFAULTS.funStarsPerBonusMinute);
    }

    /**
     * Resets daily screen time usage (call at midnight).
     */
    static resetDailyUsage(
        screenTime: ChildScreenTime,
        newDailyLimit?: number
    ): ChildScreenTime {
        return {
            ...screenTime,
            dailyLimitMinutes: newDailyLimit ?? screenTime.dailyLimitMinutes,
            usedTodayMinutes: 0,
            bonusUsedTodayMinutes: 0,
            lastReset: Timestamp.now(),
        };
    }

    /**
     * Updates screen time after consumption.
     */
    static updateAfterConsumption(
        screenTime: ChildScreenTime,
        usedFromDaily: number,
        usedFromBonus: number
    ): ChildScreenTime {
        return {
            ...screenTime,
            usedTodayMinutes: screenTime.usedTodayMinutes + usedFromDaily,
            bonusUsedTodayMinutes: screenTime.bonusUsedTodayMinutes + usedFromBonus,
        };
    }

    /**
     * Validates if a child can purchase bonus screen time.
     */
    static canPurchaseBonus(
        funStarsBalance: number,
        requestedMinutes: number
    ): { canPurchase: boolean; cost: number; error?: string } {
        const cost = this.calculateBonusCost(requestedMinutes);

        if (requestedMinutes <= 0) {
            return { canPurchase: false, cost: 0, error: 'Invalid minutes value' };
        }

        if (requestedMinutes > SCREEN_TIME_DEFAULTS.maxBonusMinutesPerDay) {
            return {
                canPurchase: false,
                cost,
                error: `Maximum ${SCREEN_TIME_DEFAULTS.maxBonusMinutesPerDay} bonus minutes per day`,
            };
        }

        if (funStarsBalance < cost) {
            return {
                canPurchase: false,
                cost,
                error: `Insufficient Fun Stars. Need ${cost}, have ${funStarsBalance}`,
            };
        }

        return { canPurchase: true, cost };
    }
}

// Export singleton-style functions for convenience
export const getScreenTimeStatus = ScreenTimeManager.getStatus.bind(ScreenTimeManager);
export const isBonusWindowOpen = ScreenTimeManager.isBonusWindowOpen.bind(ScreenTimeManager);
export const isDailyLimitReached = ScreenTimeManager.isDailyLimitReached.bind(ScreenTimeManager);
export const consumeScreenTime = ScreenTimeManager.consumeMinutes.bind(ScreenTimeManager);
export const addBonusMinutes = ScreenTimeManager.addBonusMinutes.bind(ScreenTimeManager);
export const resetDailyUsage = ScreenTimeManager.resetDailyUsage.bind(ScreenTimeManager);
