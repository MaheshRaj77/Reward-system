'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { Camera, Check, X, Clock, Star, Gift, ChevronLeft, Sparkles, ZoomIn, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { CustomRewardRequestCard } from '@/components/parent/CustomRewardRequestCard';

interface TaskCompletion {
    id: string;
    taskId: string;
    childId: string;
    status: 'pending' | 'approved' | 'rejected';
    starsAwarded: number;
    starType: 'growth';
    completedAt: { seconds: number };
    proofImageBase64?: string | null;
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

interface CustomRewardRequest {
    id: string;
    childId: string;
    childName: string;
    rewardName: string;
    rewardLink: string;
    rewardImage: string | null;
    status: 'pending' | 'stars_set' | 'approved' | 'rejected';
    starsRequired: number | null;
    requestedAt: { seconds: number };
}

interface ChildInfo {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances?: { growth: number };
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
    const [customRewardRequests, setCustomRewardRequests] = useState<CustomRewardRequest[]>([]);
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
                    where('familyId', '==', parent.id),
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
                            proofImageBase64: data.proofImageBase64 || null,
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
                                setChildren(prev => ({ ...prev, [childId]: { id: childId, name: data.name, avatar: data.avatar, starBalances: data.starBalances } }));
                            }
                        }
                    }

                    setTaskCompletions(completionsData);
                    setLoading(false);
                });

                // Load pending redemptions
                const redemptionsQuery = query(
                    collection(db, 'rewardRedemptions'),
                    where('familyId', '==', parent.id),
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
                                setChildren(prev => ({ ...prev, [childId]: { id: childId, name: data.name, avatar: data.avatar, starBalances: data.starBalances } }));
                            }
                        }
                    }

                    setRedemptions(redemptionsData);
                });

                // Load custom reward requests
                const customRequestsQuery = query(
                    collection(db, 'customRewardRequests'),
                    where('familyId', '==', parent.id),
                    where('status', 'in', ['pending', 'stars_set'])
                );

                const unsubCustomRequests = onSnapshot(customRequestsQuery, async (snapshot) => {
                    const customRequestsData: CustomRewardRequest[] = [];
                    const childIds = new Set<string>();

                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        customRequestsData.push({
                            id: doc.id,
                            childId: data.childId,
                            childName: data.childName,
                            rewardName: data.rewardName,
                            rewardLink: data.rewardLink,
                            rewardImage: data.rewardImage || null,
                            status: data.status,
                            starsRequired: data.starsRequired,
                            requestedAt: data.requestedAt,
                        });
                        childIds.add(data.childId);
                    });

                    // Load child details
                    for (const childId of childIds) {
                        if (!children[childId]) {
                            const childDoc = await getDoc(doc(db, 'children', childId));
                            if (childDoc.exists()) {
                                const data = childDoc.data();
                                setChildren(prev => ({ ...prev, [childId]: { id: childId, name: data.name, avatar: data.avatar, starBalances: data.starBalances } }));
                            }
                        }
                    }

                    setCustomRewardRequests(customRequestsData);
                });

                return () => {
                    unsubCompletions();
                    unsubRedemptions();
                    unsubCustomRequests();
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

    const handleSetCustomRewardStars = async (requestId: string, stars: number) => {
        setProcessing(requestId);
        try {
            await updateDoc(doc(db, 'customRewardRequests', requestId), {
                starsRequired: stars,
                status: 'stars_set',
            });
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to set stars. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleApproveCustomReward = async (requestId: string) => {
        setProcessing(requestId);
        try {
            const requestDoc = await getDoc(doc(db, 'customRewardRequests', requestId));
            if (!requestDoc.exists()) return;

            const requestData = requestDoc.data();
            const childDoc = await getDoc(doc(db, 'children', requestData.childId));

            if (!childDoc.exists()) return;

            const childData = childDoc.data();
            const currentStars = childData.starBalances?.growth || 0;
            const starsRequired = requestData.starsRequired || 0;

            // Check if child has enough stars
            if (currentStars < starsRequired) {
                alert('Child does not have enough stars to approve this reward!');
                setProcessing(null);
                return;
            }

            // Deduct stars and approve reward
            const newStars = currentStars - starsRequired;

            await updateDoc(doc(db, 'children', requestData.childId), {
                'starBalances.growth': newStars,
            });

            await updateDoc(doc(db, 'customRewardRequests', requestId), {
                status: 'approved',
                approvedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to approve. Please try again.');
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectCustomReward = async (requestId: string) => {
        setProcessing(requestId);
        try {
            await updateDoc(doc(db, 'customRewardRequests', requestId), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to reject. Please try again.');
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

    const pendingCount = taskCompletions.length + redemptions.filter(r => r.status === 'pending').length + customRewardRequests.filter(r => r.status === 'pending').length;

    // Helper to format time ago
    const getTimeAgo = (timestamp: { seconds: number }) => {
        const seconds = Math.floor(Date.now() / 1000 - timestamp.seconds);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Premium Header */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-10 w-20 h-20 bg-white/20 rounded-full blur-xl" />
                    <div className="absolute top-8 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-4 left-1/2 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all hover:scale-105"
                        >
                            <ChevronLeft size={22} />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Clock size={24} />
                                Pending Approvals
                            </h1>
                            <p className="text-white/70 text-sm mt-0.5">Review and approve your children&apos;s activities</p>
                        </div>
                        {pendingCount > 0 && (
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                <span className="font-bold text-white">{pendingCount}</span>
                                <span className="text-white/80 text-sm">pending</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 -mt-4">
                {pendingCount === 0 && redemptions.filter(r => r.status === 'approved').length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-xl shadow-indigo-100/50 border border-white">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-green-200">
                            <CheckCircle2 size={48} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            No pending approvals right now. Your children are waiting for new tasks!
                        </p>
                        <Link href="/dashboard">
                            <Button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all hover:scale-105">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Task Completions Section */}
                        {taskCompletions.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                                        <Sparkles size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Task Completions</h2>
                                        <p className="text-sm text-gray-500">{taskCompletions.length} awaiting your review</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {taskCompletions.map((completion) => {
                                        const task = tasks[completion.taskId];
                                        const child = children[completion.childId];
                                        const category = task ? TASK_CATEGORIES[task.category] : null;

                                        return (
                                            <div
                                                key={completion.id}
                                                className="group bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-gray-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
                                            >
                                                {/* Card Header with Category Color */}
                                                <div
                                                    className="px-5 py-3 flex items-center justify-between"
                                                    style={{ backgroundColor: category?.color ? `${category.color}15` : '#f8fafc' }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{category?.icon || '📋'}</span>
                                                        <span className="text-sm font-semibold" style={{ color: category?.color || '#64748b' }}>
                                                            {category?.label || 'Task'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Clock size={12} />
                                                        {getTimeAgo(completion.completedAt)}
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        {/* Child Avatar */}
                                                        {child && (
                                                            <div
                                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
                                                                style={{ backgroundColor: child.avatar.backgroundColor }}
                                                            >
                                                                {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            {/* Child Name & Task */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-gray-900">{child?.name || 'Child'}</span>
                                                                <span className="text-gray-400">completed</span>
                                                            </div>
                                                            <h3 className="font-semibold text-gray-800 text-lg mt-1 truncate">{task?.title || 'Task'}</h3>

                                                            {/* Stars & Badges */}
                                                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                                                                    <Star size={14} fill="white" />
                                                                    +{completion.starsAwarded}
                                                                </div>
                                                                {completion.proofImageBase64 && (
                                                                    <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        <Camera size={14} />
                                                                        Photo attached
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Proof Image */}
                                                    {completion.proofImageBase64 && (
                                                        <div className="mt-5 pt-5 border-t border-gray-100">
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                                                                <Camera size={12} />
                                                                Submitted Proof
                                                            </p>
                                                            <div className="relative group/img w-full max-w-sm">
                                                                <Image
                                                                    src={completion.proofImageBase64}
                                                                    alt="Task completion proof"
                                                                    width={400}
                                                                    height={250}
                                                                    className="rounded-xl border-2 border-gray-100 object-cover w-full h-48 cursor-pointer group-hover/img:border-indigo-300 transition-all"
                                                                    onClick={() => window.open(completion.proofImageBase64 as string, '_blank')}
                                                                />
                                                                <button
                                                                    onClick={() => window.open(completion.proofImageBase64 as string, '_blank')}
                                                                    className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all rounded-xl"
                                                                >
                                                                    <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium text-gray-700">
                                                                        <ZoomIn size={16} />
                                                                        View Full Image
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="px-5 pb-5 flex gap-3">
                                                    <button
                                                        onClick={() => handleRejectTask(completion)}
                                                        disabled={processing === completion.id}
                                                        className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                    >
                                                        <XCircle size={18} />
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveTask(completion)}
                                                        disabled={processing === completion.id}
                                                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:shadow-xl hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                                                    >
                                                        {processing === completion.id ? (
                                                            <Spinner size="sm" />
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 size={18} />
                                                                Approve & Award Stars
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Reward Redemptions Section */}
                        {redemptions.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
                                        <Gift size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Reward Requests</h2>
                                        <p className="text-sm text-gray-500">{redemptions.filter(r => r.status === 'pending').length} pending, {redemptions.filter(r => r.status === 'approved').length} ready to give</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {redemptions.map((redemption) => {
                                        const reward = rewards[redemption.rewardId];
                                        const child = children[redemption.childId];
                                        const isPending = redemption.status === 'pending';
                                        const isApproved = redemption.status === 'approved';

                                        return (
                                            <div
                                                key={redemption.id}
                                                className={`group bg-white rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 hover:shadow-xl ${isApproved
                                                    ? 'border-green-200 shadow-green-100/50'
                                                    : 'border-gray-100 shadow-pink-100/50 hover:border-pink-200'
                                                    }`}
                                            >
                                                {/* Status Banner */}
                                                {isApproved && (
                                                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2 text-sm font-medium flex items-center gap-2">
                                                        <CheckCircle2 size={16} />
                                                        Approved - Ready to give!
                                                    </div>
                                                )}

                                                <div className="p-5">
                                                    <div className="flex items-start gap-4">
                                                        {/* Reward Icon */}
                                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                                                            {reward?.icon || '🎁'}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-gray-900">{child?.name || 'Child'}</span>
                                                                <span className="text-gray-400">{isApproved ? 'is getting' : 'wants'}</span>
                                                            </div>
                                                            <h3 className="font-semibold text-gray-800 text-lg mt-1">{reward?.name || 'Reward'}</h3>

                                                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                                <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                    <Star size={14} className="text-amber-500" />
                                                                    {redemption.starsDeducted} stars
                                                                </div>
                                                                <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                                                    <Clock size={12} />
                                                                    {getTimeAgo(redemption.requestedAt)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="px-5 pb-5 flex gap-3">
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                onClick={() => handleRejectRedemption(redemption)}
                                                                disabled={processing === redemption.id}
                                                                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                            >
                                                                <XCircle size={18} />
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveRedemption(redemption)}
                                                                disabled={processing === redemption.id}
                                                                className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-200 hover:shadow-xl hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50"
                                                            >
                                                                {processing === redemption.id ? (
                                                                    <Spinner size="sm" />
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle2 size={18} />
                                                                        Approve Reward
                                                                    </>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                    {isApproved && (
                                                        <button
                                                            onClick={() => handleFulfillRedemption(redemption)}
                                                            disabled={processing === redemption.id}
                                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:shadow-xl transition-all disabled:opacity-50"
                                                        >
                                                            {processing === redemption.id ? (
                                                                <Spinner size="sm" />
                                                            ) : (
                                                                <>
                                                                    <Gift size={18} />
                                                                    Mark as Given
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Custom Reward Requests Section */}
                        {customRewardRequests.filter(r => r.status === 'pending' || r.status === 'stars_set').length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                                        <Plus size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Custom Reward Requests</h2>
                                        <p className="text-sm text-gray-500">{customRewardRequests.filter(r => r.status === 'pending').length} awaiting your action</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {customRewardRequests.filter(r => r.status === 'pending' || r.status === 'stars_set').map((request) => {
                                        const child = children[request.childId];
                                        if (!child) return null;

                                        return (
                                            <CustomRewardRequestCard
                                                key={request.id}
                                                request={{
                                                    ...request,
                                                    childStarBalance: child.starBalances?.growth || 0,
                                                }}
                                                childAvatar={child.avatar}
                                                onSetStars={handleSetCustomRewardStars}
                                                onApprove={handleApproveCustomReward}
                                                onReject={handleRejectCustomReward}
                                                processing={processing}
                                            />
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
