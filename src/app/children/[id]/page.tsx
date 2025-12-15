'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { AdjustableTrustLevel } from '@/components/child';
import { useChildren } from '@/lib/hooks/use-children';
import type { Child } from '@/types';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; fun: number; weeklyEarned?: { growth: number; fun: number } };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
    trustLevel: number;
    birthYear: number;
    pin: string;
}

interface TaskCompletion {
    id: string;
    taskId: string;
    taskTitle: string;
    status: 'pending' | 'approved' | 'rejected';
    starsAwarded: number;
    starType: string;
    completedAt: { seconds: number };
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const AGE_GROUP_LABELS: Record<string, string> = {
    '4-6': 'Little Explorer',
    '7-10': 'Rising Star',
    '11-14': 'Teen Achiever',
    '15+': 'Young Adult',
};

const TRUST_LEVELS: Record<number, { name: string; color: string; description: string }> = {
    1: { name: 'Beginner', color: '#EF4444', description: 'All tasks need approval' },
    2: { name: 'Learning', color: '#F97316', description: 'Most tasks need approval' },
    3: { name: 'Trusted', color: '#EAB308', description: 'Some tasks auto-approve' },
    4: { name: 'Reliable', color: '#22C55E', description: 'Most tasks auto-approve' },
    5: { name: 'Champion', color: '#3B82F6', description: 'Full trust - all auto-approve' },
};

export default function ChildDetailPage() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;
    const { children, adjustTrustLevel } = useChildren();

    const [loading, setLoading] = useState(true);
    const [child, setChild] = useState<ChildData | null>(null);
    const [fullChild, setFullChild] = useState<Child | null>(null);
    const [recentActivity, setRecentActivity] = useState<TaskCompletion[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'assigned'>('all');
    const [adjustingTrust, setAdjustingTrust] = useState(false);

    useEffect(() => {
        const loadChild = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                // Load child data
                const childDoc = await getDoc(doc(db, 'children', childId));
                if (!childDoc.exists()) {
                    router.push('/children');
                    return;
                }

                const childData = childDoc.data();
                if (childData.familyId !== parent.familyId) {
                    router.push('/children');
                    return;
                }

                setChild({
                    id: childDoc.id,
                    ...childData,
                } as ChildData);

                // Load recent completions
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('childId', '==', childId),
                    orderBy('completedAt', 'desc'),
                    limit(10)
                );

                const completionsSnapshot = await getDocs(completionsQuery);
                const completions: TaskCompletion[] = [];

                for (const docSnap of completionsSnapshot.docs) {
                    const data = docSnap.data();
                    // Get task title
                    let taskTitle = 'Task';
                    const taskDoc = await getDoc(doc(db, 'tasks', data.taskId));
                    if (taskDoc.exists()) {
                        taskTitle = taskDoc.data().title;
                    }

                    completions.push({
                        id: docSnap.id,
                        taskId: data.taskId,
                        taskTitle,
                        status: data.status,
                        starsAwarded: data.starsAwarded,
                        starType: data.starType,
                        completedAt: data.completedAt,
                    });
                }

                setRecentActivity(completions);
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        loadChild();
    }, [childId, router]);

    // Sync with children from hook
    useEffect(() => {
        const syncedChild = children.find(c => c.id === childId);
        if (syncedChild) {
            setFullChild(syncedChild);
            setChild(prev => prev ? { ...prev, trustLevel: syncedChild.trustLevel } : null);
        }
    }, [children, childId]);

    const handleTrustAdjustment = async (newLevel: 1 | 2 | 3 | 4 | 5, reason: string) => {
        setAdjustingTrust(true);
        const result = await adjustTrustLevel(childId, newLevel, reason);
        setAdjustingTrust(false);
        
        if (!result.success) {
            console.error('Failed to adjust trust:', result.error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!child) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <p className="text-gray-900 font-semibold">Child not found</p>
            </div>
        );
    }

    const trust = TRUST_LEVELS[child.trustLevel] || TRUST_LEVELS[1];
    const age = new Date().getFullYear() - child.birthYear;
    const totalStars = child.starBalances.growth + child.starBalances.fun;

    // Generate heat map data for streak visualization
    const generateHeatmapData = () => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90); // Last 90 days
        
        const heatmapData: { date: Date; count: number }[] = [];
        
        // Create entries for each day
        for (let i = 0; i < 90; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            heatmapData.push({ date, count: 0 });
        }
        
        // Count activities per day
        recentActivity.forEach(activity => {
            const activityDate = new Date(activity.completedAt.seconds * 1000);
            const dateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
            
            const heatmapEntry = heatmapData.find(h => {
                const hDate = new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate());
                return hDate.getTime() === dateOnly.getTime();
            });
            
            if (heatmapEntry) {
                heatmapEntry.count++;
            }
        });
        
        return heatmapData;
    };

    const heatmapData = generateHeatmapData();

    // Filter activity based on tab
    const filteredActivity = activeTab === 'all' 
        ? recentActivity
        : activeTab === 'completed' 
        ? recentActivity.filter(a => a.status === 'approved')
        : recentActivity.filter(a => a.status !== 'approved');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/children" className="text-gray-600 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">{child.name}</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Profile Header */}
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 mb-6 shadow-lg">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div
                            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-xl"
                            style={{ backgroundColor: child.avatar.backgroundColor }}
                        >
                            {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{child.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge>{AGE_GROUP_LABELS[child.ageGroup]}</Badge>
                                <Badge variant="default">{age} years old</Badge>
                                <span
                                    className="px-3 py-1 text-sm rounded-full"
                                    style={{ backgroundColor: `${trust.color}30`, color: trust.color }}
                                >
                                    {trust.name}
                                </span>
                            </div>
                            <p className="text-gray-700 text-sm mt-2 font-semibold">{trust.description}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6 text-center shadow-lg">
                        <div className="text-4xl font-bold text-yellow-700">{child.starBalances.growth}</div>
                        <div className="text-yellow-700 text-sm mt-2 font-semibold">⭐ Growth Stars</div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-2xl p-6 text-center shadow-lg">
                        <div className="text-4xl font-bold text-pink-700">{child.starBalances.fun}</div>
                        <div className="text-pink-700 text-sm mt-2 font-semibold">🎉 Fun Stars</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 text-center shadow-lg">
                        <div className="text-4xl font-bold text-orange-700">{child.streaks.currentStreak}</div>
                        <div className="text-orange-700 text-sm mt-2 font-semibold">🔥 Current Streak</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 text-center shadow-lg">
                        <div className="text-4xl font-bold text-purple-700">{child.streaks.longestStreak}</div>
                        <div className="text-purple-700 text-sm mt-2 font-semibold">🏆 Best Streak</div>
                    </div>
                </div>

                {/* Trust Level Progress */}
                <div className="mb-6">
                    {fullChild && (
                        <AdjustableTrustLevel 
                            child={fullChild} 
                            onAdjust={handleTrustAdjustment}
                            isLoading={adjustingTrust}
                        />
                    )}
                </div>

                {/* Weekly Progress */}
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 mb-6 shadow-lg">
                    <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-700 text-sm font-semibold">Growth Stars</span>
                                <span className="text-gray-900 font-semibold">
                                    {child.starBalances.weeklyEarned?.growth || 0} / 100
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (child.starBalances.weeklyEarned?.growth || 0))}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-700 text-sm font-semibold">Fun Stars</span>
                                <span className="text-gray-900 font-semibold">
                                    {child.starBalances.weeklyEarned?.fun || 0} / 50
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((child.starBalances.weeklyEarned?.fun || 0) / 50) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* PIN Display */}
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-2xl p-6 mb-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">Login PIN</h3>
                            <p className="text-sm text-indigo-700 font-semibold">{child.name} uses this to sign in</p>
                        </div>
                        <div className="bg-indigo-200 backdrop-blur-sm rounded-xl px-6 py-3 border border-indigo-300">
                            <p className="text-2xl font-bold text-indigo-900 tracking-[0.5em] font-mono">{child.pin}</p>
                        </div>
                    </div>
                </div>

                {/* Streak Heat Map */}
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 mb-6 shadow-lg">
                    <h3 className="font-semibold text-gray-900 mb-4">90-Day Activity Heat Map</h3>
                    <div className="overflow-x-auto">
                        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 1fr))', minWidth: '100%' }}>
                            {heatmapData.map((day, idx) => {
                                const intensity = Math.min(day.count, 4);
                                const colors = ['bg-gray-100', 'bg-yellow-200', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600'];
                                return (
                                    <div
                                        key={idx}
                                        className={`w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-xs font-semibold text-white transition-all hover:scale-110 hover:shadow-lg ${colors[intensity]}`}
                                        title={`${day.date.toLocaleDateString()}: ${day.count} task${day.count !== 1 ? 's' : ''}`}
                                    >
                                        {day.count > 0 ? day.count : ''}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                            <div className="w-4 h-4 bg-yellow-200 border border-gray-300 rounded"></div>
                            <div className="w-4 h-4 bg-yellow-400 border border-gray-300 rounded"></div>
                            <div className="w-4 h-4 bg-orange-500 border border-gray-300 rounded"></div>
                            <div className="w-4 h-4 bg-red-600 border border-gray-300 rounded"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>

                {/* Recent Activity with Tabs */}
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'assigned', label: 'Assigned' },
                            ].map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setActiveTab(tab.value as 'all' | 'completed' | 'assigned')}
                                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                        activeTab === tab.value
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {filteredActivity.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">
                            {activeTab === 'all' && 'No activity yet'}
                            {activeTab === 'completed' && 'No completed tasks yet'}
                            {activeTab === 'assigned' && 'No assigned tasks yet'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {filteredActivity.map(activity => (
                                <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        activity.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {activity.status === 'approved' ? '✓' : activity.status === 'rejected' ? '✕' : '⏳'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 font-semibold">{activity.taskTitle}</p>
                                        <p className="text-xs text-gray-600 font-medium">
                                            {new Date(activity.completedAt.seconds * 1000).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant={activity.status === 'approved' ? 'success' : activity.status === 'rejected' ? 'danger' : 'warning'}>
                                        {activity.starType === 'growth' ? '⭐' : '🎉'} {activity.starsAwarded}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
