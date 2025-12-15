'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, Button, Badge, Spinner } from '@/components/ui';

interface ChildData {
    id: string;
    name: string;
    familyId: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; fun: number };
    ageGroup: string;
}

interface RewardData {
    id: string;
    name: string;
    description?: string;
    icon: string;
    starType: 'growth' | 'fun' | 'any';
    starCost: number;
    requiresApproval: boolean;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function ChildRewards() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [rewards, setRewards] = useState<RewardData[]>([]);
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
                    name: childData.name,
                    familyId: childData.familyId,
                    avatar: childData.avatar,
                    starBalances: childData.starBalances,
                    ageGroup: childData.ageGroup,
                });

                // Load rewards
                const q = query(
                    collection(db, 'rewards'),
                    where('familyId', '==', childData.familyId),
                    where('isActive', '==', true)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
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

                return () => unsubscribe();
            } catch (err) {
                console.error('Error:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [childId, router]);

    const canAfford = (reward: RewardData) => {
        if (!child) return false;
        if (reward.starType === 'any') {
            return (child.starBalances.growth + child.starBalances.fun) >= reward.starCost;
        } else if (reward.starType === 'growth') {
            return child.starBalances.growth >= reward.starCost;
        } else {
            return child.starBalances.fun >= reward.starCost;
        }
    };

    const handleRedeem = async (reward: RewardData) => {
        if (!child || !canAfford(reward)) return;

        setRedeemingReward(reward.id);

        try {
            // Create redemption request
            await addDoc(collection(db, 'rewardRedemptions'), {
                rewardId: reward.id,
                childId: child.id,
                familyId: child.familyId,
                status: reward.requiresApproval ? 'pending' : 'approved',
                starsDeducted: reward.starCost,
                starType: reward.starType,
                requestedAt: serverTimestamp(),
            });

            // Deduct stars from child
            let newGrowth = child.starBalances.growth;
            let newFun = child.starBalances.fun;

            if (reward.starType === 'growth') {
                newGrowth -= reward.starCost;
            } else if (reward.starType === 'fun') {
                newFun -= reward.starCost;
            } else {
                // Any - prefer fun stars first
                if (child.starBalances.fun >= reward.starCost) {
                    newFun -= reward.starCost;
                } else {
                    newFun = 0;
                    newGrowth -= (reward.starCost - child.starBalances.fun);
                }
            }

            await updateDoc(doc(db, 'children', child.id), {
                'starBalances.growth': newGrowth,
                'starBalances.fun': newFun,
            });

            // Update local state
            setChild({
                ...child,
                starBalances: { growth: newGrowth, fun: newFun }
            });

            // Show success
            setSuccessMessage(reward.requiresApproval
                ? `${reward.name} requested! Ask your parent to approve it.`
                : `${reward.name} is yours! Enjoy!`
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
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!child) return null;

    const isSimpleMode = child.ageGroup === '4-6';

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
            {/* Success overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 animate-bounce">
                        <div className="text-6xl mb-4">🎁</div>
                        <div className="text-xl font-bold text-gray-900">{successMessage}</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/10 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href={`/child/${childId}/home`} className="flex items-center gap-2 text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-bold text-white">🎁 Rewards</h1>
                    <div className="w-10" />
                </div>
            </header>

            {/* Star Balance */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center">
                        <div className="text-3xl mb-1">⭐</div>
                        <div className="text-2xl font-bold">{child.starBalances.growth}</div>
                        {!isSimpleMode && <div className="text-xs opacity-80">Growth</div>}
                    </div>
                    <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl p-4 text-white text-center">
                        <div className="text-3xl mb-1">🎉</div>
                        <div className="text-2xl font-bold">{child.starBalances.fun}</div>
                        {!isSimpleMode && <div className="text-xs opacity-80">Fun</div>}
                    </div>
                </div>
            </div>

            {/* Rewards */}
            <div className="max-w-2xl mx-auto px-4 pb-8">
                {rewards.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-5xl mb-4">🎁</div>
                        <h3 className="font-semibold text-gray-900">No Rewards Yet</h3>
                        <p className="text-gray-500">Ask your parent to add some rewards!</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {rewards.map((reward) => {
                            const affordable = canAfford(reward);

                            if (isSimpleMode) {
                                return (
                                    <Card
                                        key={reward.id}
                                        className={`text-center ${!affordable ? 'opacity-60' : ''}`}
                                        padding="lg"
                                    >
                                        <div className="text-5xl mb-3">{reward.icon}</div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{reward.name}</h3>
                                        <div className="mb-4">
                                            <Badge variant={reward.starType === 'growth' ? 'success' : reward.starType === 'fun' ? 'info' : 'default'} size="md">
                                                {reward.starType === 'growth' ? '⭐' : reward.starType === 'fun' ? '🎉' : '💫'} {reward.starCost}
                                            </Badge>
                                        </div>
                                        <Button
                                            onClick={() => handleRedeem(reward)}
                                            disabled={!affordable}
                                            isLoading={redeemingReward === reward.id}
                                            className="w-full"
                                            size="lg"
                                        >
                                            {affordable ? 'I Want This!' : '🔒 Need More Stars'}
                                        </Button>
                                    </Card>
                                );
                            }

                            return (
                                <Card key={reward.id} className={!affordable ? 'opacity-60' : ''}>
                                    <div className="flex items-start gap-4">
                                        <div className="text-4xl">{reward.icon}</div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                                            {reward.description && (
                                                <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge
                                                    variant={reward.starType === 'growth' ? 'success' : reward.starType === 'fun' ? 'info' : 'default'}
                                                >
                                                    {reward.starType === 'growth' ? '⭐' : reward.starType === 'fun' ? '🎉' : '💫'} {reward.starCost}
                                                </Badge>
                                                {reward.requiresApproval && (
                                                    <Badge variant="warning">Needs approval</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleRedeem(reward)}
                                            disabled={!affordable}
                                            isLoading={redeemingReward === reward.id}
                                            variant={affordable ? 'primary' : 'ghost'}
                                        >
                                            {affordable ? 'Redeem' : 'Locked'}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
