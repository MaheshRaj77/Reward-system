'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner, Button } from '@/components/ui';
import { Check, X, Clock, ImageIcon } from 'lucide-react';

interface ApprovalItem {
    id: string;
    type: 'task' | 'reward';
    title: string;
    subtitle: string;
    childId: string;
    childName?: string;
    costOrValue: number;
    starType: 'growth';
    timestamp: Date;
    proofImageBase64?: string;
    data: any;
}

interface ApprovalsWidgetProps {
    familyId: string;
    onActionComplete?: () => void;
}

export function ApprovalsWidget({ familyId, onActionComplete }: ApprovalsWidgetProps) {
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadApprovals = async () => {
        if (!familyId) return;
        setLoading(true);

        try {
            const tasksQuery = query(
                collection(db, 'taskCompletions'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending')
            );

            const rewardsQuery = query(
                collection(db, 'rewardRedemptions'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending')
            );

            const [tasksSnap, rewardsSnap] = await Promise.all([
                getDocs(tasksQuery),
                getDocs(rewardsQuery)
            ]);

            const childNames: Record<string, string> = {};
            const newItems: ApprovalItem[] = [];

            for (const d of tasksSnap.docs) {
                const data = d.data();
                let cName = 'Child';
                if (!childNames[data.childId]) {
                    const cDoc = await getDoc(doc(db, 'children', data.childId));
                    if (cDoc.exists()) {
                        childNames[data.childId] = cDoc.data().name;
                        cName = cDoc.data().name;
                    }
                } else {
                    cName = childNames[data.childId];
                }

                const tDoc = await getDoc(doc(db, 'tasks', data.taskId));
                const tTitle = tDoc.exists() ? tDoc.data().title : 'Unknown Task';

                newItems.push({
                    id: d.id,
                    type: 'task',
                    title: tTitle,
                    subtitle: `${cName} completed this task`,
                    childId: data.childId,
                    childName: cName,
                    costOrValue: data.starsAwarded,
                    starType: data.starType,
                    timestamp: data.completedAt ? new Date(data.completedAt.seconds * 1000) : new Date(),
                    proofImageBase64: data.proofImageBase64 || null,
                    data: data
                });
            }

            for (const d of rewardsSnap.docs) {
                const data = d.data();
                let cName = 'Child';
                if (!childNames[data.childId]) {
                    const cDoc = await getDoc(doc(db, 'children', data.childId));
                    if (cDoc.exists()) {
                        childNames[data.childId] = cDoc.data().name;
                        cName = cDoc.data().name;
                    }
                } else {
                    cName = childNames[data.childId];
                }

                const rDoc = await getDoc(doc(db, 'rewards', data.rewardId));
                const rName = rDoc.exists() ? rDoc.data().name : 'Unknown Reward';

                newItems.push({
                    id: d.id,
                    type: 'reward',
                    title: rName,
                    subtitle: `${cName} wants to redeem this`,
                    childId: data.childId,
                    childName: cName,
                    costOrValue: data.starsDeducted,
                    starType: data.starType,
                    timestamp: data.requestedAt ? new Date(data.requestedAt.seconds * 1000) : new Date(),
                    data: data
                });
            }

            setItems(newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
    }, [familyId]);

    const handleApprove = async (item: ApprovalItem) => {
        setProcessingId(item.id);
        try {
            if (item.type === 'task') {
                await updateDoc(doc(db, 'taskCompletions', item.id), {
                    status: 'approved',
                    approvedAt: serverTimestamp()
                });

                const childRef = doc(db, 'children', item.childId);
                const childDoc = await getDoc(childRef);
                if (childDoc.exists()) {
                    const current = childDoc.data();
                    const newBalance = (current.starBalances?.[item.starType] || 0) + item.costOrValue;

                    // Calculate streak update
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    let newCurrentStreak = current.streaks?.currentStreak || 0;
                    let newLongestStreak = current.streaks?.longestStreak || 0;

                    const lastCompletionDate = current.streaks?.lastCompletionDate;
                    if (lastCompletionDate) {
                        const lastDate = new Date(lastCompletionDate.seconds * 1000);
                        lastDate.setHours(0, 0, 0, 0);

                        const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

                        if (daysDiff === 0) {
                            // Same day - no streak change
                        } else if (daysDiff === 1) {
                            // Consecutive day - increment streak
                            newCurrentStreak = newCurrentStreak + 1;
                            newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
                        } else {
                            // Gap in days - reset current streak
                            newCurrentStreak = 1;
                        }
                    } else {
                        // First completion ever
                        newCurrentStreak = 1;
                        newLongestStreak = Math.max(newLongestStreak, 1);
                    }

                    await updateDoc(childRef, {
                        [`starBalances.${item.starType}`]: newBalance,
                        'streaks.currentStreak': newCurrentStreak,
                        'streaks.longestStreak': newLongestStreak,
                        'streaks.lastCompletionDate': serverTimestamp()
                    });
                }
            } else {
                await updateDoc(doc(db, 'rewardRedemptions', item.id), {
                    status: 'approved',
                    approvedAt: serverTimestamp()
                });
            }

            await loadApprovals();
            onActionComplete?.();
        } catch (error) {
            console.error("Error approving:", error);
            alert("Failed to approve. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item: ApprovalItem) => {
        setProcessingId(item.id);
        try {
            const collectionName = item.type === 'task' ? 'taskCompletions' : 'rewardRedemptions';

            if (item.type === 'reward') {
                const childRef = doc(db, 'children', item.childId);
                const childDoc = await getDoc(childRef);
                if (childDoc.exists()) {
                    const current = childDoc.data();
                    const currentGrowth = current.starBalances?.growth || 0;
                    await updateDoc(childRef, {
                        'starBalances.growth': currentGrowth + item.costOrValue
                    });
                }
            }

            await updateDoc(doc(db, collectionName, item.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
            await loadApprovals();
            onActionComplete?.();
        } catch (error) {
            console.error("Error rejecting:", error);
            alert("Failed to reject. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-2 right-4 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                    <div className="absolute bottom-0 left-8 w-12 h-12 bg-white/20 rounded-full blur-lg" />
                </div>
                <div className="relative z-10 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Clock size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Pending Approvals</h3>
                            <p className="text-white/70 text-xs">Review your children&apos;s activities</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {items.length > 0 && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        )}
                        <span className="bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-white font-bold text-sm">
                            {items.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center">
                        <Spinner size="sm" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">✨</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">All caught up!</h4>
                        <p className="text-sm text-gray-500 max-w-[220px] mx-auto">
                            When your children complete tasks or request rewards, they&apos;ll appear here.
                        </p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${item.type === 'task'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-pink-100 text-pink-700'
                                        }`}>
                                        {item.type === 'task' ? '✓ Task' : '🎁 Reward'}
                                    </span>
                                    {item.proofImageBase64 && (
                                        <span className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                            <ImageIcon size={10} /> Photo
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">{getTimeAgo(item.timestamp)}</span>
                            </div>

                            <div className="flex items-start gap-3">
                                {item.proofImageBase64 && (
                                    <div className="flex-shrink-0 relative w-12 h-12 rounded-lg overflow-hidden border border-purple-200">
                                        <Image src={item.proofImageBase64} alt="Proof" fill className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{item.title}</h4>
                                    <p className="text-xs text-gray-500">by {item.childName}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${item.type === 'task' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    ⭐ {item.type === 'task' ? '+' : '-'}{item.costOrValue}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => handleReject(item)}
                                    disabled={!!processingId}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    <X size={14} /> Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(item)}
                                    disabled={!!processingId}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {processingId === item.id ? <Spinner size="sm" /> : <><Check size={14} /> Approve</>}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <a
                    href="/approvals"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1"
                >
                    View all approvals →
                </a>
            </div>
        </div>
    );
}
