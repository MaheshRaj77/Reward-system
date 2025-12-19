import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, orderBy, where } from 'firebase/firestore';

export interface AdminReward {
    id: string;
    title: string;
    cost: number;
    family: string;
    redeemedCount: number;
}

export const AdminRewardsService = {
    getRewards: async (): Promise<AdminReward[]> => {
        try {
            const rewardsQuery = query(collection(db, 'rewards'), limit(50));
            const rewardsSnap = await getDocs(rewardsQuery);

            // Fetch parents for family names
            const parentsSnap = await getDocs(collection(db, 'parents'));
            const familyMap: Record<string, string> = {};
            parentsSnap.forEach(d => familyMap[d.id] = d.data().familyName || d.data().displayName || 'Family');

            // Count redemptions per reward?
            // Expensive to aggregate from 'rewardRedemptions'.
            // We will skip exact count or fetch ALL redemptions?
            // Let's fetch all redemptions if reasonable.
            const redemptionsSnap = await getDocs(collection(db, 'rewardRedemptions'));
            const counts: Record<string, number> = {};
            redemptionsSnap.forEach(doc => {
                const rid = doc.data().rewardId;
                if (rid) counts[rid] = (counts[rid] || 0) + 1;
            });

            return rewardsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.name || 'Untitled Reward',
                    cost: data.cost || 0,
                    family: familyMap[data.familyId] || 'Unknown Family',
                    redeemedCount: counts[doc.id] || 0
                };
            });
        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
