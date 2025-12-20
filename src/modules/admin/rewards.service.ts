import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';

export interface AdminReward {
    id: string;
    title: string;
    cost: number;
    family: string;
    parentName: string;
    childName: string | null; // If custom reward by child
    type: 'standard' | 'custom'; // standard = parent created, custom = child requested
    status: string;
    redeemedCount: number;
    createdAt: string;
}

export const AdminRewardsService = {
    getRewards: async (): Promise<AdminReward[]> => {
        try {
            console.log('[AdminRewards] Fetching rewards...');

            // Fetch parent-created rewards
            const rewardsQuery = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'), limit(200));
            const rewardsSnap = await getDocs(rewardsQuery);
            console.log('[AdminRewards] Standard rewards:', rewardsSnap.docs.length);

            // Fetch custom reward requests from children
            const customRewardsSnap = await getDocs(query(collection(db, 'customRewardRequests'), limit(100)));
            console.log('[AdminRewards] Custom rewards:', customRewardsSnap.docs.length);

            // Fetch parents for family names
            const parentsSnap = await getDocs(collection(db, 'parents'));
            const familyMap: Record<string, { familyName: string; parentName: string }> = {};
            parentsSnap.forEach(d => {
                const data = d.data();
                familyMap[d.id] = {
                    familyName: data.familyName || data.displayName || 'Family',
                    parentName: data.displayName || data.name || 'Parent'
                };
            });

            // Fetch children for names
            const childrenSnap = await getDocs(collection(db, 'children'));
            const childMap: Record<string, { name: string; familyId: string }> = {};
            childrenSnap.forEach(d => {
                const data = d.data();
                childMap[d.id] = {
                    name: data.name || 'Child',
                    familyId: data.familyId || ''
                };
            });

            // Count redemptions per reward - only count fulfilled/given status
            const redemptionsSnap = await getDocs(collection(db, 'rewardRedemptions'));
            const counts: Record<string, number> = {};
            redemptionsSnap.forEach(doc => {
                const data = doc.data();
                const rid = data.rewardId;
                const status = data.status;
                // Only count if reward was actually given/fulfilled
                if (rid && (status === 'fulfilled' || status === 'given')) {
                    counts[rid] = (counts[rid] || 0) + 1;
                }
            });

            // Map standard rewards
            const standardRewards: AdminReward[] = rewardsSnap.docs.map(doc => {
                const data = doc.data();
                const familyInfo = familyMap[data.familyId] || { familyName: 'Unknown', parentName: 'Unknown' };
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '';

                return {
                    id: doc.id,
                    title: data.name || data.title || 'Untitled Reward',
                    cost: data.starCost || data.cost || data.starsCost || 0,
                    family: familyInfo.familyName,
                    parentName: familyInfo.parentName,
                    childName: null,
                    type: 'standard' as const,
                    status: data.status || 'active',
                    redeemedCount: counts[doc.id] || 0,
                    createdAt: date
                };
            });

            // Map custom rewards from children
            const customRewards: AdminReward[] = customRewardsSnap.docs.map(doc => {
                const data = doc.data();
                const childInfo = childMap[data.childId] || { name: data.childName || 'Unknown Child', familyId: data.familyId || '' };
                const familyId = data.familyId || childInfo.familyId;
                const familyInfo = familyMap[familyId] || { familyName: 'Unknown', parentName: 'Unknown' };
                const date = data.requestedAt?.toDate ? data.requestedAt.toDate().toISOString().split('T')[0] :
                    (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '');

                return {
                    id: doc.id,
                    title: data.rewardName || data.name || 'Custom Request',
                    cost: data.starsRequired || 0,
                    family: familyInfo.familyName,
                    parentName: familyInfo.parentName,
                    childName: childInfo.name,
                    type: 'custom' as const,
                    status: data.status || 'pending',
                    redeemedCount: (data.status === 'fulfilled' || data.status === 'pending_claim') ? 1 : 0,
                    createdAt: date
                };
            });

            // Combine and sort by date
            const allRewards = [...standardRewards, ...customRewards].sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt)
            );

            console.log('[AdminRewards] Total rewards:', allRewards.length);
            return allRewards;
        } catch (e) {
            console.error('[AdminRewards] Error:', e);
            return [];
        }
    }
};
