'use client';

import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { AdminStatsService } from '@/modules/admin/stats.service';
import { Spinner } from '@/components/ui';
import { Activity, Users, Gift, Star, TrendingUp, MessageSquare, Target, Trophy } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        growth: { date: string; users: number }[];
        children: { totalChildren: number; totalStars: number; averageStars: number; ageGroups: { age: string; count: number }[] };
        feedback: { total: number; byType: { type: string; count: number }[]; byStatus: { status: string; count: number }[] };
        categories: { category: string; count: number }[];
        topFamilies: { id: string; name: string; children: number; tasks: number }[];
        dashboardStats: {
            totalUsers: number;
            totalFamilies: number;
            totalTasks: number;
            completedTasks: number;
            totalRevenue: number;
            activeSubscriptions: number;
        };
    }>({
        growth: [],
        children: { totalChildren: 0, totalStars: 0, averageStars: 0, ageGroups: [] },
        feedback: { total: 0, byType: [], byStatus: [] },
        categories: [],
        topFamilies: [],
        dashboardStats: { totalUsers: 0, totalFamilies: 0, totalTasks: 0, completedTasks: 0, totalRevenue: 0, activeSubscriptions: 0 }
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [growth, children, feedback, categories, topFamilies, dashboardStats] = await Promise.all([
                    AdminStatsService.getGrowthStats(),
                    AdminStatsService.getChildrenStats(),
                    AdminStatsService.getFeedbackStats(),
                    AdminStatsService.getTaskCategoryStats(),
                    AdminStatsService.getTopFamilies(),
                    AdminStatsService.getDashboardStats()
                ]);
                setData({ growth, children, feedback, categories, topFamilies, dashboardStats });
            } catch (error) {
                console.error("Analytics Load Error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" className="text-indigo-500" /></div>;

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-500">Comprehensive insights into your platform activity</p>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{data.dashboardStats.totalUsers}</p>
                            <p className="text-sm text-gray-500">Total Parents</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                            <Star size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{data.children.totalChildren}</p>
                            <p className="text-sm text-gray-500">Total Children</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{data.dashboardStats.totalTasks}</p>
                            <p className="text-sm text-gray-500">Total Tasks</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{data.children.totalStars}</p>
                            <p className="text-sm text-gray-500">Total Stars Earned</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Users className="text-blue-500" size={20} /> User Growth (7 Days)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.growth}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} name="New Users" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform Health Summary */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="text-purple-500" size={20} /> Platform Health
                        </h3>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <Users size={28} />
                            </div>
                            <div>
                                <p className="text-4xl font-bold">{data.dashboardStats.activeSubscriptions}</p>
                                <p className="text-sm text-white/80">Active Subscriptions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <p className="text-4xl font-bold">{data.dashboardStats.totalFamilies}</p>
                                <p className="text-sm text-white/80">Active Families</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-2 gap-6">
                {/* Engagement Metrics */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Gift className="text-pink-500" size={20} /> Engagement Metrics
                        </h3>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Star size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-white/80">Avg Stars per Child</p>
                                <p className="text-3xl font-bold">{data.children.averageStars} ⭐</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Target size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-white/80">Tasks per Family</p>
                                <p className="text-3xl font-bold">
                                    {data.dashboardStats.totalFamilies > 0
                                        ? Math.round(data.dashboardStats.totalTasks / data.dashboardStats.totalFamilies)
                                        : 0}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl text-white">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-white/80">Children per Family</p>
                                <p className="text-3xl font-bold">
                                    {data.dashboardStats.totalFamilies > 0
                                        ? (data.children.totalChildren / data.dashboardStats.totalFamilies).toFixed(1)
                                        : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task Categories Pie */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Target className="text-green-500" size={20} /> Task Categories
                        </h3>
                    </div>
                    <div className="h-64 w-full flex items-center justify-center">
                        {data.categories.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.categories}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="category"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {data.categories.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400">No category data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* Children Age Groups */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <Star className="text-amber-500" size={20} /> Children by Age Group
                    </h3>
                    <div className="space-y-3">
                        {data.children.ageGroups.map((group, i) => (
                            <div key={group.age} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{group.age} years</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-gray-100 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${data.children.totalChildren > 0 ? (group.count / data.children.totalChildren) * 100 : 0}%`,
                                                backgroundColor: COLORS[i % COLORS.length]
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 w-8">{group.count}</span>
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 border-t mt-2">
                            <p className="text-sm text-gray-500">Average Stars: <span className="font-bold text-gray-900">{data.children.averageStars}</span></p>
                        </div>
                    </div>
                </div>

                {/* Feedback Summary */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <MessageSquare className="text-indigo-500" size={20} /> Feedback Summary
                    </h3>
                    <div className="text-center mb-4">
                        <p className="text-4xl font-bold text-gray-900">{data.feedback.total}</p>
                        <p className="text-sm text-gray-500">Total Feedback</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {data.feedback.byType.map(item => (
                            <div key={item.type} className="text-center p-2 bg-gray-50 rounded-lg">
                                <p className="text-lg font-bold text-gray-900">{item.count}</p>
                                <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {data.feedback.byStatus.map(item => (
                            <div key={item.status} className="text-center p-2 rounded-lg" style={{
                                backgroundColor: item.status === 'new' ? '#fef3c7' : item.status === 'reviewed' ? '#dbeafe' : '#d1fae5'
                            }}>
                                <p className="text-lg font-bold text-gray-900">{item.count}</p>
                                <p className="text-xs text-gray-600 capitalize">{item.status}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Families */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <TrendingUp className="text-green-500" size={20} /> Most Active Families
                    </h3>
                    <div className="space-y-2">
                        {data.topFamilies.slice(0, 5).map((family, i) => (
                            <div key={family.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{family.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{family.children} 👶</span>
                                    <span className="font-medium text-indigo-600">{family.tasks} tasks</span>
                                </div>
                            </div>
                        ))}
                        {data.topFamilies.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">No family data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
