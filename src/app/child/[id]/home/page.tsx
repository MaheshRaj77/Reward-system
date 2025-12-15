'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import type { Child } from '@/types';
import { ArrowRight, Star, Flame, Gift, CheckSquare, Trophy, Sparkles, Clock, Target } from 'lucide-react';

interface TaskData {
  id: string;
  title: string;
  category: string;
  starValue: number;
  imageBase64?: string;
}

interface CompletionData {
  id: string;
  taskTitle: string;
  starsAwarded: number;
  completedAt: { seconds: number };
}

const AVATAR_EMOJIS: Record<string, string> = {
  lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
  unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const CATEGORY_ICONS: Record<string, string> = {
  study: '📚', health: '💪', behavior: '⭐', chores: '🏠', creativity: '🎨', social: '🤝',
};

const MOTIVATIONAL_MESSAGES = [
  "You're doing amazing! Keep it up! 🌟",
  "Every star brings you closer to your goals! ⭐",
  "Champions never give up! 💪",
  "Today is YOUR day to shine! ✨",
  "Small steps lead to big achievements! 🏆",
];

export default function ChildHome() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [pendingTasks, setPendingTasks] = useState<TaskData[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<CompletionData[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalTasksToday, setTotalTasksToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [motivationalMessage] = useState(
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load child
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (!childDoc.exists()) {
          router.push('/child/login');
          return;
        }
        setChild(childDoc.data() as Child);

        // Load pending tasks
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignedChildIds', 'array-contains', childId),
          where('isActive', '==', true)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks: TaskData[] = [];
        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          allTasks.push({
            id: doc.id,
            title: data.title,
            category: data.category,
            starValue: data.starValue,
            imageBase64: data.imageBase64,
          });
        });
        setTotalTasksToday(allTasks.length);

        // Load today's completions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completionQuery = query(
          collection(db, 'taskCompletions'),
          where('childId', '==', childId),
          where('completedAt', '>=', today)
        );
        const completionSnapshot = await getDocs(completionQuery);
        const completedTaskIds = new Set<string>();
        const completions: CompletionData[] = [];

        completionSnapshot.forEach((doc) => {
          const data = doc.data();
          completedTaskIds.add(data.taskId);
          completions.push({
            id: doc.id,
            taskTitle: data.taskTitle || 'Task',
            starsAwarded: data.starsAwarded || 0,
            completedAt: data.completedAt,
          });
        });

        setCompletedToday(completedTaskIds.size);
        setRecentCompletions(completions.slice(0, 3));

        // Filter pending tasks
        const pending = allTasks.filter(t => !completedTaskIds.has(t.id));
        setPendingTasks(pending.slice(0, 5));

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (childId) loadData();
  }, [childId, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!child) return null;

  const avatar = (child.avatar?.presetId && AVATAR_EMOJIS[child.avatar.presetId]) || '⭐';
  const totalStars = child.starBalances?.growth || 0;
  const currentStreak = child.streaks?.currentStreak || 0;
  const longestStreak = child.streaks?.longestStreak || 0;

  // Progress calculation
  const dailyProgress = totalTasksToday > 0 ? (completedToday / totalTasksToday) * 100 : 0;
  const progressRadius = 45;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset = progressCircumference - (dailyProgress / 100) * progressCircumference;

  // Next reward milestone
  const nextMilestone = Math.ceil(totalStars / 50) * 50 || 50;
  const starsToMilestone = nextMilestone - totalStars;

  return (
    <div className="space-y-6">
      {/* Hero Section with 3D Avatar */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] p-6 text-white shadow-2xl shadow-purple-500/30 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
        </div>

        <div className="relative z-10">
          {/* Top row: Greeting and Avatar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Welcome back</p>
              <h1 className="text-3xl font-black tracking-tight">{child.name}! 👋</h1>
            </div>

            {/* 3D Avatar */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-black/30 transform hover:scale-110 transition-transform duration-300 border-4 border-white/30"
                style={{
                  backgroundColor: child.avatar?.backgroundColor || '#a855f7',
                  transform: 'perspective(100px) rotateY(-5deg)',
                }}
              >
                {avatar}
              </div>
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-3xl blur-xl opacity-50"
                style={{ backgroundColor: child.avatar?.backgroundColor || '#a855f7' }}
              />
            </div>
          </div>

          {/* Daily Progress Ring */}
          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="relative flex-shrink-0">
              <svg width="100" height="100" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={progressRadius}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={progressRadius}
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-black">{completedToday}</div>
                  <div className="text-[10px] text-white/70 font-medium">of {totalTasksToday}</div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Today&apos;s Progress</h3>
              <p className="text-white/80 text-sm">
                {completedToday === 0
                  ? "Ready to start? Your tasks are waiting!"
                  : completedToday === totalTasksToday
                    ? "🎉 All done! You're a superstar!"
                    : `${totalTasksToday - completedToday} more to go. You got this!`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Glassmorphism */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Stars */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-4 text-center shadow-lg shadow-amber-100/50 hover:scale-105 transition-transform group">
          <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:shadow-amber-300">
            <Star className="text-white" size={24} fill="white" />
          </div>
          <div className="text-2xl font-black text-gray-900">{totalStars}</div>
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Stars</div>
        </div>

        {/* Current Streak */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-4 text-center shadow-lg shadow-orange-100/50 hover:scale-105 transition-transform group">
          <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:shadow-orange-300">
            <Flame className="text-white" size={24} fill="white" />
          </div>
          <div className="text-2xl font-black text-gray-900">{currentStreak}</div>
          <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Day Streak</div>
        </div>

        {/* Best Streak */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-4 text-center shadow-lg shadow-purple-100/50 hover:scale-105 transition-transform group">
          <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:shadow-purple-300">
            <Trophy className="text-white" size={24} fill="white" />
          </div>
          <div className="text-2xl font-black text-gray-900">{longestStreak}</div>
          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Best Streak</div>
        </div>
      </div>

      {/* Next Reward Milestone */}
      <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-20">🎁</div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Target size={18} className="text-purple-500" />
              Next Reward
            </h3>
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
              {starsToMilestone} ⭐ to go!
            </span>
          </div>
          <div className="h-3 bg-white/80 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-1000 rounded-full relative"
              style={{ width: `${Math.min(100, (totalStars / nextMilestone) * 100)}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%)] bg-[length:0.75rem_0.75rem] animate-[shimmer_1s_linear_infinite]" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-gray-400">
            <span>0</span>
            <span>{nextMilestone} stars</span>
          </div>
        </div>
      </div>

      {/* Pending Tasks Preview */}
      {pendingTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Up Next
            </h3>
            <Link href={`/child/${childId}/tasks`} className="text-sm text-indigo-600 font-bold hover:text-indigo-700">
              See All →
            </Link>
          </div>

          {/* Horizontal scrollable tasks */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {pendingTasks.map((task) => (
              <Link
                key={task.id}
                href={`/child/${childId}/tasks`}
                className="flex-shrink-0 w-40 bg-white border-2 border-indigo-50 hover:border-indigo-200 rounded-2xl p-4 transition-all hover:scale-105 hover:shadow-lg group"
              >
                <div className="text-3xl mb-2">
                  {CATEGORY_ICONS[task.category] || '📋'}
                </div>
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2">{task.title}</h4>
                <div className="flex items-center gap-1 text-amber-600">
                  <Star size={14} fill="currentColor" />
                  <span className="font-bold text-sm">{task.starValue}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href={`/child/${childId}/tasks`} className="group">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CheckSquare size={24} />
              </div>
              <h3 className="font-bold text-lg">My Tasks</h3>
              <p className="text-indigo-100 text-sm">{pendingTasks.length} waiting</p>
            </div>
          </div>
        </Link>

        <Link href={`/child/${childId}/rewards`} className="group">
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-5 text-white shadow-xl shadow-pink-200 hover:shadow-pink-300 transition-all hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Gift size={24} />
              </div>
              <h3 className="font-bold text-lg">Rewards</h3>
              <p className="text-pink-100 text-sm">Spend stars</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Motivational Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex gap-4 items-center">
        <div className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>
          <Sparkles className="text-amber-500" size={32} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">Daily Motivation</h3>
          <p className="text-amber-800 font-medium">{motivationalMessage}</p>
        </div>
      </div>

      {/* Recent Activity */}
      {recentCompletions.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-green-500" />
            Recent Wins
          </h3>
          <div className="space-y-3">
            {recentCompletions.map((completion) => (
              <div key={completion.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{completion.taskTitle}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star size={14} fill="currentColor" />
                  +{completion.starsAwarded}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
