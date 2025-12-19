'use client';

import { useEffect, useState } from 'react';
import { AdminStatsService, DashboardStats } from '@/modules/admin/stats.service';
import { Users, UserCheck, CheckCircle, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, activityData] = await Promise.all([
                    AdminStatsService.getDashboardStats(),
                    AdminStatsService.getRecentActivity()
                ]);
                setStats(statsData);
                setActivities(activityData);
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

    const cards = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Families', value: stats.totalFamilies, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Tasks Completed', value: stats.completedTasks.toLocaleString(), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, Admin</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">{card.label}</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section (Placeholder) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-indigo-500" />
                            Growth Analytics
                        </h2>
                        <select className="text-sm bg-gray-50 border-none rounded-lg px-3 py-1 focus:ring-0">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">Analytics Chart Module Placeholder</p>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" />
                        Recent Activity
                    </h2>
                    <div className="space-y-6">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-4">
                                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
