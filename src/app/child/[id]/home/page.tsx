'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import type { Child } from '@/types';
import { Star, Gift, Target, ChevronRight, ListTodo } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
  lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
  unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const GREETINGS = [
  "Let's do something great today! 🌟",
  "Ready to earn some stars? ⭐",
  "You've got this! 💪",
  "Time to shine! ✨",
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
          <p className="mt-4 text-emerald-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const avatarEmoji = (child.avatar?.presetId && AVATAR_EMOJIS[child.avatar.presetId]) || '😊';
  const totalStars = child.starBalances?.growth || 0;
  const progressPercent = totalTasksToday > 0 ? Math.round((completedToday / totalTasksToday) * 100) : 0;
  const hasProfileImage = (child as { profileImageBase64?: string }).profileImageBase64;

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl overflow-hidden border-2 border-emerald-200"
              style={{ backgroundColor: hasProfileImage ? undefined : (child.avatar?.backgroundColor || '#e0f2fe') }}
            >
              {hasProfileImage ? (
                <Image src={hasProfileImage} alt={child.name} fill className="object-cover" />
              ) : (
                <span className="font-bold text-lg">{child.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Hi, {child.name}! 👋</h1>
            <p className="text-gray-500 text-sm">{greeting}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex justify-center">
        {/* Stars */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center min-w-[120px]">
          <div className="w-10 h-10 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-2">
            <Star size={20} className="text-amber-500" fill="currentColor" />
          </div>
          <div className="text-xl font-bold text-gray-800">{totalStars}</div>
          <div className="text-xs text-gray-500">Stars</div>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Target size={18} className="text-emerald-500" />
            Today's Progress
          </h2>
          <span className={`text-sm font-bold ${progressPercent === 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {completedToday === totalTasksToday && totalTasksToday > 0
            ? "🎉 Amazing! All tasks done!"
            : `${completedToday} of ${totalTasksToday} tasks completed`}
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tasks */}
        <Link href={`/child/${childId}/tasks`} className="group">
          <div className="bg-sky-50 hover:bg-sky-100 rounded-2xl p-5 transition-all border border-sky-100 h-32 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <ListTodo size={20} className="text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Tasks</h3>
                <p className="text-sm text-gray-500">{pendingTasks} pending</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Rewards */}
        <Link href={`/child/${childId}/rewards`} className="group">
          <div className="bg-pink-50 hover:bg-pink-100 rounded-2xl p-5 transition-all border border-pink-100 h-32 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center">
                <Gift size={20} className="text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Rewards</h3>
                <p className="text-sm text-gray-500">{totalStars}⭐ available</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>


    </div>
  );
}
