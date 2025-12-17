/**
 * Dashboard Service
 * 
 * Service layer for dashboard-related operations
 */

import {
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DashboardStats {
    totalStars: number;
    activeTasks: number;
    totalCompletions: number;
    familyStreak: number;
}

export interface ChildSummary {
    id: string;
    name: string;
    stars: number;
    streak: number;
    ageGroup: string;
    avatar: { presetId: string; backgroundColor: string };
}

export interface DashboardData {
    stats: DashboardStats;
    children: ChildSummary[];
    pendingApprovalsCount: number;
}

export class DashboardService {
    /**
     * Get dashboard statistics for a family
     */
    async getStats(familyId: string): Promise<DashboardStats> {
        try {
            // Get children to calculate total stars and max streak
            const childrenQuery = query(
                collection(db, 'children'),
                where('familyId', '==', familyId)
            );
            const childrenSnap = await getDocs(childrenQuery);

            let totalStars = 0;
            let familyStreak = 0;

            childrenSnap.docs.forEach((doc: { data: () => Record<string, unknown> }) => {
                const data = doc.data();
                totalStars += (data.starBalances as { growth: number } | undefined)?.growth || 0;
                familyStreak = Math.max(familyStreak, (data.streaks as { currentStreak: number } | undefined)?.currentStreak || 0);
            });

            // Get active tasks count
            const tasksQuery = query(
                collection(db, 'tasks'),
                where('familyId', '==', familyId),
                where('isActive', '==', true)
            );
            const tasksSnap = await getDocs(tasksQuery);
            const activeTasks = tasksSnap.size;

            // Get completions count
            const completionsQuery = query(
                collection(db, 'taskCompletions'),
                where('familyId', '==', familyId)
            );
            const completionsSnap = await getDocs(completionsQuery);
            const totalCompletions = completionsSnap.size;

            return {
                totalStars,
                activeTasks,
                totalCompletions,
                familyStreak,
            };
        } catch (error) {
            console.error('[DashboardService] Error getting stats:', error);
            return {
                totalStars: 0,
                activeTasks: 0,
                totalCompletions: 0,
                familyStreak: 0,
            };
        }
    }

    /**
     * Get children summary for dashboard
     */
    async getChildren(familyId: string): Promise<ChildSummary[]> {
        try {
            const childrenQuery = query(
                collection(db, 'children'),
                where('familyId', '==', familyId)
            );
            const childrenSnap = await getDocs(childrenQuery);

            return childrenSnap.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name as string,
                    stars: (data.starBalances as { growth: number } | undefined)?.growth || 0,
                    streak: (data.streaks as { currentStreak: number } | undefined)?.currentStreak || 0,
                    ageGroup: data.ageGroup as string,
                    avatar: data.avatar as { presetId: string; backgroundColor: string },
                };
            });
        } catch (error) {
            console.error('[DashboardService] Error getting children:', error);
            return [];
        }
    }

    /**
     * Get pending approvals count
     */
    async getPendingApprovalsCount(familyId: string): Promise<number> {
        try {
            // Pending task completions
            const taskCompletionsQuery = query(
                collection(db, 'taskCompletions'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending_approval')
            );
            const taskCompletionsSnap = await getDocs(taskCompletionsQuery);

            // Pending reward requests
            const rewardRequestsQuery = query(
                collection(db, 'rewardRequests'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending')
            );
            const rewardRequestsSnap = await getDocs(rewardRequestsQuery);

            return taskCompletionsSnap.size + rewardRequestsSnap.size;
        } catch (error) {
            console.error('[DashboardService] Error getting pending approvals:', error);
            return 0;
        }
    }

    /**
     * Get full dashboard data
     */
    async getDashboardData(familyId: string): Promise<DashboardData> {
        const [stats, children, pendingApprovalsCount] = await Promise.all([
            this.getStats(familyId),
            this.getChildren(familyId),
            this.getPendingApprovalsCount(familyId),
        ]);

        return {
            stats,
            children,
            pendingApprovalsCount,
        };
    }

    /**
     * Subscribe to real-time children updates
     */
    subscribeToChildren(
        familyId: string,
        callback: (children: ChildSummary[]) => void
    ): Unsubscribe {
        const childrenQuery = query(
            collection(db, 'children'),
            where('familyId', '==', familyId)
        );

        return onSnapshot(childrenQuery, (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
            const children = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name as string,
                    stars: (data.starBalances as { growth: number } | undefined)?.growth || 0,
                    streak: (data.streaks as { currentStreak: number } | undefined)?.currentStreak || 0,
                    ageGroup: data.ageGroup as string,
                    avatar: data.avatar as { presetId: string; backgroundColor: string },
                };
            });
            callback(children);
        });
    }

    /**
     * Subscribe to real-time tasks count updates
     */
    subscribeToTasksCount(
        familyId: string,
        callback: (count: number) => void
    ): Unsubscribe {
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('familyId', '==', familyId),
            where('isActive', '==', true)
        );

        return onSnapshot(tasksQuery, (snapshot: { size: number }) => {
            callback(snapshot.size);
        });
    }

    /**
     * Subscribe to real-time completions count updates
     */
    subscribeToCompletionsCount(
        familyId: string,
        callback: (count: number) => void
    ): Unsubscribe {
        const completionsQuery = query(
            collection(db, 'taskCompletions'),
            where('familyId', '==', familyId)
        );

        return onSnapshot(completionsQuery, (snapshot: { size: number }) => {
            callback(snapshot.size);
        });
    }
}

export const dashboardService = new DashboardService();
