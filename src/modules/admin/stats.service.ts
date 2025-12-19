import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit } from 'firebase/firestore';

export interface DashboardStats {
    totalUsers: number;
    totalFamilies: number;
    totalTasks: number;
    completedTasks: number;
    totalRevenue: number;
    activeSubscriptions: number;
}

export const AdminStatsService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        try {
            const parentsColl = collection(db, 'parents');
            const tasksColl = collection(db, 'tasks');
            const completionsColl = collection(db, 'task_completions');

            // 1. Total Users (Parents)
            const usersSnapshot = await getCountFromServer(parentsColl);
            const totalUsers = usersSnapshot.data().count;

            // 2. Families (Assume 1 family per parent for now)
            const totalFamilies = totalUsers;

            // 3. Total Tasks
            const tasksSnapshot = await getCountFromServer(tasksColl);
            const totalTasks = tasksSnapshot.data().count;

            // 4. Completed Tasks
            const completedQuery = query(completionsColl, where('status', '==', 'approved'));
            const completedSnapshot = await getCountFromServer(completedQuery);
            const completedTasks = completedSnapshot.data().count;

            // 5. Active Subscriptions
            // Note: This matches structure in tasks/page.tsx: parentData.subscription?.plan
            // We need to count based on field path (requires index?) or getDocs
            // For safety without index, efficient way might be restricted. 
            // We'll try query.
            const subsQuery = query(parentsColl, where('subscription.status', '==', 'active'));
            const subsSnapshot = await getCountFromServer(subsQuery);
            const activeSubscriptions = subsSnapshot.data().count;

            // 6. Revenue (Mock or estimate)
            // If we don't have transaction history, simple estimation:
            const totalRevenue = activeSubscriptions * 9.99;

            return {
                totalUsers,
                totalFamilies,
                totalTasks,
                completedTasks,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                activeSubscriptions
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                totalUsers: 0,
                totalFamilies: 0,
                totalTasks: 0,
                completedTasks: 0,
                totalRevenue: 0,
                activeSubscriptions: 0
            };
        }
    },

    getGrowthStats: async () => {
        try {
            // Aggregate user growth by day (last 7 days)
            // Real implementation: Query 'parents' where createdAt > 7 days ago.
            // Since we might not have createdAt on all or it's sparse, we'll simulate based on real count or just fetch recent.
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const parentsColl = collection(db, 'parents');
            const recentParentsQuery = query(parentsColl, limit(100)); // Just fetch a batch

            const snapshot = await getDocs(recentParentsQuery);

            // Bucket by date
            const stats: Record<string, number> = {};
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                stats[d.toISOString().split('T')[0]] = 0;
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : null;
                if (date && stats[date] !== undefined) {
                    stats[date]++;
                }
            });

            return Object.entries(stats)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, count]) => ({ date, users: count }));
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getTaskStats: async () => {
        try {
            // Aggregate task completions by day
            const completionsColl = collection(db, 'task_completions');
            const q = query(completionsColl, where('status', '==', 'approved'), limit(100));
            const snapshot = await getDocs(q);

            const stats: Record<string, number> = {};
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                stats[d.toISOString().split('T')[0]] = 0;
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const date = data.completedAt?.toDate ? new Date(data.completedAt.seconds * 1000).toISOString().split('T')[0] : null;
                if (date && stats[date] !== undefined) {
                    stats[date]++;
                }
            });

            return Object.entries(stats)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, count]) => ({ date, tasks: count }));
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getRecentActivity: async () => {
        try {
            // Fetch recent tasks created
            const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5));
            const tasksSnap = await getDocs(tasksQuery);

            const activities = tasksSnap.docs.map(doc => {
                const data = doc.data();
                // Convert timestamp to relative time string if possible, or just date
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                return {
                    id: doc.id,
                    type: 'task_created',
                    message: `New task created: "${data.title}"`,
                    time: date
                };
            });

            return activities.length > 0 ? activities : [
                { id: '1', type: 'info', message: 'System initialized. Waiting for activity.', time: 'Now' }
            ];
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            return [];
        }
    }
};
