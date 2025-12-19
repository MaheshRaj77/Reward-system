'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pencil, Trash2 } from 'lucide-react';

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

export default function RewardsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rewards, setRewards] = useState<RewardData[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);

    useEffect(() => {
        const loadRewards = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                const q = query(
                    collection(db, 'rewards'),
                    where('familyId', '==', parent.id)
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
                            category: data.category,
                            starCost: data.starCost,
                            limitPerWeek: data.limitPerWeek,
                            requiresApproval: data.requiresApproval,
                            imageUrl: data.imageUrl,
                            imageBase64: data.imageBase64,
                        });
                    });
                    setRewards(rewardsData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                setLoading(false);
            }
        };

        loadRewards();
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">🎁 Reward Shop</h1>
                    </div>
                    <Link href="/rewards/create">
                        <Button size="sm">+ New Reward</Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {rewards.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">🎁</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Rewards Yet</h3>
                        <p className="text-gray-600 mb-6">Add rewards that your children can earn by completing tasks.</p>
                        <Link href="/rewards/create">
                            <Button>Add a Reward</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {rewards.map((reward) => {
                            const rewardImage = reward.imageBase64 || reward.imageUrl;
                            return (
                                <div key={reward.id} className="group bg-white rounded-3xl p-4 border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center gap-5">
                                        {/* Image/Icon */}
                                        {rewardImage ? (
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                                                <img
                                                    src={rewardImage}
                                                    alt={reward.name}
                                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                                                {reward.icon}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{reward.name}</h3>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                                                    <span className="text-sm">⭐</span>
                                                    <span className="font-bold text-sm">{reward.starCost}</span>
                                                </div>
                                                {reward.limitPerWeek && (
                                                    <div className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 text-xs font-medium">
                                                        {reward.limitPerWeek}/week
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - Always visible */}
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/rewards/${reward.id}/edit`}
                                                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-all"
                                            >
                                                <Pencil size={18} />
                                            </Link>
                                            <button
                                                onClick={() => setRewardToDelete(reward.id)}
                                                disabled={deleting === reward.id}
                                                className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-all"
                                            >
                                                {deleting === reward.id ? <Spinner size="sm" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
