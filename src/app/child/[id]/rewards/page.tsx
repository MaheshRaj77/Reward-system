'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { Star, Gift, Lock, Check, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ChildData {
    id: string;
    familyId: string;
    starBalances: { growth: number };
    ageGroup: string;
}

interface RewardData {
    id: string;
    name: string;
    description?: string;
    icon: string;
    starType: 'growth';
    starCost: number;
    requiresApproval: boolean;
}

interface RedemptionData {
    id: string;
    rewardId: string;
    rewardName: string;
    rewardIcon: string;
    starsDeducted: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: { seconds: number } | null;
}

export default function ChildRewards() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [rewards, setRewards] = useState<RewardData[]>([]);
    const [claimedRewards, setClaimedRewards] = useState<RedemptionData[]>([]);
    const [redeemingReward, setRedeemingReward] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const childDoc = await getDoc(doc(db, 'children', childId));
                if (!childDoc.exists()) {
                    router.push('/child/login');
                    return;
                }

                const childData = childDoc.data();
                setChild({
                    id: childDoc.id,
                    familyId: childData.familyId,
                    starBalances: childData.starBalances,
                    ageGroup: childData.ageGroup,
                });

                // Subscribe to available rewards
                const rewardsQuery = query(
                    collection(db, 'rewards'),
                    where('familyId', '==', childData.familyId),
                    where('isActive', '==', true)
                );

                const unsubscribeRewards = onSnapshot(rewardsQuery, (snapshot) => {
                    const rewardsData: RewardData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        rewardsData.push({
                            id: doc.id,
                            name: data.name,
                            description: data.description,
                            icon: data.icon,
                            starType: data.starType,
                            starCost: data.starCost,
                            requiresApproval: data.requiresApproval,
                        });
                    });
                    setRewards(rewardsData);
                    setLoading(false);
                });

                // Subscribe to claimed rewards (redemptions)
                const redemptionsQuery = query(
                    collection(db, 'rewardRedemptions'),
                    where('childId', '==', childId)
                );

                const unsubscribeRedemptions = onSnapshot(redemptionsQuery, async (snapshot) => {
                    const redemptionsData: RedemptionData[] = [];

                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
                        // Get reward info
                        let rewardName = 'Unknown Reward';
                        let rewardIcon = '🎁';

                        try {
                            const rewardDoc = await getDoc(doc(db, 'rewards', data.rewardId));
                            if (rewardDoc.exists()) {
                                const rewardData = rewardDoc.data();
                                rewardName = rewardData.name;
                                rewardIcon = rewardData.icon;
                            }
                        } catch (e) {
                            console.error('Error fetching reward:', e);
                        }

                        redemptionsData.push({
                            id: docSnap.id,
                            rewardId: data.rewardId,
                            rewardName,
                            rewardIcon,
                            starsDeducted: data.starsDeducted,
                            status: data.status,
                            requestedAt: data.requestedAt,
                        });
                    }

                    // Sort by date, newest first
                    redemptionsData.sort((a, b) => {
                        const timeA = a.requestedAt?.seconds || 0;
                        const timeB = b.requestedAt?.seconds || 0;
                        return timeB - timeA;
                    });

                    setClaimedRewards(redemptionsData);
                });

                return () => {
                    unsubscribeRewards();
                    unsubscribeRedemptions();
                };
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [childId, router]);

    const canAfford = (reward: RewardData) => {
        if (!child) return false;
        return (child.starBalances?.growth || 0) >= reward.starCost;
    };

    const handleRedeem = async (reward: RewardData) => {
        if (!child || !canAfford(reward)) return;

        setRedeemingReward(reward.id);

        try {
            const requiresApproval = reward.requiresApproval;

            await addDoc(collection(db, 'rewardRedemptions'), {
                rewardId: reward.id,
                childId: child.id,
                familyId: child.familyId,
                status: requiresApproval ? 'pending' : 'approved',
                starsDeducted: reward.starCost,
                starType: 'growth',
                requestedAt: serverTimestamp(),
            });

            // Only deduct stars immediately if NO approval is needed
            if (!requiresApproval) {
                const newGrowth = (child.starBalances?.growth || 0) - reward.starCost;

                await updateDoc(doc(db, 'children', child.id), {
                    'starBalances.growth': Math.max(0, newGrowth),
                });

                setChild({
                    ...child,
                    starBalances: { growth: Math.max(0, newGrowth) }
                });
            }

            setSuccessMessage(reward.requiresApproval
                ? `${reward.name} requested! Waiting for parent approval.`
                : `${reward.name} redeemed! Enjoy!`
            );
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Error redeeming:', err);
        } finally {
            setRedeemingReward(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (!child) return null;

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 rounded-3xl p-6 text-white shadow-2xl shadow-rose-200 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />
                    <div className="absolute top-1/2 left-1/3 text-8xl opacity-10 transform -rotate-12">🎁</div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">Reward Store 🛍️</h1>
                            <p className="text-white/80">Spend your hard-earned stars!</p>
                        </div>

                        {/* Animated Star Balance */}
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                                    <Star className="text-white" size={24} fill="white" />
                                </div>
                                <div>
                                    <div className="text-3xl font-black">{child.starBalances?.growth || 0}</div>
                                    <div className="text-xs text-white/70 font-bold uppercase tracking-wide">Stars Available</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick info */}
                    <div className="flex gap-4 text-sm">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                            <span className="font-bold">{rewards.length}</span> rewards available
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                            <span className="font-bold">{rewards.filter(r => canAfford(r)).length}</span> you can afford
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Overlay - Enhanced */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl transform animate-in zoom-in-95 duration-500">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                            <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-5xl shadow-xl">
                                🎉
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">
                            {successMessage.includes('requested') ? 'Request Sent!' : 'Awesome!'}
                        </h3>
                        <p className="text-gray-600 font-medium">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Rewards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {rewards.length === 0 ? (
                    <div className="col-span-full py-16 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50">
                            🏪
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Store is Empty</h3>
                        <p className="text-gray-500">Ask your parent to stock up the shop!</p>
                    </div>
                ) : (
                    rewards.map((reward) => {
                        const affordable = canAfford(reward);

                        return (
                            <div
                                key={reward.id}
                                className={`group relative bg-white border rounded-3xl p-4 flex flex-col items-center text-center transition-all duration-300
                                    ${affordable
                                        ? 'border-indigo-100 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1'
                                        : 'border-gray-100 opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                                    }`}
                            >
                                {/* Price Tag */}
                                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-amber-100 text-amber-700">
                                    <Star size={12} fill="currentColor" />
                                    {reward.starCost}
                                </div>

                                <div className="text-5xl mb-4 mt-2 transform transition-transform group-hover:scale-110 duration-300">
                                    {reward.icon}
                                </div>

                                <h3 className="font-bold text-gray-900 leading-tight mb-1">{reward.name}</h3>
                                {reward.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{reward.description}</p>
                                )}

                                <div className="mt-auto pt-4 w-full">
                                    <button
                                        onClick={() => handleRedeem(reward)}
                                        disabled={!affordable || redeemingReward === reward.id}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                                            ${affordable
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {redeemingReward === reward.id ? (
                                            <Spinner size="sm" />
                                        ) : affordable ? (
                                            <>Get It <Check size={16} /></>
                                        ) : (
                                            <>Locked <Lock size={14} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Claimed Rewards Section */}
            {claimedRewards.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Gift className="text-pink-500" size={22} />
                        My Claimed Rewards
                    </h2>

                    <div className="space-y-3">
                        {claimedRewards.map((redemption) => {
                            const date = redemption.requestedAt
                                ? new Date(redemption.requestedAt.seconds * 1000)
                                : null;
                            const dateStr = date
                                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Unknown';

                            return (
                                <div
                                    key={redemption.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${redemption.status === 'approved'
                                            ? 'bg-green-50 border-green-200'
                                            : redemption.status === 'rejected'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-amber-50 border-amber-200'
                                        }`}
                                >
                                    {/* Reward Icon */}
                                    <div className="text-3xl flex-shrink-0">
                                        {redemption.rewardIcon}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">
                                            {redemption.rewardName}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Star size={12} fill="currentColor" className="text-amber-500" />
                                                {redemption.starsDeducted}
                                            </span>
                                            <span>•</span>
                                            <span>{dateStr}</span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${redemption.status === 'approved'
                                            ? 'bg-green-500 text-white'
                                            : redemption.status === 'rejected'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-amber-500 text-white'
                                        }`}>
                                        {redemption.status === 'approved' ? (
                                            <><CheckCircle size={14} /> Approved</>
                                        ) : redemption.status === 'rejected' ? (
                                            <><XCircle size={14} /> Rejected</>
                                        ) : (
                                            <><Clock size={14} /> Pending</>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
