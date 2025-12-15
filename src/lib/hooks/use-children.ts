// ============================================
// CHILDREN HOOK
// Hook for managing children in a family
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
    deleteDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Child, AgeGroup, AvatarConfig, StarBalances, ChildScreenTime, StreakData } from '@/types';
import { AGE_GROUPS, STAR_DEFAULTS, SCREEN_TIME_DEFAULTS } from '@/lib/constants';
import { canAddChild } from '@/lib/constants/subscription';
import { useAuth } from './use-auth';
import { useSubscription } from './use-subscription';


interface UseChildrenReturn {
    children: Child[];
    loading: boolean;
    error: string | null;
    addChild: (data: CreateChildData) => Promise<{ success: boolean; child?: Child; error?: string }>;
    updateChild: (childId: string, data: Partial<Child>) => Promise<{ success: boolean; error?: string }>;
    deleteChild: (childId: string) => Promise<{ success: boolean; error?: string }>;
    getChild: (childId: string) => Child | undefined;
}

interface CreateChildData {
    name: string;
    birthYear: number;
    avatar?: AvatarConfig;
    themeColor?: string;
}

function calculateAgeGroup(birthYear: number): AgeGroup {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age <= 6) return '4-6';
    if (age <= 10) return '7-10';
    if (age <= 14) return '11-14';
    return '15+';
}

export function useChildren(): UseChildrenReturn {
    const { family } = useAuth();
    const { plan } = useSubscription();
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to children collection
    useEffect(() => {
        if (!family?.id) {
            setChildren([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'children'),
            where('familyId', '==', family.id)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const childrenData: Child[] = [];
                snapshot.forEach((doc) => {
                    childrenData.push(doc.data() as Child);
                });
                setChildren(childrenData);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [family?.id]);

    const addChild = useCallback(async (data: CreateChildData) => {
        if (!family) {
            return { success: false, error: 'No family found' };
        }

        // Check subscription limit
        if (!canAddChild(plan, children.length)) {
            return {
                success: false,
                error: `You've reached the limit of ${plan === 'free' ? '2' : 'unlimited'} children on the ${plan} plan. Upgrade to Premium to add more.`
            };
        }

        try {
            const ageGroup = calculateAgeGroup(data.birthYear);

            const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const defaultBalances: StarBalances = {
                growth: 0,
                weeklyEarned: 0,
                weeklyLimit: family.settings?.starSettings?.weeklyCap || STAR_DEFAULTS.weeklyCap,
                lastWeekReset: Timestamp.now(),
            };

            const defaultScreenTime: ChildScreenTime = {
                dailyLimitMinutes: family.settings?.screenTimeDefaults?.defaultDailyLimitMinutes || SCREEN_TIME_DEFAULTS.dailyLimitMinutes,
                bonusMinutesAvailable: 0,
                usedTodayMinutes: 0,
                bonusUsedTodayMinutes: 0,
                lastReset: Timestamp.now(),
            };

            const defaultStreaks: StreakData = {
                currentStreak: 0,
                longestStreak: 0,
                lastCompletionDate: null,
                streakStartDate: null,
            };

            const defaultAvatar: AvatarConfig = data.avatar || {
                type: 'preset',
                presetId: 'lion',
                backgroundColor: '#0EA5E9',
            };

            const child: Omit<Child, 'createdAt' | 'lastActive'> & { createdAt: unknown; lastActive: unknown } = {
                id: childId,
                name: data.name,
                familyId: family.id,
                ageGroup,
                birthYear: data.birthYear,
                avatar: defaultAvatar,
                themeColor: data.themeColor || '#0EA5E9',
                starBalances: defaultBalances,
                screenTimeLimits: defaultScreenTime,
                goals: [],
                loginMethod: 'pin',
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                streaks: defaultStreaks,
            };

            await setDoc(doc(db, 'children', childId), child);

            // Update family's childIds
            await updateDoc(doc(db, 'families', family.id), {
                childIds: [...(family.childIds || []), childId],
            });

            return { success: true, child: child as unknown as Child };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to add child';
            return { success: false, error: message };
        }
    }, [family, plan, children.length]);

    const updateChild = useCallback(async (childId: string, data: Partial<Child>) => {
        try {
            // If birthYear changed, recalculate age group
            if (data.birthYear) {
                data.ageGroup = calculateAgeGroup(data.birthYear);
            }

            await updateDoc(doc(db, 'children', childId), data);
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update child';
            return { success: false, error: message };
        }
    }, []);

    const deleteChild = useCallback(async (childId: string) => {
        if (!family) {
            return { success: false, error: 'No family found' };
        }

        try {
            await deleteDoc(doc(db, 'children', childId));

            // Update family's childIds - safely handle null/undefined
            const updatedChildIds = (family.childIds || []).filter((id) => id !== childId);
            await updateDoc(doc(db, 'families', family.id), {
                childIds: updatedChildIds,
            });

            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete child';
            return { success: false, error: message };
        }
    }, [family]);

    const getChild = useCallback((childId: string) => {
        return children.find((c) => c.id === childId);
    }, [children]);

    return {
        children,
        loading,
        error,
        addChild,
        updateChild,
        deleteChild,
        getChild,
    };
}
