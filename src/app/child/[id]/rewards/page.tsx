'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { Star, Gift, Lock, Check, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { CustomRewardRequestModal } from '@/components/child/CustomRewardRequestModal';
import { triggerConfetti } from '@/components/ui/Confetti';

interface ChildData {
    id: string;
    familyId: string;
    starBalances: { growth: number };
    ageGroup: string;
    name: string;
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

interface CustomRewardData {
    id: string;
    name: string;
    rewardName: string;
    rewardImage: string | null;
    rewardLink: string;
    starsRequired: number;
    status: 'approved';
    isCustom: true;
}

interface RedemptionData {
    id: string;
    rewardId: string;
    rewardName: string;
    rewardIcon: string;
    starsDeducted: number;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    requestedAt: { seconds: number } | null;
}

export default function ChildRewards() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [rewards, setRewards] = useState<RewardData[]>([]);
    const [customRewards, setCustomRewards] = useState<CustomRewardData[]>([]);
    const [claimedRewards, setClaimedRewards] = useState<RedemptionData[]>([]);
    const [redeemingReward, setRedeemingReward] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showCustomRewardModal, setShowCustomRewardModal] = useState(false);
    const [submittingCustomReward, setSubmittingCustomReward] = useState(false);

    useEffect(() => {
        if (!childId) return;

        const unsubscribers: (() => void)[] = [];

        const childUnsub = onSnapshot(doc(db, 'children', childId), (childDoc) => {
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
                name: childData.name || 'Child',
            });

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
            unsubscribers.push(unsubscribeRewards);

            const redemptionsQuery = query(
                collection(db, 'rewardRedemptions'),
                where('childId', '==', childId)
            );

            const unsubscribeRedemptions = onSnapshot(redemptionsQuery, async (snapshot) => {
                const redemptionsData: RedemptionData[] = [];

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
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

                redemptionsData.sort((a, b) => {
                    const timeA = a.requestedAt?.seconds || 0;
                    const timeB = b.requestedAt?.seconds || 0;
                    return timeB - timeA;
                });

                setClaimedRewards(redemptionsData);
            });
            unsubscribers.push(unsubscribeRedemptions);

            const customRewardsQuery = query(
                collection(db, 'customRewardRequests'),
                where('familyId', '==', childData.familyId),
                where('childId', '==', childId),
                where('status', '==', 'approved')
            );

            const unsubCustomRewards = onSnapshot(customRewardsQuery, (snapshot) => {
                const customRewardsData: CustomRewardData[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    customRewardsData.push({
                        id: doc.id,
                        name: data.rewardName,
                        rewardName: data.rewardName,
                        rewardImage: data.rewardImage || null,
                        rewardLink: data.rewardLink,
                        starsRequired: data.starsRequired,
                        status: 'approved',
                        isCustom: true,
                    });
                });
                setCustomRewards(customRewardsData);
            });
            unsubscribers.push(unsubCustomRewards);
        });
        unsubscribers.push(childUnsub);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
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
            if (!reward.requiresApproval) {
                triggerConfetti();
            }
            setTimeout(() => setShowSuccess(false), 3000);

            // Notify Parent
            try {
                const parentsQuery = query(collection(db, 'parents'), where('familyId', '==', child.familyId));
                const parentsSnap = await getDocs(parentsQuery);

                // Import in-app notification service
                const { ParentNotificationService } = await import('@/modules/parent/notification.service');

                parentsSnap.forEach(async (parentDoc: QueryDocumentSnapshot) => {
                    const parentData = parentDoc.data();

                    // Create in-app notification for parent
                    try {
                        await ParentNotificationService.notifyRewardRequest(
                            parentDoc.id,
                            child.name,
                            reward.name,
                            reward.id,
                            child.id
                        );
                    } catch (inAppErr) {
                        console.error('Failed to create in-app notification:', inAppErr);
                    }

                    // Push Notification
                    if (parentData?.notifications?.push && parentData?.fcmToken) {
                        const title = reward.requiresApproval ? '🎁 Reward Request' : '🎁 Reward Redeemed';
                        const body = reward.requiresApproval
                            ? `${child.name} requested "${reward.name}"`
                            : `${child.name} redeemed "${reward.name}"`;

                        await fetch('/api/notifications/send-notification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                token: parentData.fcmToken,
                                title,
                                body,
                                url: '/approvals?tab=rewards',
                            }),
                        });
                    }

                    // Email Notification
                    if (parentData?.email && parentData?.notifications?.email !== false) {
                        const { sendRewardRequestEmail } = await import('@/lib/email/actions');
                        await sendRewardRequestEmail(
                            parentData.email,
                            parentData.name || 'Parent',
                            child.name,
                            reward.name,
                            reward.starCost,
                            !reward.requiresApproval
                        );
                    }
                });
            } catch (notifyErr) {
                console.error("Failed to notify parent:", notifyErr);
            }

        } catch (err) {
            console.error('Error redeeming:', err);
        } finally {
            setRedeemingReward(null);
        }
    };

    const handleCustomRewardRequest = async (request: {
        name: string;
        link: string;
        image: string | null;
    }) => {
        if (!child) return;

        setSubmittingCustomReward(true);

        try {
            const docRef = await addDoc(collection(db, 'customRewardRequests'), {
                childId: child.id,
                familyId: child.familyId,
                childName: 'Child',
                rewardName: request.name,
                rewardLink: request.link,
                rewardImage: request.image,
                status: 'pending',
                starsRequired: null,
                requestedAt: serverTimestamp(),
                approvedAt: null,
            });

            setSuccessMessage('Custom reward request sent to parent! 🎉');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Notify Parent
            try {
                const parentsQuery = query(collection(db, 'parents'), where('familyId', '==', child.familyId));
                const parentsSnap = await getDocs(parentsQuery);

                // Import in-app notification service
                const { ParentNotificationService } = await import('@/modules/parent/notification.service');

                parentsSnap.forEach(async (parentDoc) => {
                    const parentData = parentDoc.data();

                    // Create in-app notification for parent
                    try {
                        await ParentNotificationService.notifyCustomRewardRequest(
                            parentDoc.id,
                            child.name,
                            request.name,
                            docRef.id, // Pass the ID of the newly created custom reward request
                            child.id
                        );
                    } catch (inAppErr) {
                        console.error('Failed to create in-app notification for custom reward:', inAppErr);
                    }

                    // Push Notification
                    if (parentData?.notifications?.push && parentData?.fcmToken) {
                        await fetch('/api/notifications/send-notification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                token: parentData.fcmToken,
                                title: '✨ Custom Reward Request',
                                body: `${child.name} asked for "${request.name}"`,
                                url: '/approvals?tab=custom',
                            }),
                        });
                    }

                    // Email Notification
                    if (parentData?.email && parentData?.notifications?.email !== false) {
                        const { sendCustomRewardRequestEmail } = await import('@/lib/email/actions');
                        await sendCustomRewardRequestEmail(
                            parentData.email,
                            parentData.name || 'Parent',
                            child.name,
                            request.name,
                            // request.image ? 'Image attached' : undefined 
                        );
                    }
                });
            } catch (notifyErr) {
                console.error("Failed to notify parent:", notifyErr);
            }

        } catch (err) {
            console.error('Error submitting custom reward request:', err);
            alert('Failed to send request. Please try again.');
        } finally {
            setSubmittingCustomReward(false);
        }
    };

    const handleClaimCustomReward = async (customReward: CustomRewardData) => {
        if (!child || (child.starBalances?.growth || 0) < customReward.starsRequired) return;

        setRedeemingReward(customReward.id);

        try {
            await updateDoc(doc(db, 'customRewardRequests', customReward.id), {
                status: 'pending_claim',
                claimRequestedAt: serverTimestamp(),
            });

            setSuccessMessage(`${customReward.rewardName} claim request sent! 🎉`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error('Error requesting custom reward claim:', err);
        } finally {
            setRedeemingReward(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="text-center">
                    <Spinner size="lg" />
                    <p className="mt-4 text-emerald-600 font-medium">Loading rewards...</p>
                </div>
            </div>
        );
    }

    if (!child) return null;

    return (
        <div className="space-y-5 pb-6">
            <CustomRewardRequestModal
                isOpen={showCustomRewardModal}
                onClose={() => setShowCustomRewardModal(false)}
                onSubmit={handleCustomRewardRequest}
                isLoading={submittingCustomReward}
            />

            {/* Header */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Gift size={22} className="text-pink-500" /> Rewards
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">Trade your stars for prizes!</p>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                        <Star className="text-amber-500" size={20} fill="currentColor" />
                        <span className="font-bold text-amber-700 text-lg">{child.starBalances?.growth || 0}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-4 text-sm">
                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg text-gray-600">
                        <span className="font-medium">{rewards.length}</span> rewards available
                    </div>
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700">
                        <span className="font-medium">{rewards.filter(r => canAfford(r)).length}</span> you can get
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 text-center max-w-sm mx-4 shadow-xl">
                        <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 rounded-full flex items-center justify-center text-3xl">
                            🎉
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {successMessage.includes('requested') ? 'Request Sent!' : 'Awesome!'}
                        </h3>
                        <p className="text-gray-500 text-sm">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Rewards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Request Custom Reward */}
                <button
                    onClick={() => setShowCustomRewardModal(true)}
                    className="bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:from-pink-200 hover:to-purple-200 transition-all min-h-[180px]"
                >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <Plus size={24} className="text-pink-500" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm">Request Custom Reward</h3>
                    <p className="text-xs text-gray-500 mt-1">Ask your parent!</p>
                </button>

                {rewards.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-3xl mb-2">🏪</div>
                        <p className="text-gray-500 text-sm">No rewards yet</p>
                    </div>
                ) : (
                    rewards.map((reward) => {
                        const affordable = canAfford(reward);

                        return (
                            <div
                                key={reward.id}
                                className={`bg-white border rounded-xl p-4 flex flex-col items-center text-center transition-all
                                    ${affordable
                                        ? 'border-gray-100 hover:border-emerald-200 hover:shadow-sm'
                                        : 'border-gray-100 opacity-60'}`}
                            >
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                    <Star size={10} fill="currentColor" /> {reward.starCost}
                                </div>

                                <div className="text-4xl mb-3">{reward.icon}</div>

                                <h3 className="font-semibold text-gray-800 text-sm leading-tight">{reward.name}</h3>
                                {reward.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{reward.description}</p>
                                )}

                                <button
                                    onClick={() => handleRedeem(reward)}
                                    disabled={!affordable || redeemingReward === reward.id}
                                    className={`w-full mt-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-all
                                        ${affordable
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    {redeemingReward === reward.id ? (
                                        <Spinner size="sm" />
                                    ) : affordable ? (
                                        <><Check size={14} /> Get It</>
                                    ) : (
                                        <><Lock size={12} /> {reward.starCost} ⭐</>
                                    )}
                                </button>
                            </div>
                        );
                    })
                )}

                {/* Custom Approved Rewards */}
                {customRewards.map((customReward) => {
                    const affordable = (child.starBalances?.growth || 0) >= customReward.starsRequired;

                    return (
                        <div
                            key={customReward.id}
                            className={`bg-white border rounded-xl p-4 flex flex-col items-center text-center transition-all relative
                                ${affordable ? 'border-purple-200' : 'border-gray-100 opacity-60'}`}
                        >
                            <div className="absolute top-2 left-2 bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                ✨ Custom
                            </div>
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                <Star size={10} fill="currentColor" /> {customReward.starsRequired}
                            </div>

                            {customReward.rewardImage ? (
                                <div className="w-full h-20 rounded-lg overflow-hidden mb-3 mt-4 relative">
                                    <Image src={customReward.rewardImage} alt={customReward.rewardName} fill className="object-cover" />
                                </div>
                            ) : (
                                <div className="text-4xl mb-3 mt-4">🎁</div>
                            )}

                            <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{customReward.rewardName}</h3>

                            <button
                                onClick={() => handleClaimCustomReward(customReward)}
                                disabled={!affordable || redeemingReward === customReward.id}
                                className={`w-full mt-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-all
                                    ${affordable
                                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                {redeemingReward === customReward.id ? (
                                    <Spinner size="sm" />
                                ) : affordable ? (
                                    <><Check size={14} /> Get It</>
                                ) : (
                                    <><Lock size={12} /> {customReward.starsRequired} ⭐</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Claimed Rewards */}
            {claimedRewards.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Gift size={18} className="text-pink-500" /> My Claimed Rewards
                    </h2>

                    <div className="space-y-2">
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
                                    className={`flex items-center gap-3 p-3 rounded-xl border ${redemption.status === 'fulfilled' ? 'bg-purple-50 border-purple-100' :
                                        redemption.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                                            redemption.status === 'rejected' ? 'bg-red-50 border-red-100' :
                                                'bg-amber-50 border-amber-100'
                                        }`}
                                >
                                    <div className="text-2xl">{redemption.rewardIcon}</div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-800 text-sm truncate">{redemption.rewardName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-0.5">
                                                <Star size={10} fill="currentColor" className="text-amber-500" /> {redemption.starsDeducted}
                                            </span>
                                            <span>•</span>
                                            <span>{dateStr}</span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${redemption.status === 'fulfilled' ? 'bg-purple-500 text-white' :
                                        redemption.status === 'approved' ? 'bg-emerald-500 text-white' :
                                            redemption.status === 'rejected' ? 'bg-red-500 text-white' :
                                                'bg-amber-500 text-white'
                                        }`}>
                                        {redemption.status === 'fulfilled' ? (
                                            <><Gift size={12} /> Given</>
                                        ) : redemption.status === 'approved' ? (
                                            <><CheckCircle size={12} /> Approved</>
                                        ) : redemption.status === 'rejected' ? (
                                            <><XCircle size={12} /> Rejected</>
                                        ) : (
                                            <><Clock size={12} /> Pending</>
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
