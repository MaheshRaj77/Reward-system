// ============================================
// TASKS HOOK
// Hook for managing tasks and completions
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task, TaskCompletion, TaskType, TaskCategory, ProofType, StarType, Child } from '@/types';
import { useAuth } from './use-auth';
import { RewardEconomy } from '@/lib/engines/reward-economy';
import { MotivationEngine } from '@/lib/engines/motivation';

interface UseTasksReturn {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    createTask: (data: CreateTaskData) => Promise<{ success: boolean; task?: Task; error?: string }>;
    updateTask: (taskId: string, data: Partial<Task>) => Promise<{ success: boolean; error?: string }>;
    deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    getTasksForChild: (childId: string) => Task[];
}

interface CreateTaskData {
    title: string;
    description?: string;
    assignedChildId: string | 'all';
    taskType: TaskType;
    category: TaskCategory;
    starValue: number;
    proofRequired?: ProofType;
    starType?: StarType;
    alwaysManual?: boolean;
    isAutoApproved?: boolean;
    isChatEnabled?: boolean;
}

export function useTasks(): UseTasksReturn {
    const { family, parent } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to tasks collection
    useEffect(() => {
        if (!family?.id) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'tasks'),
            where('familyId', '==', family.id),
            where('status', '==', 'active')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const tasksData: Task[] = [];
                snapshot.forEach((doc) => {
                    tasksData.push(doc.data() as Task);
                });
                setTasks(tasksData);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [family?.id]);

    const createTask = useCallback(async (data: CreateTaskData) => {
        if (!family || !parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const task: Omit<Task, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } = {
                id: taskId,
                familyId: family.id,
                title: data.title,
                description: data.description,
                assignedChildId: data.assignedChildId,
                taskType: data.taskType,
                category: data.category,

                starValue: data.starValue,
                starType: data.starType || 'growth',
                proofRequired: data.proofRequired || 'none',
                approvalRule: {
                    randomCheckPercent: 15,
                    alwaysManual: data.alwaysManual || false,
                },
                isAutoApproved: data.isAutoApproved || false,
                isChatEnabled: data.isChatEnabled || false,
                status: 'active',
                createdBy: parent.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, 'tasks', taskId), task);

            return { success: true, task: task as unknown as Task };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create task';
            return { success: false, error: message };
        }
    }, [family, parent]);

    const updateTask = useCallback(async (taskId: string, data: Partial<Task>) => {
        try {
            await updateDoc(doc(db, 'tasks', taskId), {
                ...data,
                updatedAt: serverTimestamp(),
            });
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update task';
            return { success: false, error: message };
        }
    }, []);

    const deleteTask = useCallback(async (taskId: string) => {
        try {
            // Soft delete by setting status to archived
            await updateDoc(doc(db, 'tasks', taskId), {
                status: 'archived',
                updatedAt: serverTimestamp(),
            });
            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete task';
            return { success: false, error: message };
        }
    }, []);

    const getTasksForChild = useCallback((childId: string) => {
        return tasks.filter(
            (t) => t.assignedChildId === childId || t.assignedChildId === 'all'
        );
    }, [tasks]);

    return {
        tasks,
        loading,
        error,
        createTask,
        updateTask,
        deleteTask,
        getTasksForChild,
    };
}

// ============================================
// TASK COMPLETIONS HOOK
// ============================================

interface UseTaskCompletionsReturn {
    completions: TaskCompletion[];
    pendingApprovals: TaskCompletion[];
    loading: boolean;
    error: string | null;
    completeTask: (task: Task, child: Child, proof?: TaskCompletion['proof']) => Promise<{
        success: boolean;
        completion?: TaskCompletion;
        autoApproved: boolean;
        starsAwarded: number;
        error?: string;
    }>;
    approveCompletion: (completionId: string) => Promise<{ success: boolean; error?: string }>;
    rejectCompletion: (completionId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export function useTaskCompletions(childId?: string): UseTaskCompletionsReturn {
    const { family, parent } = useAuth();
    const [completions, setCompletions] = useState<TaskCompletion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to completions
    useEffect(() => {
        if (!family?.id) {
            setCompletions([]);
            setLoading(false);
            return;
        }

        let q;
        if (childId) {
            // Child-specific completions
            q = query(
                collection(db, 'taskCompletions'),
                where('childId', '==', childId),
                orderBy('completedAt', 'desc'),
                limit(50)
            );
        } else {
            // All family completions (for parent)
            q = query(
                collection(db, 'taskCompletions'),
                where('familyId', '==', family.id),
                orderBy('completedAt', 'desc'),
                limit(100)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: TaskCompletion[] = [];
                snapshot.forEach((doc) => {
                    data.push(doc.data() as TaskCompletion);
                });
                setCompletions(data);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [family?.id, childId]);

    const pendingApprovals = completions.filter((c) => c.status === 'pending');

    const completeTask = useCallback(async (task: Task, child: Child, proof?: TaskCompletion['proof']) => {
        if (!family) {
            return { success: false, autoApproved: false, starsAwarded: 0, error: 'No family found' };
        }

        try {
            // Check if auto-approval is enabled on the task
            const requiresApproval = !task.isAutoApproved;

            // Calculate streak
            const newStreak = MotivationEngine.updateStreak(child.streaks, new Date());

            // Calculate stars
            const starResult = RewardEconomy.calculateTaskStars(
                task,
                child,
                newStreak.currentStreak,
                family.settings?.starSettings
            );

            const completionId = `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const status = requiresApproval ? 'pending' : 'auto-approved';
            const starsAwarded = requiresApproval ? 0 : starResult.finalStars;

            const completion: Omit<TaskCompletion, 'completedAt'> & { completedAt: unknown } = {
                id: completionId,
                taskId: task.id,
                childId: child.id,
                familyId: family.id,
                completedAt: serverTimestamp(),
                proof,
                status,
                starsAwarded,
                trustDelta: 0, // Will be set on approval
                streakCount: newStreak.currentStreak,
                bonusApplied: starResult.streakBonus,
            };

            await setDoc(doc(db, 'taskCompletions', completionId), completion);

            // If auto-approved, credit stars and update streak immediately
            if (!requiresApproval) {
                const newBalances = RewardEconomy.creditStars(
                    child.starBalances,
                    starResult.finalStars
                );

                await updateDoc(doc(db, 'children', child.id), {
                    starBalances: newBalances,
                    streaks: newStreak,
                    lastActive: serverTimestamp(),
                });
            }

            return {
                success: true,
                completion: completion as unknown as TaskCompletion,
                autoApproved: !requiresApproval,
                starsAwarded,
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to complete task';
            return { success: false, autoApproved: false, starsAwarded: 0, error: message };
        }
    }, [family]);

    const approveCompletion = useCallback(async (completionId: string) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Get the completion
            const completionDoc = await getDocs(
                query(collection(db, 'taskCompletions'), where('id', '==', completionId))
            );

            if (completionDoc.empty) {
                return { success: false, error: 'Completion not found' };
            }

            const completion = completionDoc.docs[0].data() as TaskCompletion;

            // Get the task and child
            const taskDoc = await getDocs(
                query(collection(db, 'tasks'), where('id', '==', completion.taskId))
            );
            const childDoc = await getDocs(
                query(collection(db, 'children'), where('id', '==', completion.childId))
            );

            if (taskDoc.empty || childDoc.empty) {
                return { success: false, error: 'Task or child not found' };
            }

            const task = taskDoc.docs[0].data() as Task;
            const child = childDoc.docs[0].data() as Child;

            // Calculate stars now
            // Calculate stars
            const starResult = RewardEconomy.calculateTaskStars(
                task,
                child,
                completion.streakCount
            );

            // Credit stars
            const newBalances = RewardEconomy.creditStars(
                child.starBalances,
                starResult.finalStars
            );

            // Update completion
            await updateDoc(doc(db, 'taskCompletions', completionId), {
                status: 'approved',
                starsAwarded: starResult.finalStars,
                approvedBy: parent.id,
                approvedAt: serverTimestamp(),
            });

            // Update child
            await updateDoc(doc(db, 'children', child.id), {
                starBalances: newBalances,
                lastActive: serverTimestamp(),
            });

            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to approve';
            return { success: false, error: message };
        }
    }, [parent]);

    const rejectCompletion = useCallback(async (completionId: string, reason: string) => {
        if (!parent) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Get completion and child
            const completionDoc = await getDocs(
                query(collection(db, 'taskCompletions'), where('id', '==', completionId))
            );

            if (completionDoc.empty) {
                return { success: false, error: 'Completion not found' };
            }

            const completion = completionDoc.docs[0].data() as TaskCompletion;

            const childDoc = await getDocs(
                query(collection(db, 'children'), where('id', '==', completion.childId))
            );

            if (childDoc.empty) {
                return { success: false, error: 'Child not found' };
            }

            const child = childDoc.docs[0].data() as Child;

            // Update completion
            await updateDoc(doc(db, 'taskCompletions', completionId), {
                status: 'rejected',
                rejectionReason: reason,
                approvedBy: parent.id,
                approvedAt: serverTimestamp(),
            });

            return { success: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to reject';
            return { success: false, error: message };
        }
    }, [parent]);

    return {
        completions,
        pendingApprovals,
        loading,
        error,
        completeTask,
        approveCompletion,
        rejectCompletion,
    };
}
