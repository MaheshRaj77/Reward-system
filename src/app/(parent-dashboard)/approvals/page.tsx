'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { Camera, Check, X, Clock, Star, Gift, ChevronLeft, Sparkles, ZoomIn, CheckCircle2, XCircle, Plus, ListTodo } from 'lucide-react';

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

interface CustomRewardRequest {
    id: string;
    childId: string;
    childName: string;
    rewardName: string;
    rewardLink: string;
    rewardImage: string | null;
    status: 'pending' | 'stars_set' | 'approved' | 'rejected' | 'pending_claim' | 'claimed';
    starsRequired: number | null;
    requestedAt: { seconds: number };
}

interface TaskInfo {
    id: string;
    title: string;
    category: keyof typeof TASK_CATEGORIES;
    description?: string;
    starValue: number;
    taskType: 'one-time' | 'recurring' | 'habit' | 'challenge' | 'bonus';
    frequency?: { type: 'daily' | 'weekly' | 'monthly' | 'custom' };
    deadline?: { seconds: number };
    difficulty?: 'easy' | 'medium' | 'hard';
    proofRequired: 'none' | 'photo' | 'timer' | 'checklist' | 'parent-confirm';
    isAutoApproved: boolean;
    isChatEnabled: boolean;
    imageBase64?: string;
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
    starBalances?: { growth: number };
    ageGroup?: string;
    streaks?: { currentStreak: number; longestStreak: number };
    profileImageBase64?: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

type TabType = 'tasks' | 'rewards' | 'custom';

export default function ApprovalsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('tasks');

    const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
    const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
    const [customRewardRequests, setCustomRewardRequests] = useState<CustomRewardRequest[]>([]);
    const [tasks, setTasks] = useState<Record<string, TaskInfo>>({});
    const [rewards, setRewards] = useState<Record<string, RewardInfo>>({});
    const [children, setChildren] = useState<Record<string, ChildInfo>>({});
    const [processing, setProcessing] = useState<string | null>(null);

    // Task review inputs (optional)
    const [taskReviews, setTaskReviews] = useState<Record<string, string>>({});
    // Rejection reason (optional)
    const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
    // Reward rejection reasons (optional)
    const [rewardRejectionReasons, setRewardRejectionReasons] = useState<Record<string, string>>({});

    // Custom reward star input
    const [customStarInputs, setCustomStarInputs] = useState<Record<string, number>>({});

    // Full image modal
    const [showFullImage, setShowFullImage] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                // Pending task completions
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

                    for (const taskId of taskIds) {
                        if (!tasks[taskId]) {
                            const taskDoc = await getDoc(doc(db, 'tasks', taskId));
                            if (taskDoc.exists()) {
                                const data = taskDoc.data();
                                setTasks(prev => ({
                                    ...prev,
                                    [taskId]: {
                                        id: taskId,
                                        title: data.title,
                                        category: data.category,
                                        description: data.description || undefined,
                                        starValue: data.starValue || 0,
                                        taskType: data.taskType || 'one-time',
                                        frequency: data.frequency || undefined,
                                        deadline: data.deadline || undefined,
                                        difficulty: data.difficulty || undefined,
                                        proofRequired: data.proofRequired || 'none',
                                        isAutoApproved: data.isAutoApproved || false,
                                        isChatEnabled: data.isChatEnabled || false,
                                        imageBase64: data.imageBase64 || undefined,
                                    }
                                }));
                            }
                        }
                    }

                    for (const childId of childIds) {
                        if (!children[childId]) {
                            const childDoc = await getDoc(doc(db, 'children', childId));
                            if (childDoc.exists()) {
                                const data = childDoc.data();
                                setChildren(prev => ({
                                    ...prev,
                                    [childId]: {
                                        id: childId,
                                        name: data.name,
                                        avatar: data.avatar,
                                        starBalances: data.starBalances,
                                        ageGroup: data.ageGroup,
                                        streaks: data.streaks,
                                        profileImageBase64: data.profileImageBase64,
                                    }
                                }));
                            }
                        }
                    }

                    setTaskCompletions(completionsData);
                    setLoading(false);
                });

                // Pending redemptions
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

                    for (const rewardId of rewardIds) {
                        if (!rewards[rewardId]) {
                            const rewardDoc = await getDoc(doc(db, 'rewards', rewardId));
                            if (rewardDoc.exists()) {
                                const data = rewardDoc.data();
                                setRewards(prev => ({ ...prev, [rewardId]: { id: rewardId, name: data.name, icon: data.icon } }));
                            }
                        }
                    }

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

                // Custom reward requests
                const customRequestsQuery = query(
                    collection(db, 'customRewardRequests'),
                    where('familyId', '==', parent.id),
                    where('status', 'in', ['pending', 'stars_set', 'pending_claim'])
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

    // Handlers
    const handleApproveTask = async (completion: TaskCompletion) => {
        setProcessing(completion.id);
        try {
            const review = taskReviews[completion.id] || '';
            await updateDoc(doc(db, 'taskCompletions', completion.id), {
                status: 'approved',
                approvedAt: serverTimestamp(),
                parentReview: review || null,
            });

            const childDoc = await getDoc(doc(db, 'children', completion.childId));
            if (childDoc.exists()) {
                const childData = childDoc.data();
                const newGrowth = (childData.starBalances?.growth || 0) + completion.starsAwarded;
                const newWeeklyEarned = (childData.starBalances?.weeklyEarned || 0) + completion.starsAwarded;
                await updateDoc(doc(db, 'children', completion.childId), {
                    'starBalances.growth': newGrowth,
                    'starBalances.weeklyEarned': newWeeklyEarned,
                });
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectTask = async (completion: TaskCompletion, reason?: string) => {
        setProcessing(completion.id);
        try {
            // Mark completion as rejected/redo
            await updateDoc(doc(db, 'taskCompletions', completion.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectionReason: reason || null,
                redoRequested: true,
            });

            // Also update the task assignment status back to 'assigned' so child can redo
            const taskDoc = await getDoc(doc(db, 'tasks', completion.taskId));
            if (taskDoc.exists()) {
                await updateDoc(doc(db, 'tasks', completion.taskId), {
                    status: 'active',
                    updatedAt: serverTimestamp(),
                });
            }

            // Clear the rejection reason input
            setRejectionReasons(prev => {
                const newReasons = { ...prev };
                delete newReasons[completion.id];
                return newReasons;
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
            // Deduct stars from child when approved
            const childDoc = await getDoc(doc(db, 'children', redemption.childId));
            if (childDoc.exists()) {
                const childData = childDoc.data();
                const currentStars = childData.starBalances?.growth || 0;
                const newGrowth = Math.max(0, currentStars - redemption.starsDeducted);
                await updateDoc(doc(db, 'children', redemption.childId), {
                    'starBalances.growth': newGrowth,
                });
            }

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

    const handleRejectRedemption = async (redemption: RewardRedemption, reason?: string) => {
        setProcessing(redemption.id);
        try {
            // No refund needed - stars weren't deducted on request
            await updateDoc(doc(db, 'rewardRedemptions', redemption.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                rejectionReason: reason || null,
            });

            // Clear rejection reason input
            setRewardRejectionReasons(prev => {
                const newReasons = { ...prev };
                delete newReasons[redemption.id];
                return newReasons;
            });
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setProcessing(null);
        }
    };

    const handleSetCustomRewardStars = async (request: CustomRewardRequest) => {
        const stars = customStarInputs[request.id];
        if (!stars || stars <= 0) {
            alert('Please enter a valid star amount');
            return;
        }

        setProcessing(request.id);
        try {
            await updateDoc(doc(db, 'customRewardRequests', request.id), {
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

    const handleApproveCustomReward = async (request: CustomRewardRequest) => {
        setProcessing(request.id);
        try {
            // Mark as approved - child will claim and stars will be deducted then
            await updateDoc(doc(db, 'customRewardRequests', request.id), {
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
    // Handler for approving a pending claim (child has clicked "Get It")
    const handleApproveClaimCustomReward = async (request: CustomRewardRequest) => {
        setProcessing(request.id);
        try {
            // Deduct stars from child (no check - parent decides to approve)
            const childDoc = await getDoc(doc(db, 'children', request.childId));
            if (!childDoc.exists()) {
                alert('Child not found');
                setProcessing(null);
                return;
            }

            const childData = childDoc.data();
            const currentStars = childData.starBalances?.growth || 0;
            const starsRequired = request.starsRequired || 0;

            // Deduct stars (can go negative if parent approves anyway)
            await updateDoc(doc(db, 'children', request.childId), {
                'starBalances.growth': currentStars - starsRequired,
            });

            // Mark as claimed
            await updateDoc(doc(db, 'customRewardRequests', request.id), {
                status: 'claimed',
                claimedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to approve claim. Please try again.');
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
        } finally {
            setProcessing(null);
        }
    };

    const getTimeAgo = (timestamp: { seconds: number }) => {
        const seconds = Math.floor(Date.now() / 1000 - timestamp.seconds);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const pendingRewards = redemptions.filter(r => r.status === 'pending');
    const approvedRewards = redemptions.filter(r => r.status === 'approved');

    const tabs: { id: TabType; label: string; count: number; icon: React.ReactNode; color: string }[] = [
        { id: 'tasks', label: 'Tasks', count: taskCompletions.length, icon: <ListTodo size={18} />, color: 'indigo' },
        { id: 'rewards', label: 'Rewards', count: pendingRewards.length + approvedRewards.length, icon: <Gift size={18} />, color: 'pink' },
        { id: 'custom', label: 'Custom', count: customRewardRequests.length, icon: <Plus size={18} />, color: 'purple' },
    ];

    const totalPending = taskCompletions.length + pendingRewards.length + customRewardRequests.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                            >
                                <ChevronLeft size={22} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Review and approve activities</p>
                            </div>
                        </div>
                        {totalPending > 0 && (
                            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                                <span className="font-bold text-amber-700">{totalPending}</span>
                                <span className="text-amber-600 text-sm">pending</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-6 -mt-2">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                                ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                    <div className="space-y-4">
                        {taskCompletions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-lg">
                                <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-full flex items-center justify-center text-4xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Tasks</h3>
                                <p className="text-gray-500">Task completions will appear here for your approval.</p>
                            </div>
                        ) : (
                            taskCompletions.map((completion) => {
                                const task = tasks[completion.taskId];
                                const child = children[completion.childId];
                                const category = task ? TASK_CATEGORIES[task.category] : null;

                                return (
                                    <div key={completion.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        {/* Compact Header */}
                                        <div className="px-4 py-2 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{category?.icon || '📋'}</span>
                                                <span className="text-xs font-semibold text-gray-600">{category?.label || 'Task'}</span>
                                                {task?.frequency?.type && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                                        {task.frequency.type}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400">{getTimeAgo(completion.completedAt)}</span>
                                        </div>

                                        <div className="p-4">
                                            {/* Two Column Layout */}
                                            <div className="flex gap-4">
                                                {/* Left: Child Info */}
                                                {child && (
                                                    <div className="flex flex-col items-center text-center min-w-[70px]">
                                                        <div
                                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm overflow-hidden"
                                                            style={{ backgroundColor: child.avatar.backgroundColor }}
                                                        >
                                                            {child.profileImageBase64 ? (
                                                                <Image src={child.profileImageBase64} alt={child.name} width={48} height={48} className="object-cover" />
                                                            ) : (
                                                                AVATAR_EMOJIS[child.avatar.presetId] || '⭐'
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-800 mt-1 truncate max-w-[70px]">{child.name}</span>
                                                        <div className="flex items-center gap-0.5 text-amber-600 text-xs mt-0.5">
                                                            <Star size={10} fill="currentColor" />
                                                            <span className="font-medium">{child.starBalances?.growth || 0}</span>
                                                        </div>
                                                        {child.ageGroup && (
                                                            <span className="text-[10px] text-gray-400 mt-0.5">Age {child.ageGroup}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Right: Task Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-800 truncate">{task?.title || 'Task'}</h3>
                                                    {task?.description && (
                                                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{task.description}</p>
                                                    )}

                                                    {/* Compact Badges Row */}
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                            <Star size={10} fill="currentColor" /> +{completion.starsAwarded}
                                                        </span>
                                                        {task?.difficulty && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${task.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                                                                task.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                                                                }`}>
                                                                {task.difficulty}
                                                            </span>
                                                        )}
                                                        {completion.proofImageBase64 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                                                📷 photo
                                                            </span>
                                                        )}
                                                    </div>

                                                    {task?.deadline && (
                                                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            Due: {new Date(task.deadline.seconds * 1000).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Collapsible Photos Section */}
                                            {(completion.proofImageBase64 || task?.imageBase64) && (
                                                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 flex-wrap">
                                                    {completion.proofImageBase64 && (
                                                        <div
                                                            className="flex-1 min-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => { setFullImageUrl(completion.proofImageBase64!); setShowFullImage(true); }}
                                                        >
                                                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Proof 🔍</p>
                                                            <Image
                                                                src={completion.proofImageBase64}
                                                                alt="Proof"
                                                                width={180}
                                                                height={100}
                                                                className="rounded-lg border border-gray-200 object-cover h-24 w-full"
                                                            />
                                                        </div>
                                                    )}
                                                    {task?.imageBase64 && (
                                                        <div
                                                            className="flex-1 min-w-[120px] cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => { setFullImageUrl(task.imageBase64!); setShowFullImage(true); }}
                                                        >
                                                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Task Ref 🔍</p>
                                                            <Image
                                                                src={task.imageBase64}
                                                                alt="Task"
                                                                width={180}
                                                                height={100}
                                                                className="rounded-lg border border-gray-200 object-cover h-24 w-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={taskReviews[completion.id] || ''}
                                                    onChange={(e) => setTaskReviews(prev => ({ ...prev, [completion.id]: e.target.value }))}
                                                    placeholder="Add a review message (optional)..."
                                                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                                                />
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={rejectionReasons[completion.id] || ''}
                                                    onChange={(e) => setRejectionReasons(prev => ({ ...prev, [completion.id]: e.target.value }))}
                                                    placeholder="Redo reason (if rejecting)..."
                                                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRejectTask(completion, rejectionReasons[completion.id])}
                                                    disabled={processing === completion.id}
                                                    className="flex-1 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all disabled:opacity-50"
                                                >
                                                    <XCircle size={14} /> Redo
                                                </button>
                                                <button
                                                    onClick={() => handleApproveTask(completion)}
                                                    disabled={processing === completion.id}
                                                    className="flex-[2] py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                                >
                                                    {processing === completion.id ? <Spinner size="sm" /> : <><CheckCircle2 size={14} /> Approve & Award</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                    <div className="space-y-4">
                        {redemptions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-lg">
                                <div className="w-20 h-20 mx-auto bg-pink-50 rounded-full flex items-center justify-center text-4xl mb-4">🎁</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Reward Requests</h3>
                                <p className="text-gray-500">When children redeem rewards, they'll appear here.</p>
                            </div>
                        ) : (
                            redemptions.map((redemption) => {
                                const reward = rewards[redemption.rewardId];
                                const child = children[redemption.childId];
                                const isPending = redemption.status === 'pending';
                                const isApproved = redemption.status === 'approved';

                                return (
                                    <div key={redemption.id} className={`bg-white rounded-2xl shadow-lg border overflow-hidden ${isApproved ? 'border-green-200' : 'border-gray-100'}`}>
                                        {isApproved && (
                                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2 text-sm font-medium flex items-center gap-2">
                                                <CheckCircle2 size={16} /> Approved - Ready to give!
                                            </div>
                                        )}

                                        <div className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-3xl shadow-inner">
                                                    {reward?.icon || '🎁'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{child?.name || 'Child'}</span>
                                                        <span className="text-gray-400">{isApproved ? 'is getting' : 'wants'}</span>
                                                    </div>
                                                    <h3 className="font-semibold text-gray-800 text-lg mt-1">{reward?.name || 'Reward'}</h3>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                                            <Star size={14} className="text-amber-500" /> {redemption.starsDeducted} stars
                                                        </div>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Clock size={12} /> {getTimeAgo(redemption.requestedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-5 pb-5">
                                            {isPending && (
                                                <>
                                                    {/* Optional Rejection Reason */}
                                                    <div className="mb-4">
                                                        <label className="text-xs text-gray-400 uppercase font-semibold mb-2 block">Rejection Reason (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={rewardRejectionReasons?.[redemption.id] || ''}
                                                            onChange={(e) => setRewardRejectionReasons(prev => ({ ...prev, [redemption.id]: e.target.value }))}
                                                            placeholder="e.g., Not available right now"
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all text-gray-900 text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => handleRejectRedemption(redemption, rewardRejectionReasons?.[redemption.id])}
                                                            disabled={processing === redemption.id}
                                                            className="flex-1 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                        >
                                                            <XCircle size={18} />
                                                            <span>Reject</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveRedemption(redemption)}
                                                            disabled={processing === redemption.id}
                                                            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-200 transition-all disabled:opacity-50"
                                                        >
                                                            {processing === redemption.id ? <Spinner size="sm" /> : <><CheckCircle2 size={18} /> Approve</>}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            {isApproved && (
                                                <button
                                                    onClick={() => handleFulfillRedemption(redemption)}
                                                    disabled={processing === redemption.id}
                                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                                                >
                                                    {processing === redemption.id ? <Spinner size="sm" /> : <><Gift size={18} /> Mark as Given</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Custom Rewards Tab */}
                {activeTab === 'custom' && (
                    <div className="space-y-4">
                        {customRewardRequests.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-lg">
                                <div className="w-20 h-20 mx-auto bg-purple-50 rounded-full flex items-center justify-center text-4xl mb-4">✨</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Custom Requests</h3>
                                <p className="text-gray-500">When children request custom rewards, they'll appear here for you to set the star value and approve.</p>
                            </div>
                        ) : (
                            customRewardRequests.map((request) => {
                                const child = children[request.childId];
                                const isPending = request.status === 'pending';
                                const isStarsSet = request.status === 'stars_set';
                                const isPendingClaim = request.status === 'pending_claim';

                                return (
                                    <div key={request.id} className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
                                        <div className={`px-5 py-3 text-white ${isPendingClaim ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={18} />
                                                    <span className="font-bold">
                                                        {isPendingClaim ? 'Claim Request' : 'Custom Reward Request'}
                                                    </span>
                                                </div>
                                                <span className="text-white/80 text-sm">{getTimeAgo(request.requestedAt)}</span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-start gap-4">
                                                {request.rewardImage ? (
                                                    <Image
                                                        src={request.rewardImage}
                                                        alt={request.rewardName}
                                                        width={80}
                                                        height={80}
                                                        className="w-20 h-20 rounded-xl object-cover shadow-md"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-3xl">🎁</div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{request.childName}</span>
                                                        <span className="text-gray-400">
                                                            {isPendingClaim ? 'wants to claim' : 'requested'}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-gray-800 text-lg mt-1">{request.rewardName}</h3>
                                                    {request.rewardLink && (
                                                        <a
                                                            href={request.rewardLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-indigo-600 hover:underline mt-1 block"
                                                        >
                                                            View link →
                                                        </a>
                                                    )}
                                                    {child && (
                                                        <div className="mt-3 text-sm text-gray-500">
                                                            {child.name} has <span className="font-bold text-amber-600">{child.starBalances?.growth || 0}⭐</span> stars
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Set Stars Section */}
                                            {isPending && (
                                                <div className="mt-5 pt-5 border-t border-gray-100">
                                                    <label className="text-sm font-bold text-gray-700 mb-2 block">Set Star Value</label>
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 relative">
                                                            <Star size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={customStarInputs[request.id] || ''}
                                                                onChange={(e) => setCustomStarInputs(prev => ({ ...prev, [request.id]: parseInt(e.target.value) || 0 }))}
                                                                placeholder="Enter stars..."
                                                                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleSetCustomRewardStars(request)}
                                                            disabled={processing === request.id}
                                                            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                                                        >
                                                            Set Price
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stars Already Set */}
                                            {isStarsSet && (
                                                <div className="mt-5 pt-5 border-t border-gray-100">
                                                    <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-200">
                                                        <div>
                                                            <span className="text-sm text-amber-700 font-medium">Star Value Set</span>
                                                            <div className="text-2xl font-black text-amber-600 flex items-center gap-1">
                                                                <Star size={20} fill="currentColor" /> {request.starsRequired}
                                                            </div>
                                                        </div>
                                                        {child && (
                                                            <div className="text-right">
                                                                <span className="text-sm text-gray-500">{child.name}'s balance</span>
                                                                <div className={`font-bold ${(child.starBalances?.growth || 0) >= (request.starsRequired || 0) ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {child.starBalances?.growth || 0} stars
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pending Claim Section */}
                                            {isPendingClaim && (
                                                <div className="mt-5 pt-5 border-t border-gray-100">
                                                    <div className="flex items-center justify-between bg-green-50 rounded-xl p-4 border border-green-200">
                                                        <div>
                                                            <span className="text-sm text-green-700 font-medium">Child wants to claim this reward</span>
                                                            <div className="text-2xl font-black text-green-600 flex items-center gap-1">
                                                                <Star size={20} fill="currentColor" /> {request.starsRequired} stars required
                                                            </div>
                                                        </div>
                                                        {child && (
                                                            <div className="text-right">
                                                                <span className="text-sm text-gray-500">{child.name}'s balance</span>
                                                                <div className={`font-bold ${(child.starBalances?.growth || 0) >= (request.starsRequired || 0) ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {child.starBalances?.growth || 0} stars
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="px-5 pb-5 flex gap-3">
                                            <button
                                                onClick={() => handleRejectCustomReward(request.id)}
                                                disabled={processing === request.id}
                                                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                <XCircle size={18} /> Reject
                                            </button>
                                            {isStarsSet && (
                                                <button
                                                    onClick={() => handleApproveCustomReward(request)}
                                                    disabled={processing === request.id}
                                                    className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
                                                >
                                                    {processing === request.id ? <Spinner size="sm" /> : <><CheckCircle2 size={18} /> Approve</>}
                                                </button>
                                            )}
                                            {isPendingClaim && (
                                                <button
                                                    onClick={() => handleApproveClaimCustomReward(request)}
                                                    disabled={processing === request.id}
                                                    className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                                                >
                                                    {processing === request.id ? <Spinner size="sm" /> : <><CheckCircle2 size={18} /> Approve Claim</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>

            {/* Full Image Modal */}
            {showFullImage && fullImageUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setShowFullImage(false)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full">
                        <button
                            onClick={() => setShowFullImage(false)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <X size={28} />
                        </button>
                        <Image
                            src={fullImageUrl}
                            alt="Full size image"
                            width={1200}
                            height={800}
                            className="rounded-xl object-contain w-full max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-center text-white/60 text-sm mt-3">Click outside to close</p>
                    </div>
                </div>
            )}
        </div>
    );
}
