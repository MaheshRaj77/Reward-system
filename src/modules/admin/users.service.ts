import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

export interface AdminUser {
    id: string;
    name: string;
    email: string; // Not always available in parents collection, might be in auth or separate
    subscriptionPlan: 'free' | 'premium' | 'trial';
    joinedAt: string;
    childrenCount: number;
}

export const AdminUsersService = {
    getUsers: async (): Promise<AdminUser[]> => {
        try {
            // 1. Fetch Parents
            const parentsQuery = query(collection(db, 'parents'), limit(50)); // Limit for safety
            const parentsSnap = await getDocs(parentsQuery);

            // 2. Fetch all children to count (optimized: fetch all children once if small, or query per parent?)
            // For scalability, we should query count per parent, but here we'll fetch all children for simplicity
            // assuming < 1000 children total for this admin view version.
            const childrenSnap = await getDocs(collection(db, 'children'));
            const childrenByParent: Record<string, number> = {};
            childrenSnap.forEach(doc => {
                const data = doc.data();
                const familyId = data.parentId || data.familyId; // Check field name compatibility
                if (familyId) {
                    childrenByParent[familyId] = (childrenByParent[familyId] || 0) + 1;
                }
            });

            const users: AdminUser[] = parentsSnap.docs.map(doc => {
                const data = doc.data();
                // Fallback for date
                const joinedDate = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '2025-01-01';

                return {
                    id: doc.id,
                    name: data.displayName || data.name || 'Unknown Parent',
                    email: data.email || 'No Email', // Standard firebase auth usually puts email in auth, not always in doc.
                    subscriptionPlan: data.subscription?.plan || 'free',
                    joinedAt: joinedDate,
                    childrenCount: childrenByParent[doc.id] || 0
                };
            });

            return users;
        } catch (error) {
            console.error('Error fetching admin users:', error);
            return [];
        }
    }
};
