// ============================================
// REWARDS HOOK
// Hook for managing rewards and redemptions
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Reward, RewardRedemption, RewardCategory, StarType, Child } from '@/types';
import { useAuth } from './use-auth';
import { RewardEconomy } from '@/lib/engines/reward-economy';

interface UseRewardsReturn {
    rewards: Reward[];
    loading: boolean;
    error: string | null;
    createReward: (data: CreateRewardData) => Promise<{ success: boolean; reward?: Reward; error?: string }>;
    updateReward: (rewardId: string, data: Partial<Reward>) => Promise<{ success: boolean; error?: string }>;
    deleteReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>;
    getRewardsForChild: (childId: string) => Reward[];
}

interface CreateRewardData {
    name: string;
    description?: string;
    category: RewardCategory;
    starCost: number;
    icon?: string;
    availableToChildren?: string[] | 'all';
    limitPerWeek?: number;
}

export function useRewards(): UseRewardsReturn {
    const { family, parent } = useAuth();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to rewards collection
    useEffect(() => {
        if (!parent?.id) {
            setRewards([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'rewards'),
            where('familyId', '==', parent.id),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: Reward[] = [];
                snapshot.forEach((doc) => {
                    data.push(doc.data() as Reward);
                });
                setRewards(data);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [parent?.id]);

    const createReward = useCallback(async (data: CreateRewardData) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const reward: Omit<Reward, 'createdAt'> & { createdAt: unknown } = {
                id: rewardId,
                familyId: parent.id,
                name: data.name,
                description: data.description,
                category: data.category,
                starCost: data.starCost,
                icon: data.icon || '🎁',
                availableToChildren: data.availableToChildren || 'all',
                limitPerWeek: data.limitPerWeek,
                isActive: true,
                createdBy: parent.id,
                createdAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'rewards', rewardId), reward);

            return { success: true, reward: reward as unknown as Reward };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create reward';
            return { success: false, error: message };
        }
    }, [parent]);

    const updateReward = useCallback(async (rewardId: string, data: Partial<Reward>) => {
        try {
            await updateDoc(doc(db, 'rewards', rewardId), data);
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update reward';
            return { success: false, error: message };
        }
    }, []);

    const deleteReward = useCallback(async (rewardId: string) => {
        try {
            await updateDoc(doc(db, 'rewards', rewardId), { isActive: false });
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete reward';
            return { success: false, error: message };
        }
    }, []);

    const getRewardsForChild = useCallback((childId: string) => {
        return rewards.filter(
            (r) => r.availableToChildren === 'all' ||
                (Array.isArray(r.availableToChildren) && r.availableToChildren.includes(childId))
        );
    }, [rewards]);

    return {
        rewards,
        loading,
        error,
        createReward,
        updateReward,
        deleteReward,
        getRewardsForChild,
    };
}

// ============================================
// REDEMPTIONS HOOK
// ============================================

interface UseRedemptionsReturn {
    redemptions: RewardRedemption[];
    pendingRedemptions: RewardRedemption[];
    loading: boolean;
    error: string | null;
    requestRedemption: (reward: Reward, child: Child) => Promise<{
        success: boolean;
        redemption?: RewardRedemption;
        error?: string;
    }>;
    approveRedemption: (redemptionId: string) => Promise<{ success: boolean; error?: string }>;
    rejectRedemption: (redemptionId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
    fulfillRedemption: (redemptionId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useRedemptions(childId?: string): UseRedemptionsReturn {
    const { family, parent } = useAuth();
    const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to redemptions
    useEffect(() => {
        if (!parent?.id) {
            setRedemptions([]);
            setLoading(false);
            return;
        }

        let q;
        if (childId) {
            q = query(
                collection(db, 'rewardRedemptions'),
                where('childId', '==', childId),
                orderBy('requestedAt', 'desc'),
                limit(50)
            );
        } else {
            q = query(
                collection(db, 'rewardRedemptions'),
                where('familyId', '==', parent.id),
                orderBy('requestedAt', 'desc'),
                limit(100)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: RewardRedemption[] = [];
                snapshot.forEach((doc) => {
                    data.push(doc.data() as RewardRedemption);
                });
                setRedemptions(data);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [parent?.id, childId]);

    const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');

    const requestRedemption = useCallback(async (reward: Reward, child: Child) => {
        if (!parent) {
            return { success: false, error: 'No parent found' };
        }

        try {
            // Get weekly redemptions for this child
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const weeklyRedemptions = redemptions.filter(
                (r) => r.childId === child.id &&
                    r.requestedAt.toDate() > weekAgo &&
                    r.status !== 'rejected'
            );

            // Validate redemption
            const validation = RewardEconomy.validateRedemption(
                reward,
                child,
                weeklyRedemptions
            );

            if (!validation.isValid) {
                return { success: false, error: validation.reason };
            }

            // Process redemption (deduct stars)
            const { newBalances, deductedAmount } = RewardEconomy.processRedemption(
                reward,
                child.starBalances
            );

            const redemptionId = `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const redemption: Omit<RewardRedemption, 'requestedAt'> & { requestedAt: unknown } = {
                id: redemptionId,
                rewardId: reward.id,
                rewardName: reward.name,
                childId: child.id,
                familyId: parent.id,
                requestedAt: serverTimestamp(),
                status: 'pending',
                starsDeducted: deductedAmount,
                starType: 'growth',
            };

            await setDoc(doc(db, 'rewardRedemptions', redemptionId), redemption);

            // Update child's star balance
            await updateDoc(doc(db, 'children', child.id), {
                starBalances: newBalances,
            });

            return { success: true, redemption: redemption as unknown as RewardRedemption };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to request redemption';
            return { success: false, error: message };
        }
    }, [parent, redemptions]);

    const approveRedemption = useCallback(async (redemptionId: string) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            await updateDoc(doc(db, 'rewardRedemptions', redemptionId), {
                status: 'approved',
                parentApprovedBy: parent.id,
                parentApprovedAt: serverTimestamp(),
            });
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to approve';
            return { success: false, error: message };
        }
    }, [parent]);

    const rejectRedemption = useCallback(async (redemptionId: string, reason: string) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Get redemption details to refund stars
            const redemptionDoc = await getDocs(
                query(collection(db, 'rewardRedemptions'), where('id', '==', redemptionId))
            );

            if (redemptionDoc.empty) {
                return { success: false, error: 'Redemption not found' };
            }

            const redemption = redemptionDoc.docs[0].data() as RewardRedemption;

            // Refund stars to child
            const childDoc = await getDocs(
                query(collection(db, 'children'), where('id', '==', redemption.childId))
            );

            if (!childDoc.empty) {
                const child = childDoc.docs[0].data() as Child;
                const refundedBalances = {
                    ...child.starBalances,
                    growth: child.starBalances.growth + redemption.starsDeducted,
                };

                await updateDoc(doc(db, 'children', child.id), {
                    starBalances: refundedBalances,
                });
            }

            await updateDoc(doc(db, 'rewardRedemptions', redemptionId), {
                status: 'rejected',
                notes: reason,
                parentApprovedBy: parent.id,
                parentApprovedAt: serverTimestamp(),
            });

            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to reject';
            return { success: false, error: message };
        }
    }, [parent]);

    const fulfillRedemption = useCallback(async (redemptionId: string) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            await updateDoc(doc(db, 'rewardRedemptions', redemptionId), {
                status: 'fulfilled',
                fulfilledAt: serverTimestamp(),
            });
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fulfill';
            return { success: false, error: message };
        }
    }, [parent]);

    return {
        redemptions,
        pendingRedemptions,
        loading,
        error,
        requestRedemption,
        approveRedemption,
        rejectRedemption,
        fulfillRedemption,
    };
}
