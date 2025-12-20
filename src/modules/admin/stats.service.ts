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
    },

    // Get reward redemption stats over last 7 days
    getRewardStats: async () => {
        try {
            const redemptionsColl = collection(db, 'rewardRedemptions');
            const snapshot = await getDocs(query(redemptionsColl, limit(200)));

            const stats: Record<string, number> = {};
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                stats[d.toISOString().split('T')[0]] = 0;
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const date = data.redeemedAt?.toDate ? data.redeemedAt.toDate().toISOString().split('T')[0] :
                    (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : null);
                if (date && stats[date] !== undefined) {
                    stats[date]++;
                }
            });

            return Object.entries(stats)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, count]) => ({ date, rewards: count }));
        } catch (e) {
            console.error('Error getting reward stats:', e);
            return [];
        }
    },

    // Get children stats
    getChildrenStats: async () => {
        try {
            const childrenColl = collection(db, 'children');
            const snapshot = await getDocs(query(childrenColl, limit(200)));

            let totalChildren = 0;
            let totalStars = 0;
            const ageGroups: Record<string, number> = {
                '4-6': 0, '7-10': 0, '11-14': 0, '15+': 0
            };

            snapshot.docs.forEach(doc => {
                totalChildren++;
                const data = doc.data();
                totalStars += data.starBalances?.growth || 0;
                const age = data.ageGroup || '7-10';
                if (ageGroups[age] !== undefined) ageGroups[age]++;
            });

            return {
                totalChildren,
                totalStars,
                averageStars: totalChildren > 0 ? Math.round(totalStars / totalChildren) : 0,
                ageGroups: Object.entries(ageGroups).map(([age, count]) => ({ age, count }))
            };
        } catch (e) {
            console.error('Error getting children stats:', e);
            return { totalChildren: 0, totalStars: 0, averageStars: 0, ageGroups: [] };
        }
    },

    // Get feedback stats
    getFeedbackStats: async () => {
        try {
            const feedbackColl = collection(db, 'feedback');
            const snapshot = await getDocs(query(feedbackColl, orderBy('createdAt', 'desc'), limit(200)));

            const typeCount: Record<string, number> = { feature: 0, problem: 0, feedback: 0 };
            const statusCount: Record<string, number> = { new: 0, reviewed: 0, resolved: 0 };

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const type = data.type || 'feedback';
                const status = data.status || 'new';
                if (typeCount[type] !== undefined) typeCount[type]++;
                if (statusCount[status] !== undefined) statusCount[status]++;
            });

            return {
                total: snapshot.docs.length,
                byType: Object.entries(typeCount).map(([type, count]) => ({ type, count })),
                byStatus: Object.entries(statusCount).map(([status, count]) => ({ status, count }))
            };
        } catch (e) {
            console.error('Error getting feedback stats:', e);
            return { total: 0, byType: [], byStatus: [] };
        }
    },

    // Get task category breakdown
    getTaskCategoryStats: async () => {
        try {
            const tasksColl = collection(db, 'tasks');
            const snapshot = await getDocs(query(tasksColl, limit(500)));

            const categories: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const cat = data.category || 'other';
                categories[cat] = (categories[cat] || 0) + 1;
            });

            return Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => ({ category, count }));
        } catch (e) {
            console.error('Error getting task category stats:', e);
            return [];
        }
    },

    // Get top active families
    getTopFamilies: async () => {
        try {
            const parentsColl = collection(db, 'parents');
            const childrenColl = collection(db, 'children');
            const tasksColl = collection(db, 'tasks');

            const [parentsSnap, childrenSnap, tasksSnap] = await Promise.all([
                getDocs(query(parentsColl, limit(50))),
                getDocs(query(childrenColl, limit(200))),
                getDocs(query(tasksColl, limit(500)))
            ]);

            // Count children and tasks per family
            const familyStats: Record<string, { name: string; children: number; tasks: number }> = {};

            parentsSnap.docs.forEach(doc => {
                const data = doc.data();
                familyStats[doc.id] = {
                    name: data.familyName || data.displayName || 'Unknown Family',
                    children: 0,
                    tasks: 0
                };
            });

            childrenSnap.docs.forEach(doc => {
                const familyId = doc.data().familyId;
                if (familyStats[familyId]) familyStats[familyId].children++;
            });

            tasksSnap.docs.forEach(doc => {
                const familyId = doc.data().familyId;
                if (familyStats[familyId]) familyStats[familyId].tasks++;
            });

            return Object.entries(familyStats)
                .map(([id, stats]) => ({ id, ...stats }))
                .sort((a, b) => b.tasks - a.tasks)
                .slice(0, 10);
        } catch (e) {
            console.error('Error getting top families:', e);
            return [];
        }
    }
};
