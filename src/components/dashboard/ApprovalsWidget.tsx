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
    onActionComplete: () => void; // Callback to refresh other widgets
}

export function ApprovalsWidget({ familyId, onActionComplete }: ApprovalsWidgetProps) {
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadApprovals = async () => {
        if (!familyId) return;
        setLoading(true);

        try {
            // Fetch Pending Tasks
            const tasksQuery = query(
                collection(db, 'taskCompletions'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending')
            );

            // Fetch Pending Rewards
            const rewardsQuery = query(
                collection(db, 'rewardRedemptions'),
                where('familyId', '==', familyId),
                where('status', '==', 'pending')
            );

            const [tasksSnap, rewardsSnap] = await Promise.all([
                getDocs(tasksQuery),
                getDocs(rewardsQuery)
            ]);

            // Need child names ideally. For now we rely on the ID or fetch children.
            // Optimization: Pass children map or fetch once. 
            // Simple fetch for names:
            const childNames: Record<string, string> = {};
            // (We could fetch all children in family here, but for now we'll do simplistic mapping if possible or just show "Child")

            const newItems: ApprovalItem[] = [];

            // Process Tasks
            // We need to fetch the original task title if not stored on completion. 
            // Ideally completion stores title. If not, we fetch task.
            // Checking 'ChildTasks' code -> completion doc has taskId. Doesn't store title. 
            // We need to fetch task details or store them.
            // For this implementation, I'll fetch task details individually or optimize.

            const taskIds = tasksSnap.docs.map(d => d.data().taskId);
            // In a real app index this. For now let's just get the completion docs and fetch tasks if needed.
            // Assumption: Let's trust that we can get the necessary info.

            for (const d of tasksSnap.docs) {
                const data = d.data();
                // Fetch Child Name (Optimization: Cache this)
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

                // Fetch Task Title
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

            // Process Rewards
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

                // Reward Redemptions might store name? Not explicitly in my previous code.. wait,
                // Checking ChildRewards... await addDoc(..., { rewardId... })
                // It does NOT store name. Need to fetch Reward Name.

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
                // Update completion status
                await updateDoc(doc(db, 'taskCompletions', item.id), {
                    status: 'approved',
                    approvedAt: serverTimestamp()
                });

                // Add Stars to Child
                const childRef = doc(db, 'children', item.childId);
                const childDoc = await getDoc(childRef);
                if (childDoc.exists()) {
                    const current = childDoc.data();
                    const newBalance = (current.starBalances?.[item.starType] || 0) + item.costOrValue;

                    await updateDoc(childRef, {
                        [`starBalances.${item.starType}`]: newBalance,
                        'streaks.lastCompletionDate': serverTimestamp()
                    });
                }

            } else {
                // Reward Approval
                await updateDoc(doc(db, 'rewardRedemptions', item.id), {
                    status: 'approved',
                    approvedAt: serverTimestamp()
                });

                // Deduct Stars from Child
                const childRef = doc(db, 'children', item.childId);
                const childDoc = await getDoc(childRef);
                if (childDoc.exists()) {
                    const current = childDoc.data();

                    // Logic from ChildRewards (simplified here, but should match "Deduct fun/growth")
                    // Deduct from growth stars only
                    const newGrowth = (current.starBalances?.growth || 0) - item.costOrValue;

                    await updateDoc(childRef, {
                        'starBalances.growth': Math.max(0, newGrowth)
                    });
                }
            }

            // Refresh
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
            await updateDoc(doc(db, collectionName, item.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
            await loadApprovals();
            onActionComplete?.();
        } catch (error) {
            console.error("Error rejecting:", error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center"><Spinner size="sm" /></div>;
    if (items.length === 0) return null; // Don't show if nothing to approve

    // Helper to format time ago
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
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        <span className="bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-white font-bold text-sm">
                            {items.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all group"
                    >
                        {/* Type Badge & Time */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {item.type === 'task' ? (
                                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                        ✓ Task
                                    </span>
                                ) : (
                                    <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                        🎁 Reward
                                    </span>
                                )}
                                {item.proofImageBase64 && (
                                    <span className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                        <ImageIcon size={10} /> Photo
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={10} />
                                {getTimeAgo(item.timestamp)}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex items-start gap-3">
                            {/* Proof Image Thumbnail */}
                            {item.proofImageBase64 && (
                                <div
                                    className="flex-shrink-0 relative group/img cursor-pointer"
                                    onClick={() => window.open(item.proofImageBase64, '_blank')}
                                >
                                    <Image
                                        src={item.proofImageBase64}
                                        alt="Proof"
                                        width={64}
                                        height={64}
                                        className="w-16 h-16 object-cover rounded-xl border-2 border-purple-200 group-hover/img:border-purple-400 transition-colors"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
                                        <ImageIcon size={16} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">
                                        {item.childName}
                                    </span>
                                    <span className="text-xs text-gray-300">•</span>
                                    <span className="text-xs text-gray-400">
                                        {item.type === 'task' ? 'completed' : 'wants'}
                                    </span>
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{item.title}</h4>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${item.type === 'task'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        ⭐ {item.type === 'task' ? '+' : '-'}{item.costOrValue}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4">
                            <button
                                onClick={() => handleReject(item)}
                                disabled={!!processingId}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                <X size={14} />
                                Reject
                            </button>
                            <button
                                onClick={() => handleApprove(item)}
                                disabled={!!processingId}
                                className={`flex-[2] py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all disabled:opacity-50 ${item.type === 'task'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-green-200 hover:shadow-xl'
                                        : 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-pink-200 hover:shadow-xl'
                                    }`}
                            >
                                {processingId === item.id ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <>
                                        <Check size={14} />
                                        Approve
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Link */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <a
                    href="/approvals"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 hover:gap-2 transition-all"
                >
                    View all approvals
                    <span>→</span>
                </a>
            </div>
        </div>
    );
}
