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

    // Custom reward star input
    const [customStarInputs, setCustomStarInputs] = useState<Record<string, number>>({});

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
                                setTasks(prev => ({ ...prev, [taskId]: { id: taskId, title: data.title, category: data.category } }));
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
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-10 w-20 h-20 bg-white/20 rounded-full blur-xl" />
                    <div className="absolute top-8 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all"
                        >
                            <ChevronLeft size={22} />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Clock size={24} />
                                Approvals
                            </h1>
                            <p className="text-white/70 text-sm">Review and approve activities</p>
                        </div>
                        {totalPending > 0 && (
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                <span className="font-bold text-white">{totalPending}</span>
                                <span className="text-white/80 text-sm">pending</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-6 -mt-2">
                {/* Tabs */}
                <div className="bg-white rounded-2xl p-1.5 shadow-lg shadow-indigo-100/50 mb-6">
                    <div className="flex">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                    ${activeTab === tab.id
                                        ? `bg-${tab.color}-500 text-white shadow-lg`
                                        : 'text-gray-500 hover:bg-gray-50'}`}
                                style={activeTab === tab.id ? {
                                    backgroundColor: tab.color === 'indigo' ? '#6366f1' : tab.color === 'pink' ? '#ec4899' : '#a855f7'
                                } : {}}
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
                                    <div key={completion.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: category?.color ? `${category.color}15` : '#f8fafc' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{category?.icon || '📋'}</span>
                                                <span className="text-sm font-semibold" style={{ color: category?.color || '#64748b' }}>{category?.label || 'Task'}</span>
                                            </div>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock size={12} /> {getTimeAgo(completion.completedAt)}
                                            </span>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-start gap-4">
                                                {child && (
                                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md" style={{ backgroundColor: child.avatar.backgroundColor }}>
                                                        {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{child?.name || 'Child'}</span>
                                                        <span className="text-gray-400">completed</span>
                                                    </div>
                                                    <h3 className="font-semibold text-gray-800 text-lg mt-1">{task?.title || 'Task'}</h3>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                                                            <Star size={14} fill="white" /> +{completion.starsAwarded}
                                                        </div>
                                                        {completion.proofImageBase64 && (
                                                            <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                <Camera size={14} /> Photo
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {completion.proofImageBase64 && (
                                                <div className="mt-5 pt-5 border-t border-gray-100">
                                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-3 flex items-center gap-2">
                                                        <Camera size={12} /> Proof Photo
                                                    </p>
                                                    <Image
                                                        src={completion.proofImageBase64}
                                                        alt="Proof"
                                                        width={400}
                                                        height={250}
                                                        className="rounded-xl border-2 border-gray-100 object-cover w-full max-w-sm h-48"
                                                    />
                                                </div>
                                            )}

                                            {/* Optional Review Input */}
                                            <div className="mt-5 pt-5 border-t border-gray-100">
                                                <label className="text-xs text-gray-400 uppercase font-semibold mb-2 block">Leave a Review (Optional)</label>
                                                <textarea
                                                    value={taskReviews[completion.id] || ''}
                                                    onChange={(e) => setTaskReviews(prev => ({ ...prev, [completion.id]: e.target.value }))}
                                                    placeholder="Great job! Keep it up..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-900 resize-none text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="px-5 pb-5 flex gap-3">
                                            <button
                                                onClick={() => handleRejectTask(completion)}
                                                disabled={processing === completion.id}
                                                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                <XCircle size={18} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveTask(completion)}
                                                disabled={processing === completion.id}
                                                className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                                            >
                                                {processing === completion.id ? <Spinner size="sm" /> : <><CheckCircle2 size={18} /> Approve & Award Stars</>}
                                            </button>
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

                                        <div className="px-5 pb-5 flex gap-3">
                                            {isPending && (
                                                <>
                                                    <button
                                                        onClick={() => handleRejectRedemption(redemption)}
                                                        disabled={processing === redemption.id}
                                                        className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                    >
                                                        <XCircle size={18} /> Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveRedemption(redemption)}
                                                        disabled={processing === redemption.id}
                                                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-200 transition-all disabled:opacity-50"
                                                    >
                                                        {processing === redemption.id ? <Spinner size="sm" /> : <><CheckCircle2 size={18} /> Approve</>}
                                                    </button>
                                                </>
                                            )}
                                            {isApproved && (
                                                <button
                                                    onClick={() => handleFulfillRedemption(redemption)}
                                                    disabled={processing === redemption.id}
                                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
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
        </div>
    );
}
