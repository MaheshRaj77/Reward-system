'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { ArrowLeft, Star, Activity, Trophy, Key } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; weeklyEarned?: number };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
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

export default function ChildDetailPage() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [child, setChild] = useState<ChildData | null>(null);
    const [recentActivity, setRecentActivity] = useState<TaskCompletion[]>([]);
    const [heatmapCompletions, setHeatmapCompletions] = useState<Date[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'assigned'>('all');

    useEffect(() => {
        let unsubscribeChild: (() => void) | null = null;
        let unsubscribeCompletions: (() => void) | null = null;
        let unsubscribeHeatmap: (() => void) | null = null;

        const setupListeners = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                // Real-time listener for child data
                unsubscribeChild = onSnapshot(doc(db, 'children', childId), (childDoc) => {
                    if (!childDoc.exists()) {
                        router.push('/children');
                        return;
                    }

                    const childData = childDoc.data();
                    if (childData.familyId !== parent.id) {
                        router.push('/children');
                        return;
                    }

                    setChild({
                        id: childDoc.id,
                        ...childData,
                    } as ChildData);
                    setLoading(false);
                });

                // Real-time listener for recent completions (limited to 20 for activity log)
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('childId', '==', childId),
                    orderBy('completedAt', 'desc'),
                    limit(20)
                );

                unsubscribeCompletions = onSnapshot(completionsQuery, async (snapshot) => {
                    const completions: TaskCompletion[] = [];

                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
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
                });

                // Real-time listener for heatmap data (all completions in last 90 days)
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                ninetyDaysAgo.setHours(0, 0, 0, 0);

                // Query without status filter to avoid needing a composite index
                // Filter by status in code instead
                const heatmapQuery = query(
                    collection(db, 'taskCompletions'),
                    where('childId', '==', childId)
                );

                unsubscribeHeatmap = onSnapshot(heatmapQuery, (snapshot) => {
                    const completionDates: Date[] = [];
                    snapshot.docs.forEach(docSnap => {
                        const data = docSnap.data();
                        // Filter: only approved completions from last 90 days
                        if (data.status === 'approved' && data.completedAt?.seconds) {
                            const completionDate = new Date(data.completedAt.seconds * 1000);
                            if (completionDate >= ninetyDaysAgo) {
                                completionDates.push(completionDate);
                            }
                        }
                    });
                    setHeatmapCompletions(completionDates);
                });

            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        setupListeners();

        return () => {
            if (unsubscribeChild) unsubscribeChild();
            if (unsubscribeCompletions) unsubscribeCompletions();
            if (unsubscribeHeatmap) unsubscribeHeatmap();
        };
    }, [childId, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!child) {
        return null; // Or a not found state
    }

    const age = new Date().getFullYear() - child.birthYear;

    const generateHeatmapData = () => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);

        const heatmapData: { date: Date; count: number }[] = [];

        for (let i = 0; i < 90; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            heatmapData.push({ date, count: 0 });
        }

        // Use heatmapCompletions (all approved completions from last 90 days)
        heatmapCompletions.forEach(completionDate => {
            const dateOnly = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());

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

    const filteredActivity = activeTab === 'all'
        ? recentActivity
        : activeTab === 'completed'
            ? recentActivity.filter(a => a.status === 'approved')
            : recentActivity.filter(a => a.status !== 'approved');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-indigo-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900">Child Profile</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Profile Card & Stats */}
                    <div className="space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-xl shadow-indigo-100/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl shadow-lg mb-4 transform transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: child.avatar.backgroundColor }}>
                                    {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{child.name}</h2>
                                <p className="text-indigo-500 font-medium mb-4">{AGE_GROUP_LABELS[child.ageGroup]}</p>

                                <div className="flex flex-wrap justify-center gap-2 mb-6">
                                    <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                                        {age} Years Old
                                    </Badge>
                                </div>

                                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Key size={16} />
                                        <span>Secret PIN</span>
                                    </div>
                                    <span className="font-mono font-bold text-lg text-gray-900 tracking-widest">{child.pin}</span>
                                </div>
                            </div>
                        </div>

                        {/* Star Balance Card */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6 shadow-lg shadow-amber-100/50">
                            <div className="flex items-center gap-2 text-amber-600 font-semibold mb-2">
                                <Star size={20} fill="currentColor" />
                                <span>Stars</span>
                            </div>
                            <div className="text-4xl font-bold text-gray-900">{child.starBalances?.growth || 0}</div>
                            <p className="text-sm text-amber-600/80 mt-1">available to spend</p>
                        </div>

                        {/* Streak Stats */}
                        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Trophy size={18} className="text-indigo-500" />
                                Streak Stats
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-indigo-50/50 rounded-2xl">
                                    <div className="text-2xl font-bold text-indigo-600">{child.streaks.currentStreak}</div>
                                    <div className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Current</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50/50 rounded-2xl">
                                    <div className="text-2xl font-bold text-purple-600">{child.streaks.longestStreak}</div>
                                    <div className="text-xs text-purple-400 font-medium uppercase tracking-wider">Best</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity & Charts */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Weekly Progress */}
                        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-6">Weekly Progress</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm font-medium mb-2">
                                        <span className="text-gray-600">Stars Earned This Week</span>
                                        <span className="text-gray-900">{child.starBalances?.weeklyEarned || 0} / 100</span>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${Math.min(100, (child.starBalances?.weeklyEarned || 0))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Heatmap */}
                        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900">Consistency View</h3>
                                <span className="text-xs text-gray-500">Last 90 Days</span>
                            </div>
                            <div className="overflow-x-auto pb-2">
                                <div className="flex gap-1 min-w-full">
                                    {heatmapData.map((day, idx) => {
                                        const intensity = Math.min(day.count, 4);
                                        const colors = ['bg-gray-100', 'bg-indigo-200', 'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-600'];
                                        return (
                                            <div
                                                key={idx}
                                                className={`w-3 h-8 rounded-sm flex-shrink-0 transition-opacity hover:opacity-80 ${colors[intensity]}`}
                                                title={`${day.date.toLocaleDateString()}: ${day.count} tasks`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Feed */}
                        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" />
                                    Activity Log
                                </h3>
                                <div className="flex p-1 bg-gray-100/80 rounded-xl">
                                    {['all', 'completed'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {filteredActivity.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">💤</div>
                                        <p className="text-gray-500 font-medium">No activity found</p>
                                    </div>
                                ) : (
                                    filteredActivity.map(activity => (
                                        <div key={activity.id} className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl transition-all hover:shadow-md hover:border-indigo-100">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${activity.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                activity.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {activity.status === 'approved' ? '✓' : activity.status === 'rejected' ? '✕' : '⏳'}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900">{activity.taskTitle}</h4>
                                                <p className="text-xs text-gray-500 font-medium">
                                                    {new Date(activity.completedAt.seconds * 1000).toLocaleDateString()} at {new Date(activity.completedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-100">
                                                ⭐ +{activity.starsAwarded}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
