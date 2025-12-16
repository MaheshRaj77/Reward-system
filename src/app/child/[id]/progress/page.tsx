'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { Trophy, Star, Target, TrendingUp, Calendar, Flame, Award } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; weeklyEarned?: number; weeklyLimit?: number };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
}

const LEVEL_CONFIG: Record<number, { title: string; color: string; bgColor: string; minXP: number; maxXP: number }> = {
    1: { title: 'Rookie', color: 'text-emerald-500', bgColor: 'from-emerald-400 to-green-500', minXP: 0, maxXP: 100 },
    2: { title: 'Explorer', color: 'text-blue-500', bgColor: 'from-blue-400 to-cyan-500', minXP: 100, maxXP: 250 },
    3: { title: 'Pro', color: 'text-indigo-500', bgColor: 'from-indigo-400 to-purple-500', minXP: 250, maxXP: 500 },
    4: { title: 'Master', color: 'text-purple-500', bgColor: 'from-purple-400 to-pink-500', minXP: 500, maxXP: 1000 },
    5: { title: 'Legend', color: 'text-amber-500', bgColor: 'from-amber-400 to-orange-500', minXP: 1000, maxXP: 2000 },
};

// Calculate level based on total stars
const calculateLevel = (totalStars: number): number => {
    if (totalStars >= 1000) return 5;
    if (totalStars >= 500) return 4;
    if (totalStars >= 250) return 3;
    if (totalStars >= 100) return 2;
    return 1;
};

export default function ChildProgress() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!childId) return;

        // Real-time listener for child data
        const unsubscribe = onSnapshot(doc(db, 'children', childId), (childDoc) => {
            if (!childDoc.exists()) {
                router.push('/child/login');
                return;
            }
            const data = childDoc.data();
            setChild({
                id: childDoc.id,
                ...data,
                starBalances: data?.starBalances || { growth: 0 },
                streaks: data?.streaks || { currentStreak: 0, longestStreak: 0 },
            } as ChildData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [childId, router]);

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (!child) return null;

    const totalStars = child.starBalances?.growth || 0;
    const currentLevelNum = calculateLevel(totalStars);
    const currentLevel = LEVEL_CONFIG[currentLevelNum];
    const progressToNext = Math.min(100, ((totalStars - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP)) * 100);

    return (
        <div className="space-y-6">

            {/* Level / XP Header */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    {/* Ring Progress */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle
                                cx="64" cy="64" r="58"
                                stroke="currentColor" strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={364}
                                strokeDashoffset={364 - (progressToNext / 100) * 364}
                                className={`${currentLevel.color.replace('text-', 'text-')} transition-all duration-1000 ease-out`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-gray-900">{currentLevelNum}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Level</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">{currentLevel.title}</h2>
                        <p className="text-gray-500 font-medium mb-4">
                            Keep earning stars to reach the next level!
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-2">
                                <Trophy size={16} className="text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-700">{totalStars} Lifetime Stars</span>
                            </div>
                            <div className="px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100 flex items-center gap-2">
                                <TrendingUp size={16} className="text-orange-500" />
                                <span className="text-sm font-bold text-orange-700">Top 10% this week</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-2 text-amber-600">
                        <Star size={20} fill="currentColor" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{child.starBalances?.growth || 0}</div>
                    <div className="text-xs font-medium text-amber-700/60 uppercase">Stars</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2 text-blue-600">
                        <Target size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{child.streaks.currentStreak}</div>
                    <div className="text-xs font-medium text-blue-700/60 uppercase">Day Streak</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-600">
                        <Calendar size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">12</div>
                    <div className="text-xs font-medium text-purple-700/60 uppercase">Days Active</div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-gray-900">Weekly Activity</h3>
                    <div className="flex gap-2 text-xs font-medium">
                        <span className="flex items-center gap-1 text-gray-500"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Tasks</span>
                        <span className="flex items-center gap-1 text-gray-500"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Bonus</span>
                    </div>
                </div>

                <div className="flex items-end justify-between h-40 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                        const height = Math.floor(Math.random() * 80) + 20;
                        return (
                            <div key={day} className="flex flex-col items-center gap-2 flex-1 group">
                                <div className="w-full max-w-[30px] bg-gray-50 rounded-t-lg relative h-full overflow-hidden flex items-end">
                                    <div
                                        style={{ height: `${height}%` }}
                                        className="w-full bg-indigo-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-500 transition-colors">{day}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Achievements Lite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-6 text-white text-center md:text-left flex flex-col md:flex-row items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                        👑
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Champion Status</h3>
                        <p className="text-orange-100 text-sm mt-1">You are in the top 5% of earners this month!</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-6 text-white text-center md:text-left flex flex-col md:flex-row items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                        🔥
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">On Fire!</h3>
                        <p className="text-emerald-100 text-sm mt-1">7 day streak maintained. Keep it up!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
