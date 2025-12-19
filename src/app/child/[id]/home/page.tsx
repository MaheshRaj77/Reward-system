'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import type { Child } from '@/types';
import { Star, Flame, Gift, Zap, Trophy, Target, ChevronRight, Sparkles, Swords, Shield, Crown } from 'lucide-react';

// RPG Level system matching layout
const LEVELS = [
  { name: 'Novice', minStars: 0, color: 'from-slate-400 to-slate-500', glow: 'shadow-slate-500/50', icon: '🌱', tier: 'bronze' },
  { name: 'Scout', minStars: 50, color: 'from-emerald-400 to-green-500', glow: 'shadow-emerald-500/50', icon: '🧭', tier: 'bronze' },
  { name: 'Warrior', minStars: 150, color: 'from-blue-400 to-cyan-500', glow: 'shadow-blue-500/50', icon: '⚔️', tier: 'silver' },
  { name: 'Knight', minStars: 300, color: 'from-purple-400 to-violet-500', glow: 'shadow-purple-500/50', icon: '🛡️', tier: 'silver' },
  { name: 'Champion', minStars: 500, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/50', icon: '🏆', tier: 'gold' },
  { name: 'Legend', minStars: 1000, color: 'from-rose-400 to-pink-500', glow: 'shadow-rose-500/50', icon: '👑', tier: 'legendary' },
];

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-amber-500',
  legendary: 'from-purple-400 to-pink-500',
};

const getLevel = (stars: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (stars >= LEVELS[i].minStars) return { ...LEVELS[i], level: i + 1 };
  }
  return { ...LEVELS[0], level: 1 };
};

const getProgress = (stars: number) => {
  const current = getLevel(stars);
  const nextLevel = LEVELS[current.level] || LEVELS[LEVELS.length - 1];
  const prevStars = LEVELS[current.level - 1]?.minStars || 0;
  const range = nextLevel.minStars - prevStars;
  return range > 0 ? ((stars - prevStars) / range) * 100 : 100;
};

const AVATAR_EMOJIS: Record<string, string> = {
  lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
  unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const GREETINGS = [
  "Ready for battle, hero? ⚔️",
  "Your quests await! 🗡️",
  "Time to earn glory! 🏆",
  "Adventure calls! 🎮",
  "Level up today! 📈",
];

export default function ChildHome() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalTasksToday, setTotalTasksToday] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);

  const [greeting] = useState(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    if (!childId) return;

    const unsubscribers: (() => void)[] = [];

    const childUnsub = onSnapshot(doc(db, 'children', childId), (childDoc) => {
      if (!childDoc.exists()) {
        router.push('/child/login');
        return;
      }
      setChild(childDoc.data() as Child);
      setLoading(false);
    });
    unsubscribers.push(childUnsub);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedChildIds', 'array-contains', childId),
      where('isActive', '==', true)
    );

    const completionQuery = query(
      collection(db, 'taskCompletions'),
      where('childId', '==', childId),
      where('completedAt', '>=', today)
    );

    const tasksUnsub = onSnapshot(tasksQuery, (snapshot) => {
      setTotalTasksToday(snapshot.size);
    });
    unsubscribers.push(tasksUnsub);

    const completionsUnsub = onSnapshot(completionQuery, (snapshot) => {
      setCompletedToday(snapshot.size);
    });
    unsubscribers.push(completionsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, [childId, router]);

  useEffect(() => {
    setPendingTasks(Math.max(0, totalTasksToday - completedToday));
  }, [totalTasksToday, completedToday]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-purple-400 font-bold animate-pulse">⚔️ Loading quest data...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const avatarEmoji = (child.avatar?.presetId && AVATAR_EMOJIS[child.avatar.presetId]) || '😊';
  const totalStars = child.starBalances?.growth || 0;
  const level = getLevel(totalStars);
  const progress = getProgress(totalStars);
  const nextLevel = LEVELS[level.level] || LEVELS[LEVELS.length - 1];
  const starsToNext = nextLevel.minStars - totalStars;

  const progressPercent = totalTasksToday > 0 ? Math.round((completedToday / totalTasksToday) * 100) : 0;
  const hasProfileImage = (child as { profileImageBase64?: string }).profileImageBase64;

  return (
    <div className="space-y-5 pb-8">

      {/* Hero Player Card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-6 border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden">
        {/* Animated glow effects */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />

        {/* Decorative particles */}
        <div className="absolute top-4 right-8 text-2xl animate-pulse">✨</div>
        <div className="absolute top-16 right-20 text-xl animate-pulse delay-500">⭐</div>
        <div className="absolute bottom-8 right-12 text-lg animate-pulse delay-1000">💫</div>

        <div className="relative z-10 flex items-center gap-5">
          {/* Player Avatar */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-2xl p-1 bg-gradient-to-r ${TIER_COLORS[level.tier]} shadow-lg ${level.glow}`}>
              <div
                className="w-full h-full rounded-xl flex items-center justify-center text-4xl overflow-hidden"
                style={{ backgroundColor: hasProfileImage ? undefined : (child.avatar?.backgroundColor || '#4338ca') }}
              >
                {hasProfileImage ? (
                  <Image src={hasProfileImage} alt={child.name} fill className="object-cover" />
                ) : (
                  <span className="drop-shadow-lg text-white font-black">{child.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            {/* Level Badge */}
            <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg bg-gradient-to-r ${level.color} text-white text-sm font-black shadow-lg border-2 border-slate-900`}>
              LV.{level.level}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{child.name}</h1>
              <span className="text-xl">{level.icon}</span>
            </div>
            <p className="text-purple-300 font-medium text-sm">{greeting}</p>

            {/* XP Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-bold bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}>
                  {level.name}
                </span>
                <span className="text-slate-400">
                  {starsToNext > 0 ? `${starsToNext} XP to ${nextLevel.name}` : '⭐ MAX LEVEL'}
                </span>
              </div>
              <div className="h-3 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600/50">
                <div
                  className={`h-full bg-gradient-to-r ${level.color} transition-all duration-1000 relative`}
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Gaming Style */}
      <div className="grid grid-cols-3 gap-3">
        {/* Gold/Stars */}
        <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 rounded-2xl p-4 border border-amber-500/30 text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-amber-500/30">
            <Star size={24} className="text-white" fill="currentColor" />
          </div>
          <div className="text-2xl font-black text-yellow-300">{totalStars}</div>
          <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Gold</div>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-4 border border-orange-500/30 text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-orange-500/30">
            <Flame size={24} className="text-white" fill="currentColor" />
          </div>
          <div className="text-2xl font-black text-orange-300">{child.streaks?.currentStreak || 0}</div>
          <div className="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider">Streak</div>
        </div>

        {/* Best Record */}
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-4 border border-purple-500/30 text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-purple-500/30">
            <Trophy size={24} className="text-white" />
          </div>
          <div className="text-2xl font-black text-purple-300">{child.streaks?.longestStreak || 0}</div>
          <div className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">Record</div>
        </div>
      </div>

      {/* Daily Quest Progress */}
      <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Target size={18} className="text-cyan-400" />
            Daily Quest Progress
          </h2>
          <span className={`text-sm font-black ${progressPercent === 100 ? 'text-green-400' : 'text-cyan-400'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-4 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600/50 mb-3">
          <div
            className={`h-full transition-all duration-1000 rounded-full relative ${progressPercent === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {completedToday === totalTasksToday && totalTasksToday > 0
            ? "🎉 All quests complete! You're legendary!"
            : `⚔️ ${completedToday} of ${totalTasksToday} quests conquered`}
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quests */}
        <Link href={`/child/${childId}/tasks`} className="group">
          <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all h-36 flex flex-col justify-between relative overflow-hidden border border-orange-400/30">
            <div className="absolute -right-6 -bottom-6 text-7xl opacity-20">⚔️</div>
            <div className="relative z-10">
              <Swords size={28} className="mb-2 drop-shadow-lg" />
              <h3 className="text-xl font-black">Quests</h3>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="bg-black/30 px-3 py-1 rounded-full text-sm font-bold">{pendingTasks} active</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Shop */}
        <Link href={`/child/${childId}/rewards`} className="group">
          <div className="bg-gradient-to-br from-pink-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 hover:scale-[1.02] transition-all h-36 flex flex-col justify-between relative overflow-hidden border border-pink-400/30">
            <div className="absolute -right-6 -bottom-6 text-7xl opacity-20">🏪</div>
            <div className="relative z-10">
              <Gift size={28} className="mb-2 drop-shadow-lg" />
              <h3 className="text-xl font-black">Shop</h3>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="bg-black/30 px-3 py-1 rounded-full text-sm font-bold">{totalStars}⭐</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Achievement Teaser */}
      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-2xl p-5 border border-amber-500/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 animate-pulse">
            🏅
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white flex items-center gap-2">
              Achievement Progress
              <Crown size={16} className="text-amber-400" />
            </h3>
            <p className="text-sm text-amber-300/80 mt-1">
              {(child.streaks?.currentStreak || 0) >= 7
                ? "🔥 Week Warrior unlocked! Keep the streak!"
                : `${7 - (child.streaks?.currentStreak || 0)} more days for Week Warrior!`}
            </p>
          </div>
          <Sparkles size={28} className="text-amber-400 animate-pulse" />
        </div>
      </div>

    </div>
  );
}
