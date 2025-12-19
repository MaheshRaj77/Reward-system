import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export interface AdminSubscription {
    id: string; // User ID acting as Sub ID
    userEmail: string;
    plan: 'free' | 'premium' | 'trial';
    status: 'active' | 'cancelled' | 'past_due' | 'inactive';
    amount: number;
    nextBillingDate: string;
}

export const AdminSubscriptionsService = {
    getSubscriptions: async (): Promise<AdminSubscription[]> => {
        try {
            // Fetch parents
            const parentsQuery = query(collection(db, 'parents'), limit(50));
            const parentsSnap = await getDocs(parentsQuery);

            return parentsSnap.docs.map(doc => {
                const data = doc.data();
                const sub = data.subscription || {};

                let amount = 0;
                if (sub.plan === 'premium') amount = 9.99;

                // Mock billing date if not present
                const nextBill = sub.nextBillingDate ?
                    new Date(sub.nextBillingDate.seconds * 1000).toISOString().split('T')[0] :
                    'N/A';

                return {
                    id: doc.id,
                    userEmail: data.email || 'No Email',
                    plan: sub.plan || 'free',
                    status: sub.status || 'inactive',
                    amount: amount,
                    nextBillingDate: nextBill
                };
            });
        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
