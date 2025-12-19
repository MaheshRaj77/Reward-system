'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PinDisplay } from '@/components/ui/PinInput';
import { ArrowLeft, Star, Activity, Trophy, Key, Trash2 } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string; customUrl?: string };
    profileImage?: string;
    profileImageBase64?: string; // New field for base64 image
    dateOfBirth?: string; // ISO date string
    bio?: string;
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
    status: 'pending' | 'approved' | 'rejected' | 'assigned';
    starsAwarded: number;
    starType: string;
    completedAt?: { seconds: number };
    createdAt?: { seconds: number };
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
    const [activityLog, setActivityLog] = useState<TaskCompletion[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let unsubscribeChild: (() => void) | null = null;
        let unsubscribeCompletions: (() => void) | null = null;


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

                // Real-time listener for task completions
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('childId', '==', childId),
                    orderBy('completedAt', 'desc'),
                    limit(30)
                );

                // Also fetch assigned tasks for this child
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('assignedTo', 'array-contains', childId),
                    where('isActive', '==', true)
                );

                unsubscribeCompletions = onSnapshot(completionsQuery, async (completionsSnapshot) => {
                    // Get all assigned tasks
                    const tasksSnapshot = await getDocs(tasksQuery);
                    const assignedTasks = new Map<string, { title: string; starValue: number; createdAt: { seconds: number } }>();
                    const completedTaskIds = new Set<string>();

                    tasksSnapshot.forEach((taskDoc) => {
                        const data = taskDoc.data();
                        assignedTasks.set(taskDoc.id, {
                            title: data.title,
                            starValue: data.starValue || 0,
                            createdAt: data.createdAt || { seconds: Date.now() / 1000 },
                        });
                    });

                    const activities: TaskCompletion[] = [];

                    // Add completions (pending or approved)
                    for (const docSnap of completionsSnapshot.docs) {
                        const data = docSnap.data();
                        completedTaskIds.add(data.taskId);
                        let taskTitle = 'Task';
                        let starValue = data.starsAwarded;

                        const taskInfo = assignedTasks.get(data.taskId);
                        if (taskInfo) {
                            taskTitle = taskInfo.title;
                        } else {
                            const taskDoc = await getDoc(doc(db, 'tasks', data.taskId));
                            if (taskDoc.exists()) {
                                taskTitle = taskDoc.data().title;
                            }
                        }

                        activities.push({
                            id: docSnap.id,
                            taskId: data.taskId,
                            taskTitle,
                            status: data.status,
                            starsAwarded: starValue,
                            starType: data.starType,
                            completedAt: data.completedAt,
                        });
                    }

                    // Add assigned tasks that haven't been completed yet
                    assignedTasks.forEach((taskInfo, taskId) => {
                        if (!completedTaskIds.has(taskId)) {
                            activities.push({
                                id: `assigned-${taskId}`,
                                taskId,
                                taskTitle: taskInfo.title,
                                status: 'assigned',
                                starsAwarded: taskInfo.starValue,
                                starType: 'growth',
                                createdAt: taskInfo.createdAt,
                            });
                        }
                    });

                    // Sort by date (completedAt or createdAt)
                    activities.sort((a, b) => {
                        const aTime = a.completedAt?.seconds || a.createdAt?.seconds || 0;
                        const bTime = b.completedAt?.seconds || b.createdAt?.seconds || 0;
                        return bTime - aTime;
                    });

                    setActivityLog(activities);
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

        };
    }, [childId, router]);

    const handleDeleteChild = async () => {
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'children', childId));
            // Optional: Cleanup related data like taskCompletions, or let them be orphaned/handled by backend functions
            router.push('/children');
        } catch (error) {
            console.error('Error deleting child:', error);
            setDeleting(false);
            setShowDeleteConfirm(false);
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
        return null; // Or a not found state
    }

    const age = child.dateOfBirth
        ? Math.floor((new Date().getTime() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : new Date().getFullYear() - child.birthYear;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-indigo-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900 flex-1">Child Profile</h1>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Child"
                    >
                        <Trash2 size={20} />
                    </button>
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
                                {/* Profile Image */}
                                {child.profileImageBase64 || child.profileImage || child.avatar?.customUrl ? (
                                    <img
                                        src={child.profileImageBase64 || child.profileImage || child.avatar.customUrl}
                                        alt={child.name}
                                        className="w-28 h-28 rounded-3xl object-cover shadow-lg mb-4 transform transition-transform group-hover:scale-105 ring-4 ring-white"
                                    />
                                ) : (
                                    <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl font-bold text-indigo-600 shadow-lg mb-4 transform transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: child.avatar.backgroundColor }}>
                                        {child.name?.charAt(0).toUpperCase() || 'C'}
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{child.name}</h2>
                                <p className="text-indigo-500 font-medium mb-2">{AGE_GROUP_LABELS[child.ageGroup]}</p>

                                {/* Bio */}
                                {child.bio && (
                                    <p className="text-gray-500 text-sm mb-4 max-w-xs mx-auto italic">"{child.bio}"</p>
                                )}

                                <div className="flex flex-wrap justify-center gap-2 mb-4">
                                    <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                                        {age} Years Old
                                    </Badge>
                                    {child.dateOfBirth && (
                                        <Badge className="border-purple-200 bg-purple-50 text-purple-700">
                                            🎂 {new Date(child.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Badge>
                                    )}
                                </div>

                                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                        <Key size={16} />
                                        <span>Login PIN</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <PinDisplay pin={child.pin} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Star Cards - Side by Side */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Stars Available */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-5 shadow-lg shadow-amber-100/50">
                                <div className="flex items-center gap-2 text-amber-600 font-semibold mb-2">
                                    <Star size={18} fill="currentColor" />
                                    <span className="text-sm">Available</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{child.starBalances?.growth || 0}</div>
                                <p className="text-xs text-amber-600/80 mt-1">to spend</p>
                            </div>

                            {/* Weekly Stars */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-5 shadow-lg shadow-indigo-100/50">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
                                    <Star size={18} fill="currentColor" />
                                    <span className="text-sm">This Week</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{child.starBalances?.weeklyEarned || 0}</div>
                                <p className="text-xs text-indigo-600/80 mt-1">earned</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity & Charts */}
                    <div className="lg:col-span-2 space-y-6">



                        {/* Recent Activity Feed */}
                        <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm min-h-[700px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" />
                                    Activity Log
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {activityLog.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">💤</div>
                                        <p className="text-gray-500 font-medium">No activity found</p>
                                    </div>
                                ) : (
                                    activityLog.map(activity => {
                                        const isAssigned = activity.status === 'assigned';
                                        const isPending = activity.status === 'pending';
                                        const isApproved = activity.status === 'approved';
                                        const timestamp = activity.completedAt?.seconds || activity.createdAt?.seconds;

                                        return (
                                            <div
                                                key={activity.id}
                                                className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all
                                                    ${isApproved
                                                        ? 'bg-green-50/50 border-green-200'
                                                        : isPending
                                                            ? 'bg-amber-50/50 border-amber-200'
                                                            : 'bg-white border-gray-100 hover:border-gray-200'
                                                    }`}
                                            >
                                                {/* Status Icon */}
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg
                                                    ${isApproved
                                                        ? 'bg-green-100 text-green-600'
                                                        : isPending
                                                            ? 'bg-amber-100 text-amber-600'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {isApproved ? '✓' : isPending ? '⏳' : '○'}
                                                </div>

                                                {/* Task Info */}
                                                <div className="flex-1">
                                                    <h4 className={`font-semibold ${isApproved ? 'line-through text-green-700' : isPending ? 'text-amber-800' : 'text-gray-700'}`}>
                                                        {activity.taskTitle}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {timestamp
                                                            ? new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                            : ''}
                                                        {isAssigned && ' • Assigned'}
                                                        {isPending && ' • Waiting for approval'}
                                                        {isApproved && ' • Completed'}
                                                    </p>
                                                </div>

                                                {/* Stars Badge */}
                                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold
                                                    ${isApproved
                                                        ? 'bg-green-100 text-green-700'
                                                        : isPending
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    ⭐ {isApproved ? '+' : ''}{activity.starsAwarded}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main >

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteChild}
                title="Delete Child Profile?"
                message={`Are you sure you want to delete ${child.name}? This action cannot be undone and will remove all their data.`}
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
            />
        </div >
    );
}
