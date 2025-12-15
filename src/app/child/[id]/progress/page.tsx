'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, Badge, Spinner, ProgressBar } from '@/components/ui';
import { STREAK_MILESTONES, ACHIEVEMENTS } from '@/lib/constants';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; fun: number; weeklyEarned: { growth: number; fun: number }; weeklyLimit: { growth: number; fun: number } };
    streaks: { currentStreak: number; longestStreak: number };
    trustLevel: number;
    ageGroup: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const TRUST_INFO: Record<number, { name: string; color: string }> = {
    1: { name: 'Beginner', color: '#EF4444' },
    2: { name: 'Learning', color: '#F97316' },
    3: { name: 'Trusted', color: '#EAB308' },
    4: { name: 'Reliable', color: '#22C55E' },
    5: { name: 'Champion', color: '#3B82F6' },
};

export default function ChildProgress() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [loading, setLoading] = useState(true);

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
                    name: data.name,
                    avatar: data.avatar,
                    starBalances: data.starBalances,
                    streaks: data.streaks,
                    trustLevel: data.trustLevel,
                    ageGroup: data.ageGroup,
                });
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [childId, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-500 to-blue-500 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!child) return null;

    const trustInfo = TRUST_INFO[child.trustLevel] || TRUST_INFO[1];
    const nextMilestone = STREAK_MILESTONES.find(m => m.days > child.streaks.currentStreak);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-500 to-blue-500">
            {/* Header */}
            <header className="bg-white/10 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href={`/child/${childId}/home`} className="flex items-center gap-2 text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-bold text-white">📊 Progress</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Profile Card */}
                <Card className="text-center">
                    <div
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4"
                        style={{ backgroundColor: child.avatar.backgroundColor }}
                    >
                        {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{child.name}</h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: trustInfo.color }}
                        />
                        <span className="text-gray-600">Level {child.trustLevel}: {trustInfo.name}</span>
                    </div>
                </Card>

                {/* Streak Card */}
                <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                    <div className="text-center">
                        <div className="text-5xl mb-2">🔥</div>
                        <div className="text-4xl font-bold">{child.streaks.currentStreak}</div>
                        <div className="text-lg opacity-90">Day Streak</div>
                        {child.streaks.longestStreak > child.streaks.currentStreak && (
                            <div className="text-sm opacity-75 mt-2">
                                Best: {child.streaks.longestStreak} days
                            </div>
                        )}
                    </div>
                    {nextMilestone && (
                        <div className="mt-4 bg-white/20 rounded-xl p-3">
                            <div className="text-sm mb-2">
                                Next milestone: {nextMilestone.days} days → +{nextMilestone.bonusStars} bonus stars!
                            </div>
                            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all"
                                    style={{ width: `${(child.streaks.currentStreak / nextMilestone.days) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </Card>

                {/* Stars This Week */}
                <Card>
                    <h3 className="font-semibold text-gray-700 mb-4">Stars This Week</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-2">
                                    <span className="text-xl">⭐</span>
                                    <span className="text-sm text-gray-600">Growth Stars</span>
                                </span>
                                <span className="text-sm font-medium">
                                    {child.starBalances.weeklyEarned?.growth || 0} / {child.starBalances.weeklyLimit?.growth || 100}
                                </span>
                            </div>
                            <ProgressBar
                                value={child.starBalances.weeklyEarned?.growth || 0}
                                max={child.starBalances.weeklyLimit?.growth || 100}
                                color="yellow"
                                showLabel={false}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-2">
                                    <span className="text-xl">🎉</span>
                                    <span className="text-sm text-gray-600">Fun Stars</span>
                                </span>
                                <span className="text-sm font-medium">
                                    {child.starBalances.weeklyEarned?.fun || 0} / {child.starBalances.weeklyLimit?.fun || 50}
                                </span>
                            </div>
                            <ProgressBar
                                value={child.starBalances.weeklyEarned?.fun || 0}
                                max={child.starBalances.weeklyLimit?.fun || 50}
                                color="indigo"
                                showLabel={false}
                            />
                        </div>
                    </div>
                </Card>

                {/* Trust Level */}
                <Card>
                    <h3 className="font-semibold text-gray-700 mb-4">Trust Level</h3>
                    <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <div
                                key={level}
                                className={`flex-1 h-3 rounded-full ${level <= child.trustLevel
                                    ? 'bg-gradient-to-r from-green-400 to-blue-500'
                                    : 'bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                        {child.trustLevel >= 3
                            ? '🎉 You can auto-approve some tasks!'
                            : 'Keep completing tasks to level up!'}
                    </p>
                </Card>

                {/* Total Stars */}
                <Card>
                    <h3 className="font-semibold text-gray-700 mb-4">Total Stars Saved</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-yellow-50 rounded-xl">
                            <div className="text-3xl mb-1">⭐</div>
                            <div className="text-2xl font-bold text-yellow-600">{child.starBalances.growth}</div>
                            <div className="text-sm text-gray-500">Growth</div>
                        </div>
                        <div className="text-center p-4 bg-pink-50 rounded-xl">
                            <div className="text-3xl mb-1">🎉</div>
                            <div className="text-2xl font-bold text-pink-600">{child.starBalances.fun}</div>
                            <div className="text-sm text-gray-500">Fun</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
