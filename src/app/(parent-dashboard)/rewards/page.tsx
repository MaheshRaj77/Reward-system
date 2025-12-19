'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pencil, Trash2, Gift, Sparkles, CheckCircle, ChevronLeft } from 'lucide-react';

interface RewardData {
    id: string;
    name: string;
    description?: string;
    icon: string;
    category: string;
    starCost: number;
    limitPerWeek: number | null;
    requiresApproval: boolean;
    imageUrl?: string;
    imageBase64?: string;
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

interface RewardGiven {
    id: string;
    rewardId?: string;
    childId: string;
    rewardName: string;
    rewardIcon?: string;
    starsDeducted: number;
    fulfilledAt?: { seconds: number };
    claimedAt?: { seconds: number };
    rejectedAt?: { seconds: number };
    type: 'standard' | 'custom';
    childName?: string;
    status: 'fulfilled' | 'rejected' | 'claimed';
    rejectionReason?: string;
}

interface ChildInfo {
    id: string;
    name: string;
}

type TabType = 'list' | 'custom' | 'given';

function RewardsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = (searchParams.get('tab') as TabType) || 'list';

    const [loading, setLoading] = useState(true);
    const [rewards, setRewards] = useState<RewardData[]>([]);
    const [customRequests, setCustomRequests] = useState<CustomRewardRequest[]>([]);
    const [rewardsGiven, setRewardsGiven] = useState<RewardGiven[]>([]);
    const [children, setChildren] = useState<Record<string, ChildInfo>>({});
    const [deleting, setDeleting] = useState<string | null>(null);
    const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
    const [familyId, setFamilyId] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.id);

                // Load standard rewards
                const rewardsQuery = query(
                    collection(db, 'rewards'),
                    where('familyId', '==', parent.id)
                );

                const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
                    const rewardsData: RewardData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        rewardsData.push({
                            id: doc.id,
                            name: data.name,
                            description: data.description,
                            icon: data.icon,
                            category: data.category,
                            starCost: data.starCost,
                            limitPerWeek: data.limitPerWeek,
                            requiresApproval: data.requiresApproval,
                            imageUrl: data.imageUrl,
                            imageBase64: data.imageBase64,
                        });
                    });
                    setRewards(rewardsData);
                });

                // Load custom reward requests (approved ones that show in child's reward side)
                const customQuery = query(
                    collection(db, 'customRewardRequests'),
                    where('familyId', '==', parent.id),
                    where('status', 'in', ['approved', 'pending_claim', 'claimed'])
                );

                const unsubCustom = onSnapshot(customQuery, (snapshot) => {
                    const customData: CustomRewardRequest[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        customData.push({
                            id: doc.id,
                            childId: data.childId,
                            childName: data.childName,
                            rewardName: data.rewardName,
                            rewardLink: data.rewardLink,
                            rewardImage: data.rewardImage,
                            status: data.status,
                            starsRequired: data.starsRequired,
                            requestedAt: data.requestedAt,
                        });
                    });
                    setCustomRequests(customData);
                });

                // Load fulfilled and rejected rewards (standard)
                const redemptionsQuery = query(
                    collection(db, 'rewardRedemptions'),
                    where('familyId', '==', parent.id),
                    where('status', 'in', ['fulfilled', 'rejected'])
                );

                const unsubRedemptions = onSnapshot(redemptionsQuery, (snapshot) => {
                    const givenData: RewardGiven[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        givenData.push({
                            id: doc.id,
                            rewardId: data.rewardId,
                            childId: data.childId,
                            childName: data.childName,
                            rewardName: data.rewardName || 'Reward',
                            rewardIcon: data.rewardIcon,
                            starsDeducted: data.starsDeducted,
                            fulfilledAt: data.fulfilledAt,
                            rejectedAt: data.rejectedAt,
                            type: 'standard',
                            status: data.status,
                            rejectionReason: data.rejectionReason,
                        });
                    });
                    setRewardsGiven(prev => {
                        const customGiven = prev.filter(r => r.type === 'custom');
                        return [...givenData, ...customGiven];
                    });
                });

                // Load claimed custom rewards
                const claimedCustomQuery = query(
                    collection(db, 'customRewardRequests'),
                    where('familyId', '==', parent.id),
                    where('status', '==', 'claimed')
                );

                const unsubClaimedCustom = onSnapshot(claimedCustomQuery, (snapshot) => {
                    const customGivenData: RewardGiven[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        customGivenData.push({
                            id: doc.id,
                            childId: data.childId,
                            rewardName: data.rewardName,
                            starsDeducted: data.starsRequired || 0,
                            claimedAt: data.claimedAt,
                            type: 'custom',
                            childName: data.childName,
                            status: 'claimed',
                        });
                    });
                    setRewardsGiven(prev => {
                        const standardGiven = prev.filter(r => r.type === 'standard');
                        return [...standardGiven, ...customGivenData];
                    });
                });

                // Load children
                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.id)
                );

                const unsubChildren = onSnapshot(childrenQuery, (snapshot) => {
                    const childrenData: Record<string, ChildInfo> = {};
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        childrenData[doc.id] = { id: doc.id, name: data.name };
                    });
                    setChildren(childrenData);
                    setLoading(false);
                });

                return () => {
                    unsubRewards();
                    unsubCustom();
                    unsubRedemptions();
                    unsubClaimedCustom();
                    unsubChildren();
                };
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleDelete = async (rewardId: string) => {
        setDeleting(rewardId);
        try {
            await deleteDoc(doc(db, 'rewards', rewardId));
            setRewardToDelete(null);
        } catch (err) {
            console.error('Error deleting reward:', err);
            alert('Failed to delete reward. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const getTimeAgo = (timestamp: { seconds: number } | undefined) => {
        if (!timestamp) return '';
        const seconds = Math.floor(Date.now() / 1000 - timestamp.seconds);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const tabs = [
        { id: 'list' as TabType, label: 'Rewards List', icon: <Gift size={18} />, count: rewards.length },
        { id: 'custom' as TabType, label: 'Custom Rewards', icon: <Sparkles size={18} />, count: customRequests.filter(r => r.status !== 'claimed').length },
        { id: 'given' as TabType, label: 'Rewards Given', icon: <CheckCircle size={18} />, count: rewardsGiven.length },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
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
                                <h1 className="text-2xl font-bold text-gray-900">🎁 Reward Shop</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Manage rewards for your children</p>
                            </div>
                        </div>
                        {currentTab === 'list' && (
                            <Link href="/rewards/create">
                                <Button className="gap-2">
                                    <span>+</span> New Reward
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-5">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => router.push(`/rewards?tab=${tab.id}`)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
                                    ${currentTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${currentTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Rewards List Tab */}
                {currentTab === 'list' && (
                    <>
                        {rewards.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">🎁</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Rewards Yet</h3>
                                <p className="text-gray-500 mb-6 max-w-sm mx-auto">Add rewards that your children can earn by completing tasks.</p>
                                <Link href="/rewards/create">
                                    <Button size="lg" className="gap-2">
                                        <span>+</span> Add a Reward
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {rewards.map((reward) => {
                                    const rewardImage = reward.imageBase64 || reward.imageUrl;
                                    return (
                                        <div key={reward.id} className="group bg-white rounded-2xl p-4 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                {rewardImage ? (
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                                                        <img
                                                            src={rewardImage}
                                                            alt={reward.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-3xl shrink-0">
                                                        {reward.icon}
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-lg truncate">{reward.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                                                            <span className="text-sm">⭐</span>
                                                            <span className="font-bold text-sm">{reward.starCost}</span>
                                                        </div>
                                                        {reward.limitPerWeek && (
                                                            <span className="text-xs text-gray-400">{reward.limitPerWeek}/week</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/rewards/${reward.id}/edit`}
                                                        className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-all"
                                                    >
                                                        <Pencil size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setRewardToDelete(reward.id)}
                                                        disabled={deleting === reward.id}
                                                        className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-all"
                                                    >
                                                        {deleting === reward.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Custom Rewards Tab */}
                {currentTab === 'custom' && (
                    <>
                        {customRequests.filter(r => r.status !== 'claimed').length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">✨</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Custom Rewards</h3>
                                <p className="text-gray-500 max-w-sm mx-auto">Custom rewards approved for your children will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customRequests.filter(r => r.status !== 'claimed').map((request) => (
                                    <div key={request.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            {request.rewardImage ? (
                                                <Image
                                                    src={request.rewardImage}
                                                    alt={request.rewardName}
                                                    width={80}
                                                    height={80}
                                                    className="w-20 h-20 rounded-xl object-cover"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-3xl shrink-0">
                                                    🎁
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm text-gray-500">For</span>
                                                    <span className="font-semibold text-gray-800">{request.childName}</span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-lg">{request.rewardName}</h3>
                                                {request.rewardLink && (
                                                    <a
                                                        href={request.rewardLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-indigo-600 hover:underline"
                                                    >
                                                        View link →
                                                    </a>
                                                )}
                                                <div className="flex items-center gap-3 mt-3">
                                                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                                        <span>⭐</span>
                                                        <span className="font-bold">{request.starsRequired}</span>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${request.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        request.status === 'pending_claim' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                            'bg-gray-50 text-gray-600 border border-gray-200'
                                                        }`}>
                                                        {request.status === 'approved' ? '✓ Approved' :
                                                            request.status === 'pending_claim' ? '⏳ Claim Pending' :
                                                                request.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Rewards Given Tab */}
                {currentTab === 'given' && (
                    <>
                        {rewardsGiven.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">🏆</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Rewards History Yet</h3>
                                <p className="text-gray-500 max-w-sm mx-auto">Reward fulfillments and rejections will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rewardsGiven.map((given) => {
                                    const isRejected = given.status === 'rejected';
                                    const standardReward = given.type === 'standard' && given.rewardId ? rewards.find(r => r.id === given.rewardId) : null;
                                    const displayName = given.type === 'custom' ? given.rewardName : (standardReward?.name || given.rewardName || 'Reward');
                                    const displayIcon = given.type === 'custom' ? '✨' : (standardReward?.icon || given.rewardIcon || '🎁');

                                    return (
                                        <div
                                            key={given.id}
                                            className={`bg-white rounded-2xl p-4 border flex items-start gap-4 ${isRejected ? 'border-red-100' : 'border-green-100'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isRejected ? 'bg-red-50' : 'bg-green-50'
                                                }`}>
                                                {displayIcon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-bold ${isRejected ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                        {displayName}
                                                    </span>
                                                    {given.type === 'custom' && (
                                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Custom</span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rejected</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-0.5">
                                                    {isRejected ? 'Requested by' : 'Given to'}{' '}
                                                    <span className="font-medium">{given.childName || children[given.childId]?.name || 'Child'}</span>
                                                    {!isRejected && (
                                                        <>
                                                            {' • '}
                                                            <span className="text-amber-600">-{given.starsDeducted} ⭐</span>
                                                        </>
                                                    )}
                                                    {' • '}
                                                    {getTimeAgo(given.fulfilledAt || given.claimedAt || given.rejectedAt)}
                                                </div>
                                                {isRejected && given.rejectionReason && (
                                                    <div className="mt-2 text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                                                        <span className="font-medium">Reason:</span> {given.rejectionReason}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRejected ? 'bg-red-100' : 'bg-green-100'
                                                }`}>
                                                {isRejected ? (
                                                    <span className="text-red-600 text-lg">✕</span>
                                                ) : (
                                                    <CheckCircle size={20} className="text-green-600" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!rewardToDelete}
                onClose={() => setRewardToDelete(null)}
                onConfirm={() => rewardToDelete && handleDelete(rewardToDelete)}
                title="Delete Reward?"
                message="This will permanently delete this reward. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isLoading={!!deleting}
            />
        </div>
    );
}

export default function RewardsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        }>
            <RewardsContent />
        </Suspense>
    );
}
