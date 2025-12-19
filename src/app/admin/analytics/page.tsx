'use client';

import { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { AdminStatsService } from '@/modules/admin/stats.service';
import { Spinner } from '@/components/ui';
import { Activity, Users, TrendingUp } from 'lucide-react';

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [internalData, setInternalData] = useState<{
        growth: any[];
        tasks: any[];
    }>({ growth: [], tasks: [] });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Internal Data Only
                const [growth, tasks] = await Promise.all([
                    AdminStatsService.getGrowthStats(),
                    AdminStatsService.getTaskStats()
                ]);
                setInternalData({ growth, tasks });
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
                <h1 className="text-2xl font-bold text-gray-900">Internal Analytics</h1>
                <p className="text-gray-500">System performance based on database activity</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* User Growth Chart (Internal) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Users className="text-blue-500" size={20} /> User Growth (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={internalData.growth}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} name="New Users" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Task Completion (Internal) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Activity className="text-purple-500" size={20} /> Task Completions (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={internalData.tasks}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="tasks" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Completed Tasks" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
