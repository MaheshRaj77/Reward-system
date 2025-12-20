import { db } from '@/lib/firebase';
import { collection, getDocs, query, limit, doc, updateDoc } from 'firebase/firestore';

export interface ChildData {
    id: string;
    name: string;
    stars: number;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    mobileNumber: string;
    subscriptionPlan: 'free' | 'premium' | 'trial';
    joinedAt: string;
    childrenCount: number;
    children: ChildData[];
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    mobileNumber?: string;
    subscriptionPlan?: 'free' | 'premium' | 'trial';
}

export interface UpdateChildData {
    name?: string;
}

export const AdminUsersService = {
    getUsers: async (): Promise<AdminUser[]> => {
        try {
            const parentsQuery = query(collection(db, 'parents'), limit(50));
            const parentsSnap = await getDocs(parentsQuery);

            const childrenSnap = await getDocs(collection(db, 'children'));
            const childrenByParent: Record<string, ChildData[]> = {};

            childrenSnap.forEach(doc => {
                const data = doc.data();
                const familyId = data.parentId || data.familyId;
                if (familyId) {
                    if (!childrenByParent[familyId]) {
                        childrenByParent[familyId] = [];
                    }
                    childrenByParent[familyId].push({
                        id: doc.id,
                        name: data.name || 'Unknown',
                        stars: (data.starBalances?.growth || 0) + (data.starBalances?.weekly || 0)
                    });
                }
            });

            const users: AdminUser[] = parentsSnap.docs.map(doc => {
                const data = doc.data();
                const joinedDate = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '2025-01-01';
                const children = childrenByParent[doc.id] || [];

                return {
                    id: doc.id,
                    name: data.displayName || data.name || 'Unknown Parent',
                    email: data.email || '',
                    mobileNumber: data.mobileNumber || '',
                    subscriptionPlan: data.subscription?.plan || 'free',
                    joinedAt: joinedDate,
                    childrenCount: children.length,
                    children
                };
            });

            return users;
        } catch (error) {
            console.error('Error fetching admin users:', error);
            return [];
        }
    },

    updateUser: async (userId: string, data: UpdateUserData): Promise<boolean> => {
        try {
            const userRef = doc(db, 'parents', userId);
            const updateData: Record<string, unknown> = {};

            if (data.name !== undefined) {
                updateData.displayName = data.name;
                updateData.name = data.name;
            }
            if (data.email !== undefined) {
                updateData.email = data.email;
            }
            if (data.mobileNumber !== undefined) {
                updateData.mobileNumber = data.mobileNumber;
            }
            if (data.subscriptionPlan !== undefined) {
                updateData['subscription.plan'] = data.subscriptionPlan;
            }

            await updateDoc(userRef, updateData);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    },

    updateChild: async (childId: string, data: UpdateChildData): Promise<boolean> => {
        try {
            const childRef = doc(db, 'children', childId);
            const updateData: Record<string, unknown> = {};

            if (data.name !== undefined) {
                updateData.name = data.name;
            }

            await updateDoc(childRef, updateData);
            return true;
        } catch (error) {
            console.error('Error updating child:', error);
            return false;
        }
    }
};
