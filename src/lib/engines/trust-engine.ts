// ============================================
// TRUST ENGINE - Dynamic Trust Level Management
// ============================================

import type { Child, Task, TaskCompletion, TrustLevel, TrustEvent } from '@/types';
import { TRUST_LEVELS, TRUST_ADJUSTMENTS } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';

export interface TrustEvaluationResult {
    requiresApproval: boolean;
    isRandomCheck: boolean;
    reason: string;
}

export interface TrustUpdateResult {
    previousLevel: number;
    newLevel: TrustLevel;
    delta: number;
    event: TrustEvent;
}

/**
 * Trust Engine
 * 
 * Dynamically manages child trust levels based on task completion behavior.
 * Higher trust = more auto-approvals, less parent overhead.
 * Gaming/abuse = immediate trust penalty.
 */
export class TrustEngine {
    /**
     * Evaluates if a task completion requires manual parent approval
     * based on the child's trust level and task properties.
     */
    static evaluateApproval(task: Task, child: Child): TrustEvaluationResult {
        // Always require manual approval if task specifies it
        if (task.approvalRule.alwaysManual) {
            return {
                requiresApproval: true,
                isRandomCheck: false,
                reason: 'Task requires manual approval',
            };
        }

        const childTrust = child.trustLevel;
        const taskThreshold = task.approvalRule.trustLevelThreshold;
        const trustConfig = TRUST_LEVELS[childTrust];

        // Trust level too low for auto-approval
        if (childTrust < taskThreshold) {
            return {
                requiresApproval: true,
                isRandomCheck: false,
                reason: `Trust level ${childTrust} below task threshold ${taskThreshold}`,
            };
        }

        // Check if this trust level supports auto-approval
        if (!trustConfig.autoApprove) {
            return {
                requiresApproval: true,
                isRandomCheck: false,
                reason: `Trust level ${childTrust} does not support auto-approval`,
            };
        }

        // Random check based on trust level
        if (this.shouldRandomCheck(child.trustLevel)) {
            return {
                requiresApproval: true,
                isRandomCheck: true,
                reason: 'Random verification check',
            };
        }

        // Auto-approve
        return {
            requiresApproval: false,
            isRandomCheck: false,
            reason: 'Auto-approved based on trust level',
        };
    }

    /**
     * Determines if a random check should occur based on trust level.
     * Higher trust levels have lower random check probability.
     */
    static shouldRandomCheck(level: TrustLevel): boolean {
        const config = TRUST_LEVELS[level];
        const randomPercent = config.randomCheckPercent;

        if (randomPercent === 0) return false;

        return Math.random() * 100 < randomPercent;
    }

    /**
     * Calculates the trust delta based on task completion outcome.
     * - Approved tasks increase trust
     * - Rejected tasks decrease trust
     * - Gaming detection severely penalizes trust
     */
    static calculateTrustDelta(
        status: 'approved' | 'rejected' | 'auto-approved',
        isGamingDetected: boolean = false
    ): number {
        if (isGamingDetected) {
            return TRUST_ADJUSTMENTS.gamingDetected;
        }

        switch (status) {
            case 'approved':
            case 'auto-approved':
                return TRUST_ADJUSTMENTS.taskVerified;
            case 'rejected':
                return TRUST_ADJUSTMENTS.taskRejected;
            default:
                return 0;
        }
    }

    /**
     * Updates a child's trust level based on a completed task.
     * Trust is bounded between 1 and 5.
     */
    static updateTrustLevel(
        child: Child,
        completion: TaskCompletion,
        isGamingDetected: boolean = false
    ): TrustUpdateResult {
        const previousLevel = child.trustLevel;
        const delta = this.calculateTrustDelta(
            completion.status as 'approved' | 'rejected' | 'auto-approved',
            isGamingDetected
        );

        // Calculate new trust as float, then apply bounds
        let newTrustFloat = previousLevel + delta;
        newTrustFloat = Math.max(TRUST_ADJUSTMENTS.minLevel, newTrustFloat);
        newTrustFloat = Math.min(TRUST_ADJUSTMENTS.maxLevel, newTrustFloat);

        // Round to nearest integer for trust level
        const newLevel = Math.round(newTrustFloat) as TrustLevel;

        // Determine event reason
        let reason: TrustEvent['reason'];
        if (isGamingDetected) {
            reason = 'gaming_detected';
        } else if (completion.status === 'rejected') {
            reason = 'task_rejected';
        } else {
            reason = 'task_verified';
        }

        const event: TrustEvent = {
            timestamp: Timestamp.now(),
            previousLevel,
            newLevel,
            reason,
            taskId: completion.taskId,
        };

        return {
            previousLevel,
            newLevel,
            delta,
            event,
        };
    }

    /**
     * Detects potential gaming behavior based on patterns.
     * Examples: completing too many tasks too quickly, suspicious timing patterns.
     */
    static detectGaming(
        recentCompletions: TaskCompletion[],
        currentCompletion: TaskCompletion
    ): { isGaming: boolean; reason?: string } {
        const GAMING_THRESHOLDS = {
            maxCompletionsPerMinute: 5,
            minTimeBetweenCompletions: 10 * 1000, // 10 seconds
            suspiciousPatternWindow: 60 * 1000, // 1 minute
        };

        const now = currentCompletion.completedAt.toMillis();
        const recentWindow = recentCompletions.filter(
            c => now - c.completedAt.toMillis() < GAMING_THRESHOLDS.suspiciousPatternWindow
        );

        // Check: Too many completions in short time
        if (recentWindow.length >= GAMING_THRESHOLDS.maxCompletionsPerMinute) {
            return {
                isGaming: true,
                reason: 'Too many task completions in 1 minute',
            };
        }

        // Check: Suspiciously quick completions
        const lastCompletion = recentCompletions[0];
        if (lastCompletion) {
            const timeSinceLast = now - lastCompletion.completedAt.toMillis();
            if (timeSinceLast < GAMING_THRESHOLDS.minTimeBetweenCompletions) {
                return {
                    isGaming: true,
                    reason: 'Task completed too quickly after previous',
                };
            }
        }

        return { isGaming: false };
    }

    /**
     * Gets the display info for a trust level.
     */
    static getTrustLevelInfo(level: TrustLevel) {
        return TRUST_LEVELS[level];
    }

    /**
     * Calculates the progress toward the next trust level.
     * Returns percentage (0-100).
     */
    static getProgressToNextLevel(
        currentLevel: TrustLevel,
        consecutiveApprovals: number
    ): number {
        if (currentLevel >= 5) return 100;

        // Estimate: ~10 consecutive approvals to level up
        const approvalsNeeded = 10;
        return Math.min(100, (consecutiveApprovals / approvalsNeeded) * 100);
    }

    /**
     * Manually adjusts a child's trust level (parent override).
     * This creates a manual_adjustment event in the trust history.
     */
    static manuallyAdjustTrust(
        child: Child,
        newLevel: TrustLevel,
        reason: string = 'Parent adjustment'
    ): TrustUpdateResult {
        const previousLevel = child.trustLevel;
        const delta = newLevel - previousLevel;

        // Ensure newLevel is within bounds
        const boundedLevel = Math.max(
            TRUST_ADJUSTMENTS.minLevel,
            Math.min(TRUST_ADJUSTMENTS.maxLevel, newLevel)
        ) as TrustLevel;

        const event: TrustEvent = {
            timestamp: Timestamp.now(),
            previousLevel,
            newLevel: boundedLevel,
            reason: 'manual_adjustment',
            metadata: {
                adjustmentReason: reason,
            },
        };

        return {
            previousLevel,
            newLevel: boundedLevel,
            delta: boundedLevel - previousLevel,
            event,
        };
    }
}

// Export singleton-style functions for convenience
export const evaluateApproval = TrustEngine.evaluateApproval.bind(TrustEngine);
export const shouldRandomCheck = TrustEngine.shouldRandomCheck.bind(TrustEngine);
export const calculateTrustDelta = TrustEngine.calculateTrustDelta.bind(TrustEngine);
export const updateTrustLevel = TrustEngine.updateTrustLevel.bind(TrustEngine);
export const detectGaming = TrustEngine.detectGaming.bind(TrustEngine);
export const manuallyAdjustTrust = TrustEngine.manuallyAdjustTrust.bind(TrustEngine);
