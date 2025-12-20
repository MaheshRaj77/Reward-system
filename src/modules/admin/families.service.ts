import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export interface TaskInfo {
    id: string;
    title: string;
    status: 'pending' | 'completed' | 'verified' | 'rejected' | 'active' | 'approved' | 'bucket-list';
    stars: number;
    createdAt?: string;
    completedAt?: string;
}

export interface RewardInfo {
    id: string;
    title: string;
    type: 'standard' | 'custom';
    status: 'pending' | 'approved' | 'rejected' | 'given' | 'redeemed' | 'fulfilled';
    starsCost: number;
    requestedAt?: string;
}

export interface StarHistory {
    weekly: number;
    growth: number;
    burned: number;
}

export interface ChildDetail {
    id: string;
    name: string;
    totalTasksAssigned: number;
    totalStarsCollected: number;
    totalRewardsClaimed: number;
    tasks: TaskInfo[];
    rewards: RewardInfo[];
    starHistory: StarHistory;
}

export interface AdminFamily {
    id: string;
    familyName: string;
    parentName: string;
    parentEmail?: string;
    mobileNumber?: string;
    createdAt?: string;
    children: ChildDetail[];
}

export const AdminFamiliesService = {
    getFamilies: async (): Promise<AdminFamily[]> => {
        try {
            // Fetch all data
            const parentsQuery = query(collection(db, 'parents'), limit(50));
            const parentsSnap = await getDocs(parentsQuery);
            console.log('[AdminFamilies] Fetched parents:', parentsSnap.docs.length);

            const childrenSnap = await getDocs(collection(db, 'children'));
            console.log('[AdminFamilies] Fetched children:', childrenSnap.docs.length);

            const tasksSnap = await getDocs(collection(db, 'tasks'));
            console.log('[AdminFamilies] Fetched tasks:', tasksSnap.docs.length);

            // Use 'rewards' collection and 'rewardRedemptions' for claimed rewards
            const rewardsSnap = await getDocs(collection(db, 'rewards'));
            console.log('[AdminFamilies] Fetched rewards:', rewardsSnap.docs.length);

            const redemptionsSnap = await getDocs(collection(db, 'rewardRedemptions'));
            console.log('[AdminFamilies] Fetched redemptions:', redemptionsSnap.docs.length);

            // Build tasks by child - FIXED: tasks use 'assignedChildIds' array
            const tasksByChild: Record<string, TaskInfo[]> = {};
            tasksSnap.forEach(doc => {
                const data = doc.data();
                const assignedChildIds = data.assignedChildIds || [];

                // Each task can be assigned to multiple children
                assignedChildIds.forEach((childId: string) => {
                    if (!tasksByChild[childId]) tasksByChild[childId] = [];
                    tasksByChild[childId].push({
                        id: doc.id,
                        title: data.title || 'Untitled Task',
                        status: data.status || 'pending',
                        stars: data.stars || 0,
                        createdAt: data.createdAt?.toDate?.()?.toISOString?.().split('T')[0],
                        completedAt: data.completedAt?.toDate?.()?.toISOString?.().split('T')[0]
                    });
                });
            });

            // Build redemptions by child
            const redemptionsByChild: Record<string, RewardInfo[]> = {};
            const rewardMap: Record<string, { name: string; cost: number }> = {};

            // Build reward lookup map
            rewardsSnap.forEach(doc => {
                const data = doc.data();
                rewardMap[doc.id] = {
                    name: data.name || 'Unknown Reward',
                    cost: data.cost || 0
                };
            });

            // Map redemptions to children
            redemptionsSnap.forEach(doc => {
                const data = doc.data();
                const childId = data.childId;
                const rewardId = data.rewardId;

                if (childId) {
                    if (!redemptionsByChild[childId]) redemptionsByChild[childId] = [];
                    const reward = rewardMap[rewardId];
                    redemptionsByChild[childId].push({
                        id: doc.id,
                        title: reward?.name || data.rewardName || 'Unknown Reward',
                        type: data.isCustom ? 'custom' : 'standard',
                        status: data.status || 'redeemed',
                        starsCost: reward?.cost || data.cost || 0,
                        requestedAt: data.redeemedAt?.toDate?.()?.toISOString?.().split('T')[0] ||
                            data.createdAt?.toDate?.()?.toISOString?.().split('T')[0]
                    });
                }
            });

            console.log('[AdminFamilies] Tasks by child:', Object.keys(tasksByChild).length, 'children have tasks');
            console.log('[AdminFamilies] Redemptions by child:', Object.keys(redemptionsByChild).length, 'children have redemptions');

            // Build children by parent
            const childrenByParent: Record<string, ChildDetail[]> = {};
            childrenSnap.forEach(doc => {
                const data = doc.data();
                const familyId = data.parentId || data.familyId;

                if (familyId) {
                    if (!childrenByParent[familyId]) childrenByParent[familyId] = [];

                    const childTasks = tasksByChild[doc.id] || [];
                    const childRewards = redemptionsByChild[doc.id] || [];
                    const starBalances = data.starBalances || {};

                    const totalEarned = (starBalances.growth || 0) + (starBalances.weekly || 0);
                    const totalBurned = childRewards.reduce((sum, r) => sum + r.starsCost, 0);

                    childrenByParent[familyId].push({
                        id: doc.id,
                        name: data.name || 'Unknown Child',
                        totalTasksAssigned: childTasks.length,
                        totalStarsCollected: totalEarned,
                        totalRewardsClaimed: childRewards.length,
                        tasks: childTasks,
                        rewards: childRewards,
                        starHistory: {
                            weekly: starBalances.weekly || 0,
                            growth: starBalances.growth || 0,
                            burned: totalBurned
                        }
                    });
                }
            });

            const result = parentsSnap.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : undefined;

                return {
                    id: doc.id,
                    familyName: data.familyName || `${data.displayName || 'Family'}'s Family`,
                    parentName: data.displayName || data.name || 'Unknown',
                    parentEmail: data.email || undefined,
                    mobileNumber: data.mobileNumber || undefined,
                    createdAt,
                    children: childrenByParent[doc.id] || []
                };
            });

            console.log('[AdminFamilies] Final result:', result.length, 'families');
            return result;

        } catch (e) {
            console.error('Error fetching families:', e);
            return [];
        }
    }
};
