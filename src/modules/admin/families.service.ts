import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export interface AdminFamily {
    id: string;
    parentName: string;
    familyName: string;
    childrenCount: number;
    totalPoints: number;
}

export const AdminFamiliesService = {
    getFamilies: async (): Promise<AdminFamily[]> => {
        try {
            const parentsQuery = query(collection(db, 'parents'), limit(50));
            const parentsSnap = await getDocs(parentsQuery);

            const childrenSnap = await getDocs(collection(db, 'children'));

            const familyStats: Record<string, { count: number, points: number }> = {};

            childrenSnap.forEach(doc => {
                const data = doc.data();
                const familyId = data.parentId || data.familyId;

                if (familyId) {
                    if (!familyStats[familyId]) {
                        familyStats[familyId] = { count: 0, points: 0 };
                    }
                    familyStats[familyId].count++;
                    // Sum growth points + weekly? Or just growth? "Total Points" usually means lifetime or current balance.
                    // Using growth balance as "Total Points"
                    familyStats[familyId].points += (data.starBalances?.growth || 0);
                }
            });

            return parentsSnap.docs.map(doc => {
                const data = doc.data();
                const stats = familyStats[doc.id] || { count: 0, points: 0 };

                return {
                    id: doc.id,
                    parentName: data.displayName || data.name || 'Unknown',
                    familyName: data.familyName || `${data.displayName || 'Family'}'s Family`,
                    childrenCount: stats.count,
                    totalPoints: stats.points
                };
            });

        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
