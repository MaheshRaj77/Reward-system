'use client';

import { useEffect, useState } from 'react';
import { AdminStatsService, DashboardStats } from '@/modules/admin/stats.service';
import { Users, UserCheck, Target, Star, TrendingUp, Activity, Gift, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<any[]>([]);
    const [childrenStats, setChildrenStats] = useState<{ totalChildren: number; totalStars: number }>({ totalChildren: 0, totalStars: 0 });
    const [rewardsCount, setRewardsCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, activityData, childData] = await Promise.all([
                    AdminStatsService.getDashboardStats(),
                    AdminStatsService.getRecentActivity(),
                    AdminStatsService.getChildrenStats()
                ]);
                setStats(statsData);
                setActivities(activityData);
                setChildrenStats({ totalChildren: childData.totalChildren, totalStars: childData.totalStars });

                // Fetch rewards count (standard + custom)
                const { collection, getCountFromServer } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                const [rewardsSnap, customRewardsSnap] = await Promise.all([
                    getCountFromServer(collection(db, 'rewards')),
                    getCountFromServer(collection(db, 'customRewardRequests'))
                ]);
                setRewardsCount(rewardsSnap.data().count + customRewardsSnap.data().count);
            } catch (error) {
                console.error('Failed to fetch admin stats', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Spinner size="lg" className="text-indigo-500" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, Admin</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Parents</p>
                        <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Star size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Children</p>
                        <p className="text-3xl font-bold">{childrenStats.totalChildren}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Target size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Tasks</p>
                        <p className="text-3xl font-bold">{stats.totalTasks}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-green-500/20">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Gift size={28} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Rewards</p>
                        <p className="text-3xl font-bold">{rewardsCount}</p>
                    </div>
                </div>
            </div>



            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Links */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-500" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/admin/users" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-center transition-colors">
                            <Users className="mx-auto text-blue-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Users</p>
                        </Link>
                        <Link href="/admin/families" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-center transition-colors">
                            <UserCheck className="mx-auto text-purple-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Families</p>
                        </Link>
                        <Link href="/admin/tasks" className="p-4 bg-green-50 hover:bg-green-100 rounded-xl text-center transition-colors">
                            <Target className="mx-auto text-green-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Tasks</p>
                        </Link>
                        <Link href="/admin/rewards" className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl text-center transition-colors">
                            <Gift className="mx-auto text-amber-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Rewards</p>
                        </Link>
                        <Link href="/admin/feedback" className="p-4 bg-pink-50 hover:bg-pink-100 rounded-xl text-center transition-colors">
                            <MessageSquare className="mx-auto text-pink-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Feedback</p>
                        </Link>
                        <Link href="/admin/subscriptions" className="p-4 bg-rose-50 hover:bg-rose-100 rounded-xl text-center transition-colors">
                            <Star className="mx-auto text-rose-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">Subscriptions</p>
                        </Link>
                        <Link href="/admin/analytics" className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-center transition-colors col-span-2">
                            <TrendingUp className="mx-auto text-indigo-600 mb-2" size={24} />
                            <p className="text-sm font-medium text-gray-700">View Analytics</p>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" />
                        Recent Activity
                    </h2>
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 font-medium truncate">{activity.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                        {activities.length === 0 && (
                            <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
