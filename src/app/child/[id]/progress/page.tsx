'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { Trophy, Star, Target, TrendingUp, Calendar as CalendarIcon, Flame, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; weeklyEarned?: number; weeklyLimit?: number };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
}

interface CompletionData {
    id: string;
    completedAt: { seconds: number };
    status: string;
    starsAwarded: number;
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
    const [completions, setCompletions] = useState<CompletionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(new Date()); // For Calendar navigation

    useEffect(() => {
        const loadData = async () => {
            try {
                const childDoc = await getDoc(doc(db, 'children', childId));
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

                // Fetch recent completions for stats
                // Fetch recent completions for stats
                // NOTE: We fetch all and filter in memory to avoid needing a composite index on [childId, status, completedAt]
                const q = query(
                    collection(db, 'taskCompletions'),
                    where('childId', '==', childId),
                    orderBy('completedAt', 'desc'),
                    limit(150) // Fetch slightly more to account for rejected/pending ones
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const allData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as CompletionData[];

                    // Filter for approved/auto-approved only
                    const approvedData = allData.filter(c =>
                        c.status === 'approved' || c.status === 'auto-approved'
                    );

                    setCompletions(approvedData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };
        if (childId) {
            loadData();
        }
    }, [childId, router]);

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (!child) return null;

    const totalStars = child.starBalances?.growth || 0;
    const currentLevelNum = calculateLevel(totalStars);
    const currentLevel = LEVEL_CONFIG[currentLevelNum];
    const progressToNext = Math.min(100, ((totalStars - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP)) * 100);

    // --- Chart Data Calculation ---
    // 1. Weekly Activity
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sun
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Start of current week (Monday)

    const weeklyStats = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    completions.forEach(c => {
        const date = new Date(c.completedAt.seconds * 1000);
        if (date >= monday) {
            let dayIndex = date.getDay() - 1; // Mon=0, Sun=6
            if (dayIndex === -1) dayIndex = 6; // Fix Sunday
            if (dayIndex >= 0 && dayIndex < 7) {
                weeklyStats[dayIndex]++;
            }
        }
    });

    const maxWeekly = Math.max(...weeklyStats, 5); // Minimum scale of 5

    // 2. Calendar Data
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 Sun - 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust first day for Mon-start grid (optional, but let's stick to standard Sun-start for calendar usually)
    // Let's use Sun-start grid for simplicity
    const emptyDays = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Check activity for each day
    const activeDaysSet = new Set(
        completions.map(c => new Date(c.completedAt.seconds * 1000).toDateString())
    );

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

    return (
        <div className="space-y-6">
            {/* Header + Level Ring */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Level Ring */}
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

                    <div className="flex-1 text-center md:text-left">
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
                                <span className="text-sm font-bold text-orange-700">{child.streaks.currentStreak} Day Streak</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
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
                    <div className="text-2xl font-bold text-gray-900">{completions.length}</div>
                    <div className="text-xs font-medium text-blue-700/60 uppercase">Tasks Done</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-600">
                        <CalendarIcon size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{child.streaks.longestStreak}</div>
                    <div className="text-xs font-medium text-purple-700/60 uppercase">Best Streak</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-2 text-pink-600">
                        <Flame size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{activeDaysSet.size}</div>
                    <div className="text-xs font-medium text-pink-700/60 uppercase">Active Days</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Real Weekly Activity Chart */}
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900">Weekly Activity</h3>
                        <div className="flex gap-2 text-xs font-medium">
                            <span className="flex items-center gap-1 text-gray-500"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Tasks</span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between h-40 gap-2">
                        {dayLabels.map((day, i) => {
                            const count = weeklyStats[i];
                            const height = (count / maxWeekly) * 100;
                            const isToday = i === (new Date().getDay() - 1 === -1 ? 6 : new Date().getDay() - 1);

                            return (
                                <div key={day} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="w-full max-w-[30px] bg-gray-50 rounded-t-lg relative h-full overflow-hidden flex items-end">
                                        <div
                                            style={{ height: `${height || 5}%` }}
                                            className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-indigo-600 shadow-indigo-200' : 'bg-indigo-300'} opacity-90 group-hover:opacity-100`}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{day}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Real Streak Calendar */}
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-900">Streak Calendar</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-500" /></button>
                            <span className="font-bold text-gray-700 min-w-[100px] text-center">
                                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} disabled={isCurrentMonth} className={`p-1 rounded-full transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}><ChevronRight size={20} className="text-gray-500" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className="text-xs font-bold text-gray-400 h-8 flex items-center justify-center">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                        {days.map(day => {
                            const date = new Date(year, month, day);
                            const dateStr = date.toDateString();
                            const isActive = activeDaysSet.has(dateStr);
                            const isToday = new Date().toDateString() === dateStr;

                            return (
                                <div
                                    key={day}
                                    className={`
                                        h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative
                                        ${isActive
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm font-bold'
                                            : isToday
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                : 'bg-gray-50 text-gray-400'
                                        }
                                    `}
                                >
                                    {day}
                                    {isActive && <div className="absolute -bottom-1"><Flame size={10} fill="currentColor" className="text-white drop-shadow-sm" /></div>}
                                </div>
                            );
                        })}
                    </div>
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
