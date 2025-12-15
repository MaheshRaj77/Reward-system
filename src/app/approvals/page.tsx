'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';

interface TaskCompletion {
    id: string;
    taskId: string;
    childId: string;
    status: 'pending' | 'approved' | 'rejected';
    starsAwarded: number;
    starType: 'growth';
    completedAt: { seconds: number };
}

interface RewardRedemption {
    id: string;
    rewardId: string;
    childId: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    starsDeducted: number;
    starType: string;
    requestedAt: { seconds: number };
}

interface TaskInfo {
    id: string;
    title: string;
    category: keyof typeof TASK_CATEGORIES;
}

interface RewardInfo {
    id: string;
    name: string;
    icon: string;
}

interface ChildInfo {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function Approvals() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
    const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
    const [tasks, setTasks] = useState<Record<string, TaskInfo>>({});
    const [rewards, setRewards] = useState<Record<string, RewardInfo>>({});
    const [children, setChildren] = useState<Record<string, ChildInfo>>({});
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                // Load pending task completions
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('familyId', '==', parent.familyId),
                    where('status', '==', 'pending')
                );

                const unsubCompletions = onSnapshot(completionsQuery, async (snapshot) => {
                    const completionsData: TaskCompletion[] = [];
                    const taskIds = new Set<string>();
                    const childIds = new Set<string>();

                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        completionsData.push({
                            id: doc.id,
                            taskId: data.taskId,
                            childId: data.childId,
                            status: data.status,
                            starsAwarded: data.starsAwarded,
                            starType: data.starType,
                            completedAt: data.completedAt,
                        });
                        taskIds.add(data.taskId);
                        childIds.add(data.childId);
                    });

                    // Load task details
                    for (const taskId of taskIds) {
                        if (!tasks[taskId]) {
                            const taskDoc = await getDoc(doc(db, 'tasks', taskId));
                            if (taskDoc.exists()) {
                                const data = taskDoc.data();
                                setTasks(prev => ({ ...prev, [taskId]: { id: taskId, title: data.title, category: data.category } }));
                            }
                        }
                    }

                    // Load child details
                    for (const childId of childIds) {
                        if (!children[childId]) {
                            const childDoc = await getDoc(doc(db, 'children', childId));
                            if (childDoc.exists()) {
                                const data = childDoc.data();
                                setChildren(prev => ({ ...prev, [childId]: { id: childId, name: data.name, avatar: data.avatar } }));
                            }
                        }
                    }

                    setTaskCompletions(completionsData);
                    setLoading(false);
                });

                // Load pending redemptions
                const redemptionsQuery = query(
                    collection(db, 'rewardRedemptions'),
                    where('familyId', '==', parent.familyId),
                    where('status', 'in', ['pending', 'approved'])
                );

                const unsubRedemptions = onSnapshot(redemptionsQuery, async (snapshot) => {
                    const redemptionsData: RewardRedemption[] = [];
                    const rewardIds = new Set<string>();
                    const childIds = new Set<string>();

                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        redemptionsData.push({
                            id: doc.id,
                            rewardId: data.rewardId,
                            childId: data.childId,
                            status: data.status,
                            starsDeducted: data.starsDeducted,
                            starType: data.starType,
                            requestedAt: data.requestedAt,
                        });
                        rewardIds.add(data.rewardId);
                        childIds.add(data.childId);
                    });

                    // Load reward details
                    for (const rewardId of rewardIds) {
                        if (!rewards[rewardId]) {
                            const rewardDoc = await getDoc(doc(db, 'rewards', rewardId));
                            if (rewardDoc.exists()) {
                                const data = rewardDoc.data();
                                setRewards(prev => ({ ...prev, [rewardId]: { id: rewardId, name: data.name, icon: data.icon } }));
                            }
                        }
                    }

                    // Load child details
                    for (const childId of childIds) {
                        if (!children[childId]) {
                            const childDoc = await getDoc(doc(db, 'children', childId));
                            if (childDoc.exists()) {
                                const data = childDoc.data();
                                setChildren(prev => ({ ...prev, [childId]: { id: childId, name: data.name, avatar: data.avatar } }));
                            }
                        }
                    }

                    setRedemptions(redemptionsData);
                });

                return () => {
                    unsubCompletions();
                    unsubRedemptions();
                };
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleApproveTask = async (completion: TaskCompletion) => {
        setProcessing(completion.id);
        try {
            await updateDoc(doc(db, 'taskCompletions', completion.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
            });

            // Award stars to child
            const childDoc = await getDoc(doc(db, 'children', completion.childId));
            if (childDoc.exists()) {
                const childData = childDoc.data();
                const newGrowth = (childData.starBalances?.growth || 0) + completion.starsAwarded;
                await updateDoc(doc(db, 'children', completion.childId), {
                    'starBalances.growth': newGrowth,
                });
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectTask = async (completion: TaskCompletion) => {
        setProcessing(completion.id);
        try {
            await updateDoc(doc(db, 'taskCompletions', completion.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleApproveRedemption = async (redemption: RewardRedemption) => {
        setProcessing(redemption.id);
        try {
            await updateDoc(doc(db, 'rewardRedemptions', redemption.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleFulfillRedemption = async (redemption: RewardRedemption) => {
        setProcessing(redemption.id);
        try {
            await updateDoc(doc(db, 'rewardRedemptions', redemption.id), {
                status: 'fulfilled',
                fulfilledAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectRedemption = async (redemption: RewardRedemption) => {
        setProcessing(redemption.id);
        try {
            // Refund stars
            const childDoc = await getDoc(doc(db, 'children', redemption.childId));
            if (childDoc.exists()) {
                const childData = childDoc.data();
                const newGrowth = (childData.starBalances?.growth || 0) + redemption.starsDeducted;
                await updateDoc(doc(db, 'children', redemption.childId), {
                    'starBalances.growth': newGrowth,
                });
            }

            await updateDoc(doc(db, 'rewardRedemptions', redemption.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const pendingCount = taskCompletions.length + redemptions.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">Approvals</h1>
                    {pendingCount > 0 && (
                        <Badge variant="warning">{pendingCount} pending</Badge>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {pendingCount === 0 && redemptions.filter(r => r.status === 'approved').length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
                        <p className="text-gray-600 mb-6">No pending approvals right now.</p>
                        <Link href="/dashboard">
                            <Button>Back to Dashboard</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Task Completions */}
                        {taskCompletions.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Task Completions</h2>
                                <div className="space-y-4">
                                    {taskCompletions.map((completion) => {
                                        const task = tasks[completion.taskId];
                                        const child = children[completion.childId];
                                        const category = task ? TASK_CATEGORIES[task.category] : null;

                                        return (
                                            <div key={completion.id} className="bg-white/60 backdrop-blur-sm border border-blue-100 rounded-2xl p-5 shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    {child && (
                                                        <div
                                                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                                                            style={{ backgroundColor: child.avatar.backgroundColor }}
                                                        >
                                                            {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-800">{child?.name || 'Child'}</span>
                                                            <span className="text-gray-600">completed</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {category && <span>{category.icon}</span>}
                                                            <span className="font-semibold text-gray-800">{task?.title || 'Task'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <Badge variant="success">
                                                                ⭐ {completion.starsAwarded}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleRejectTask(completion)}
                                                            disabled={processing === completion.id}
                                                            className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                        <Button
                                                            onClick={() => handleApproveTask(completion)}
                                                            isLoading={processing === completion.id}
                                                        >
                                                            ✓ Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Reward Redemptions */}
                        {redemptions.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">🎁 Reward Redemptions</h2>
                                <div className="space-y-4">
                                    {redemptions.map((redemption) => {
                                        const reward = rewards[redemption.rewardId];
                                        const child = children[redemption.childId];

                                        return (
                                            <div key={redemption.id} className="bg-white/60 backdrop-blur-sm border border-rose-100 rounded-2xl p-5 shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl">
                                                        {reward?.icon || '🎁'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-800">{child?.name || 'Child'}</span>
                                                            <span className="text-gray-600">wants</span>
                                                        </div>
                                                        <div className="font-semibold text-gray-800">{reward?.name || 'Reward'}</div>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <Badge>{redemption.starsDeducted} stars</Badge>
                                                            <Badge variant={redemption.status === 'approved' ? 'success' : 'warning'}>
                                                                {redemption.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {redemption.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleRejectRedemption(redemption)}
                                                                    disabled={processing === redemption.id}
                                                                    className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                                                                >
                                                                    ✕
                                                                </button>
                                                                <Button
                                                                    onClick={() => handleApproveRedemption(redemption)}
                                                                    isLoading={processing === redemption.id}
                                                                >
                                                                    ✓ Approve
                                                                </Button>
                                                            </>
                                                        )}
                                                        {redemption.status === 'approved' && (
                                                            <Button
                                                                onClick={() => handleFulfillRedemption(redemption)}
                                                                isLoading={processing === redemption.id}
                                                                variant="secondary"
                                                            >
                                                                Mark Given
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
