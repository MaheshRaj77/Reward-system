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

    if (loading) return <div className="p-4 text-center"><Spinner size="sm" /></div>;
    if (items.length === 0) return null; // Don't show if nothing to approve

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Clock size={20} /> Pending Approvals
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{items.length}</span>
                </h3>
            </div>

            <div className="divide-y divide-gray-100">
                {items.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                            {/* Proof Image */}
                            {item.proofImageBase64 && (
                                <div className="flex-shrink-0">
                                    <Image
                                        src={item.proofImageBase64}
                                        alt="Proof"
                                        width={80}
                                        height={60}
                                        className="w-20 h-15 object-cover rounded-lg border-2 border-purple-200"
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.type === 'task' ? (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Task</span>
                                    ) : (
                                        <span className="bg-pink-100 text-pink-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Reward</span>
                                    )}
                                    {item.proofImageBase64 && (
                                        <span className="bg-purple-100 text-purple-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                            <ImageIcon size={10} /> Photo Proof
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500 font-medium">For {item.childName}</span>
                                </div>
                                <h4 className="font-bold text-gray-900">{item.title}</h4>
                                <p className="text-sm text-gray-500">
                                    {item.type === 'task' ? 'Earns' : 'Costs'} {item.costOrValue} Stars
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleReject(item)}
                                    disabled={!!processingId}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                >
                                    <X size={16} />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleApprove(item)}
                                    disabled={!!processingId}
                                    isLoading={processingId === item.id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check size={16} className="mr-1" /> Approve
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
