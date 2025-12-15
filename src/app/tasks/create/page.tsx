'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, query, where, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { canAddTask, canUseRecurringTasks, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    taskCount: number;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function CreateTaskPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const [children, setChildren] = useState<ChildData[]>([]);

    // Subscription state
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const [canUseRecurring, setCanUseRecurring] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'chores' as keyof typeof TASK_CATEGORIES,
        starValue: 5,
        assignedTo: [] as string[],
        taskType: 'one-time',
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.familyId);

                // Load subscription
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    const plan = parentData.subscription?.plan || 'free';
                    setSubscription(plan);
                    setCanUseRecurring(canUseRecurringTasks(plan));
                }

                // Load children with task counts
                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.familyId)
                );
                const childSnapshot = await getDocs(childrenQuery);

                const childrenData: ChildData[] = [];
                for (const childDoc of childSnapshot.docs) {
                    const data = childDoc.data();

                    // Count tasks for this child
                    const tasksQuery = query(
                        collection(db, 'tasks'),
                        where('familyId', '==', parent.familyId),
                        where('assignedChildIds', 'array-contains', childDoc.id),
                        where('isActive', '==', true)
                    );
                    const tasksSnapshot = await getDocs(tasksQuery);

                    childrenData.push({
                        id: childDoc.id,
                        name: data.name,
                        avatar: data.avatar,
                        taskCount: tasksSnapshot.size,
                    });
                }

                setChildren(childrenData);
                setFormData(prev => ({ ...prev, assignedTo: childrenData.map(c => c.id) }));
                setLoading(false);
            } catch (err) {
                router.push('/auth/login');
            }
        };

        loadData();
    }, [router]);

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            setError('Please enter a task title');
            return;
        }
        if (formData.assignedTo.length === 0) {
            setError('Please assign to at least one child');
            return;
        }

        // Check task limits for each assigned child
        const maxTasks = SUBSCRIPTION_PLANS[subscription].features.maxTasksPerChild;
        const overLimitChildren = children
            .filter(c => formData.assignedTo.includes(c.id) && c.taskCount >= maxTasks);

        if (overLimitChildren.length > 0 && subscription === 'free') {
            setError(`${overLimitChildren.map(c => c.name).join(', ')} already has ${maxTasks} tasks. Upgrade to Premium for unlimited tasks!`);
            return;
        }

        // Check recurring task permission
        if ((formData.taskType === 'daily' || formData.taskType === 'weekly') && !canUseRecurring) {
            setError('Recurring tasks require Premium. Upgrade to unlock!');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'tasks'), {
                familyId,
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                starValue: formData.starValue,
                assignedChildIds: formData.assignedTo,
                taskType: formData.taskType,
                proofRequired: 'none',
                isActive: true,
                createdAt: serverTimestamp(),
            });

            router.push('/tasks');
        } catch (err) {
            setError('Failed to create task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const categoryEntries = Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]][];
    const maxTasks = SUBSCRIPTION_PLANS[subscription].features.maxTasksPerChild;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/tasks" className="text-gray-600 hover:text-gray-800 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">📝 New Task</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8">
                <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-6 space-y-6 shadow-sm">
                    {/* Title */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">Task Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="e.g., Make your bed"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">Description (optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
                            placeholder="Add more details..."
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-3">Category</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {categoryEntries.map(([key, cat]) => (
                                <button
                                    key={key}
                                    onClick={() => setFormData({ ...formData, category: key })}
                                    className={`p-3 rounded-xl text-center transition-all ${formData.category === key
                                        ? 'ring-2 ring-indigo-500 bg-indigo-50'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="text-xl mb-1">{cat.icon}</div>
                                    <div className="text-xs text-gray-700">{cat.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Star Value */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">
                            ⭐ Star Value: {formData.starValue}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={formData.starValue}
                            onChange={e => setFormData({ ...formData, starValue: parseInt(e.target.value) })}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>1 (Quick)</span>
                            <span>10</span>
                            <span>20 (Hard)</span>
                        </div>
                    </div>

                    {/* Task Type / Frequency */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-3">
                            Frequency
                            {!canUseRecurring && (
                                <span className="ml-2 text-xs text-amber-600 font-normal">
                                    (Daily/Weekly require Premium)
                                </span>
                            )}
                        </label>
                        <div className="flex gap-2">
                            {['one-time', 'daily', 'weekly'].map(type => {
                                const isRecurring = type === 'daily' || type === 'weekly';
                                const isDisabled = isRecurring && !canUseRecurring;

                                return (
                                    <button
                                        key={type}
                                        onClick={() => !isDisabled && setFormData({ ...formData, taskType: type })}
                                        disabled={isDisabled}
                                        className={`flex-1 px-4 py-2 rounded-xl text-sm capitalize transition-all relative ${isDisabled
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : formData.taskType === type
                                                    ? 'bg-indigo-100 ring-2 ring-indigo-500 text-indigo-800'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {type.replace('-', ' ')}
                                        {isDisabled && (
                                            <span className="absolute -top-1 -right-1 text-xs">👑</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {!canUseRecurring && (
                            <button
                                onClick={() => router.push('/subscriptions')}
                                className="mt-2 text-sm text-amber-600 hover:text-amber-700 underline"
                            >
                                Upgrade to unlock recurring tasks →
                            </button>
                        )}
                    </div>

                    {/* Assign To */}
                    {children.length > 0 && (
                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-3">Assign To</label>
                            <div className="flex flex-wrap gap-2">
                                {children.map(child => {
                                    const isAtLimit = child.taskCount >= maxTasks && subscription === 'free';

                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => setFormData({
                                                ...formData,
                                                assignedTo: formData.assignedTo.includes(child.id)
                                                    ? formData.assignedTo.filter(id => id !== child.id)
                                                    : [...formData.assignedTo, child.id]
                                            })}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${formData.assignedTo.includes(child.id)
                                                    ? isAtLimit
                                                        ? 'bg-red-100 ring-2 ring-red-400'
                                                        : 'bg-indigo-100 ring-2 ring-indigo-500'
                                                    : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span>{AVATAR_EMOJIS[child.avatar.presetId]}</span>
                                            <span className="text-gray-800 text-sm">{child.name}</span>
                                            {subscription === 'free' && (
                                                <span className={`text-xs ${isAtLimit ? 'text-red-600' : 'text-gray-500'}`}>
                                                    ({child.taskCount}/{maxTasks})
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                            {error}
                            {error.includes('Upgrade') && (
                                <button
                                    onClick={() => router.push('/subscriptions')}
                                    className="ml-2 underline font-medium"
                                >
                                    Upgrade Now
                                </button>
                            )}
                        </div>
                    )}

                    <Button onClick={handleSubmit} isLoading={submitting} className="w-full" size="lg">
                        Create Task
                    </Button>
                </div>
            </main>
        </div>
    );
}
