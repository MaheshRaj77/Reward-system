'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { SubscriptionBanner, SubscriptionStatus } from '@/components/parent';
import { canAddChild, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { rewards: number };
    streaks: { currentStreak: number };
    ageGroup: string;
    trustLevel: number;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const AVATARS = [
    { id: 'lion', emoji: '🦁', color: '#FFA500' },
    { id: 'panda', emoji: '🐼', color: '#2D3748' },
    { id: 'owl', emoji: '🦉', color: '#805AD5' },
    { id: 'fox', emoji: '🦊', color: '#ED8936' },
    { id: 'unicorn', emoji: '🦄', color: '#D53F8C' },
    { id: 'robot', emoji: '🤖', color: '#4299E1' },
    { id: 'astronaut', emoji: '👨‍🚀', color: '#38B2AC' },
    { id: 'hero', emoji: '🦸', color: '#E53E3E' },
];

const REWARD_ICONS = ['🎮', '🍦', '🎬', '📱', '🎁', '🍕', '🎈', '🎯', '🏆', '💰'];

const AGE_GROUP_LABELS: Record<string, string> = {
    '4-6': 'Little Explorer',
    '7-10': 'Rising Star',
    '11-14': 'Teen Achiever',
    '15+': 'Young Adult',
};

const TRUST_COLORS: Record<number, string> = {
    1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#3B82F6',
};

type ModalType = 'child' | 'task' | 'reward' | 'childDetails' | null;

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ name: string; familyId: string } | null>(null);
    const [children, setChildren] = useState<ChildData[]>([]);
    const [tasksCount, setTasksCount] = useState(0);
    const [rewardsCount, setRewardsCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    // Modal state
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');
    const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
    const [selectedChildForDetails, setSelectedChildForDetails] = useState<ChildData | null>(null);
    const [editingPin, setEditingPin] = useState(false);
    const [newPin, setNewPin] = useState('');

    // Subscription state
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');

    // Child form state
    const [childForm, setChildForm] = useState({
        name: '',
        birthYear: new Date().getFullYear() - 8,
        avatar: AVATARS[0],
        pin: '',
        step: 1,
    });

    // Task form state
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        category: 'chores' as keyof typeof TASK_CATEGORIES,
        starType: '⭐' as '⭐' | '🌟' | '✨',
        starValue: 5,
        assignedTo: [] as string[],
    });

    // Reward form state
    const [rewardForm, setRewardForm] = useState({
        name: '',
        description: '',
        icon: '�',
        starType: '⭐' as '⭐' | '🌟' | '✨',
        cost: 10,
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setUser({ name: parent.name, familyId: parent.familyId });

                // Load subscription
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    setSubscription(parentData.subscription?.plan || 'free');
                }

                // Subscribe to children
                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.familyId)
                );

                const unsubChildren = onSnapshot(childrenQuery, (snapshot) => {
                    const childrenData: ChildData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        childrenData.push({
                            id: doc.id,
                            name: data.name,
                            avatar: data.avatar,
                            starBalances: data.starBalances,
                            streaks: data.streaks,
                            ageGroup: data.ageGroup,
                            trustLevel: data.trustLevel || 1,
                        });
                    });
                    setChildren(childrenData);
                    // Auto-select all children for tasks
                    setTaskForm(prev => ({ ...prev, assignedTo: childrenData.map(c => c.id) }));
                    setLoading(false);
                });

                // Subscribe to tasks
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('familyId', '==', parent.familyId)
                );
                const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
                    setTasksCount(snapshot.size);
                });

                // Subscribe to rewards
                const rewardsQuery = query(
                    collection(db, 'rewards'),
                    where('familyId', '==', parent.familyId)
                );
                const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
                    setRewardsCount(snapshot.size);
                });

                // Subscribe to pending approvals
                const pendingQuery = query(
                    collection(db, 'taskCompletions'),
                    where('familyId', '==', parent.familyId),
                    where('status', '==', 'pending')
                );
                const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
                    setPendingCount(snapshot.size);
                });

                return () => {
                    unsubChildren();
                    unsubTasks();
                    unsubRewards();
                    unsubPending();
                };
            } catch (err) {
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        const { logoutParent } = await import('@/lib/auth/parent-auth');
        await logoutParent();
        router.push('/');
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalError('');
        setSelectedChild(null);
        setSelectedChildForDetails(null);
        setEditingPin(false);
        setNewPin('');
        setChildForm({ name: '', birthYear: new Date().getFullYear() - 8, avatar: AVATARS[0], pin: '', step: 1 });
        setTaskForm({ title: '', description: '', category: 'chores', starType: '⭐', starValue: 5, assignedTo: children.map(c => c.id) });
        setRewardForm({ name: '', description: '', icon: '🍦', starType: '⭐', cost: 10 });
    };

    const openChildDetails = (child: ChildData) => {
        setSelectedChild(child);
        setSelectedChildForDetails(child);
        setActiveModal('childDetails');
        setNewPin('');
        setEditingPin(false);
        setModalError('');
    };

    const handleUpdatePin = async () => {
        if (!selectedChild || newPin.length !== 4) {
            setModalError('PIN must be 4 digits');
            return;
        }
        setModalLoading(true);
        setModalError('');

        try {
            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'children', selectedChild.id), { pin: newPin });
            setSelectedChild(prev => prev ? { ...prev } : null);
            setEditingPin(false);
            setNewPin('');
        } catch (err) {
            setModalError('Failed to update PIN');
        } finally {
            setModalLoading(false);
        }
    };

    // Delete Child Handler
    const handleDeleteChild = async (childId: string) => {
        if (!confirm('Are you sure you want to delete this child? This action cannot be undone.')) return;

        setModalLoading(true);
        try {
            // Remove from family
            if (user?.familyId) {
                await updateDoc(doc(db, 'families', user.familyId), {
                    childIds: arrayRemove(childId)
                });
            }

            // Delete child document
            await deleteDoc(doc(db, 'children', childId));

            // Close modal
            setActiveModal(null);
            setSelectedChildForDetails(null);
        } catch (error) {
            console.error('Error deleting child:', error);
            setModalError('Failed to delete child');
        } finally {
            setModalLoading(false);
        }
    };

    // Add Child Handler
    const handleAddChild = async () => {
        if (childForm.pin.length !== 4) {
            setModalError('PIN must be 4 digits');
            return;
        }
        setModalLoading(true);
        setModalError('');

        try {
            const age = new Date().getFullYear() - childForm.birthYear;
            const ageGroup = age <= 6 ? '4-6' : age <= 10 ? '7-10' : age <= 14 ? '11-14' : '15+';
            const trustLevel = ageGroup === '4-6' ? 1 : ageGroup === '7-10' ? 2 : ageGroup === '11-14' ? 3 : 4;

            const childData = {
                name: childForm.name,
                familyId: user!.familyId,
                birthYear: childForm.birthYear,
                ageGroup,
                avatar: { presetId: childForm.avatar.id, backgroundColor: childForm.avatar.color },
                pin: childForm.pin,
                trustLevel,
                starBalances: { rewards: 0, weeklyEarned: 0, weeklyLimit: 100 },
                streaks: { currentStreak: 0, longestStreak: 0, lastCompletionDate: null },
                screenTimeLimits: { dailyLimitMinutes: 60, usedTodayMinutes: 0, bonusMinutesAvailable: 0, bonusUsedTodayMinutes: 0, lastReset: serverTimestamp() },
                achievements: [],
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp(),
                themeColor: childForm.avatar.color,
            };

            const docRef = await addDoc(collection(db, 'children'), childData);
            await updateDoc(doc(db, 'families', user!.familyId), { childIds: arrayUnion(docRef.id) });
            closeModal();
        } catch (err) {
            setModalError('Failed to add child');
        } finally {
            setModalLoading(false);
        }
    };

    // Add Task Handler
    const handleAddTask = async () => {
        if (!taskForm.title.trim()) {
            setModalError('Please enter a task title');
            return;
        }
        if (taskForm.assignedTo.length === 0) {
            setModalError('Please select at least one child');
            return;
        }
        setModalLoading(true);
        setModalError('');

        try {
            await addDoc(collection(db, 'tasks'), {
                familyId: user!.familyId,
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                category: taskForm.category,
                starType: taskForm.starType,
                starValue: taskForm.starValue,
                assignedChildIds: taskForm.assignedTo,
                taskType: 'daily',
                proofRequired: 'none',
                isActive: true,
                createdAt: serverTimestamp(),
            });
            closeModal();
        } catch (err) {
            setModalError('Failed to create task');
        } finally {
            setModalLoading(false);
        }
    };

    // Add Reward Handler
    const handleAddReward = async () => {
        if (!rewardForm.name.trim()) {
            setModalError('Please enter a reward name');
            return;
        }
        setModalLoading(true);
        setModalError('');

        try {
            await addDoc(collection(db, 'rewards'), {
                familyId: user!.familyId,
                name: rewardForm.name.trim(),
                description: rewardForm.description.trim(),
                icon: rewardForm.icon,
                category: 'treats',
                starType: rewardForm.starType,
                starCost: rewardForm.cost,
                limitPerWeek: null,
                requiresApproval: true,
                isActive: true,
                createdAt: serverTimestamp(),
            });
            closeModal();
        } catch (err) {
            setModalError('Failed to create reward');
        } finally {
            setModalLoading(false);
        }
    };

    const totalStars = children.reduce((sum, c) => sum + (c.starBalances.rewards || 0), 0);
    const totalStreaks = children.reduce((sum, c) => sum + c.streaks.currentStreak, 0);

    const calculateAgeGroup = (birthYear: number) => {
        const age = new Date().getFullYear() - birthYear;
        if (age <= 6) return '4-6';
        if (age <= 10) return '7-10';
        if (age <= 14) return '11-14';
        return '15+';
    };

    const calculateAge = (birthYear: number) => {
        return new Date().getFullYear() - birthYear;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const categoryEntries = Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]][];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Modal Overlay */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-lg z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-gray-100">
                        {/* Add Child Modal */}
                        {activeModal === 'child' && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Add Child</h2>
                                        <p className="text-sm text-gray-500 mt-1">Welcome a new family member</p>
                                    </div>
                                    <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                {/* Step indicators */}
                                <div className="flex gap-3 mb-8">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s <= childForm.step ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
                                            {s < 3 && <div className={`flex-1 h-1 rounded-full transition-colors ${s < childForm.step ? 'bg-indigo-500' : 'bg-gray-200'}`} />}
                                        </div>
                                    ))}
                                </div>

                                {childForm.step === 1 && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Child&apos;s Name</label>
                                            <input
                                                type="text"
                                                value={childForm.name}
                                                onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                                                placeholder="Enter name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Birth Year</label>
                                            <select
                                                value={childForm.birthYear}
                                                onChange={e => setChildForm({ ...childForm, birthYear: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 3 - i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-indigo-600 font-medium mt-2">
                                                Age group: {AGE_GROUP_LABELS[calculateAgeGroup(childForm.birthYear)]}
                                            </p>
                                        </div>
                                        <Button onClick={() => childForm.name.trim() && setChildForm({ ...childForm, step: 2 })} className="w-full" disabled={!childForm.name.trim()}>
                                            Continue
                                        </Button>
                                    </div>
                                )}

                                {childForm.step === 2 && (
                                    <div className="space-y-5">
                                        <p className="text-gray-600 text-center">Choose an avatar for {childForm.name}</p>
                                        <div className="grid grid-cols-4 gap-3">
                                            {AVATARS.map(avatar => (
                                                <button
                                                    key={avatar.id}
                                                    onClick={() => setChildForm({ ...childForm, avatar })}
                                                    className={`p-4 rounded-2xl text-4xl transition-all duration-200 ${childForm.avatar.id === avatar.id ? 'ring-3 ring-indigo-500 scale-110 bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                                                        }`}
                                                >
                                                    {avatar.emoji}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="ghost" onClick={() => setChildForm({ ...childForm, step: 1 })} className="flex-1">Back</Button>
                                            <Button onClick={() => setChildForm({ ...childForm, step: 3 })} className="flex-1">Continue</Button>
                                        </div>
                                    </div>
                                )}

                                {childForm.step === 3 && (
                                    <div className="space-y-5">
                                        <p className="text-gray-600 text-center">Set a 4-digit PIN for {childForm.name}</p>
                                        <div className="flex justify-center gap-4 mb-8">
                                            {[0, 1, 2, 3].map(i => (
                                                <div key={i} className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all duration-200 ${childForm.pin[i] ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 shadow-lg shadow-indigo-500/20 scale-105' : 'border-gray-300 bg-white'}`}>
                                                    {childForm.pin[i] ? '●' : ''}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'].map((num, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (num === '⌫') setChildForm({ ...childForm, pin: childForm.pin.slice(0, -1) });
                                                        else if (num !== null && childForm.pin.length < 4) setChildForm({ ...childForm, pin: childForm.pin + num });
                                                    }}
                                                    className={`h-14 rounded-xl text-xl font-bold transition-all duration-150 active:scale-95 ${num === null ? 'invisible' : num === '⌫' ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 hover:shadow-lg hover:scale-105' : 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 hover:shadow-lg hover:scale-105'}`}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        {modalError && <p className="text-red-600 text-sm text-center font-medium">{modalError}</p>}
                                        <div className="flex gap-3">
                                            <Button variant="ghost" onClick={() => setChildForm({ ...childForm, step: 2 })} className="flex-1">Back</Button>
                                            <Button onClick={handleAddChild} isLoading={modalLoading} disabled={childForm.pin.length !== 4} className="flex-1">
                                                Add {childForm.name}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add Task Modal */}
                        {activeModal === 'task' && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">New Task</h2>
                                        <p className="text-sm text-gray-500 mt-1">Create a new assignment</p>
                                    </div>
                                    <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Task Title</label>
                                        <input
                                            type="text"
                                            value={taskForm.title}
                                            onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="e.g., Make your bed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {categoryEntries.slice(0, 6).map(([key, cat]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setTaskForm({ ...taskForm, category: key })}
                                                    className={`p-3 rounded-2xl text-center transition-all duration-200 ${taskForm.category === key ? 'ring-3 ring-blue-500 scale-105 bg-gradient-to-br from-blue-50 to-cyan-100 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'}`}
                                                >
                                                    <div className="text-2xl mb-2">{cat.icon}</div>
                                                    <div className="text-xs font-medium text-gray-700">{cat.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Star Type</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['⭐', '🌟', '✨'].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setTaskForm({ ...taskForm, starType: star as '⭐' | '🌟' | '✨' })}
                                                    className={`p-3 rounded-2xl text-3xl transition-all duration-200 ${taskForm.starType === star ? 'ring-3 ring-indigo-500 scale-105 bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'}`}
                                                >
                                                    {star}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Assign to Children</label>
                                        <div className="space-y-2">
                                            {children.map(child => (
                                                <label key={child.id} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={taskForm.assignedTo.includes(child.id)}
                                                        onChange={e => {
                                                            const arr = [...taskForm.assignedTo];
                                                            if (e.target.checked) arr.push(child.id);
                                                            else arr.splice(arr.indexOf(child.id), 1);
                                                            setTaskForm({ ...taskForm, assignedTo: arr });
                                                        }}
                                                        className="w-5 h-5 accent-indigo-500 rounded"
                                                    />
                                                    <span className="text-gray-800 ml-3 font-medium">{child.name} {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {modalError && <p className="text-red-600 text-sm text-center font-medium">{modalError}</p>}
                                    <Button onClick={handleAddTask} isLoading={modalLoading} disabled={!taskForm.title.trim() || taskForm.assignedTo.length === 0} className="w-full">
                                        Create Task
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Add Reward Modal */}
                        {activeModal === 'reward' && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">New Reward</h2>
                                        <p className="text-sm text-gray-500 mt-1">Create a new incentive</p>
                                    </div>
                                    <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Reward Name</label>
                                        <input
                                            type="text"
                                            value={rewardForm.name}
                                            onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="e.g., Ice cream"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Icon</label>
                                        <div className="grid grid-cols-4 gap-3">
                                            {['🍦', '🎮', '📚', '🎬', '🎸', '⛳', '🚀', '🎪'].map((icon) => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setRewardForm({ ...rewardForm, icon })}
                                                    className={`p-3 rounded-2xl text-4xl transition-all duration-200 ${rewardForm.icon === icon ? 'ring-3 ring-rose-500 scale-110 bg-gradient-to-br from-rose-50 to-pink-100 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'}`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Star Cost</label>
                                        <input
                                            type="number"
                                            value={rewardForm.cost}
                                            onChange={e => setRewardForm({ ...rewardForm, cost: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            min="1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Star Type</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['⭐', '🌟', '✨'].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRewardForm({ ...rewardForm, starType: star as '⭐' | '🌟' | '✨' })}
                                                    className={`p-3 rounded-2xl text-3xl transition-all duration-200 ${rewardForm.starType === star ? 'ring-3 ring-rose-500 scale-105 bg-gradient-to-br from-rose-50 to-pink-100 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'}`}
                                                >
                                                    {star}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {modalError && <p className="text-red-600 text-sm text-center font-medium">{modalError}</p>}
                                    <Button onClick={handleAddReward} isLoading={modalLoading} disabled={!rewardForm.name.trim()} className="w-full">
                                        Create Reward
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Child Details Modal */}
                        {activeModal === 'childDetails' && selectedChildForDetails && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{selectedChildForDetails.name}</h2>
                                    <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">✕</button>
                                </div>

                                <div className="space-y-6">
                                    {/* Avatar and Basic Info */}
                                    <div className="text-center">
                                        <div
                                            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg"
                                            style={{ backgroundColor: selectedChildForDetails.avatar.backgroundColor }}
                                        >
                                            {AVATAR_EMOJIS[selectedChildForDetails.avatar.presetId] || '⭐'}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">{selectedChildForDetails.name}</h3>
                                        <p className="text-slate-400 mt-1">{AGE_GROUP_LABELS[selectedChildForDetails.ageGroup]}</p>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center border border-yellow-200">
                                            <p className="text-yellow-700 text-2xl font-bold">⭐ {selectedChildForDetails.starBalances.rewards || 0}</p>
                                            <p className="text-xs text-yellow-600 font-semibold mt-2">Stars</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200">
                                            <p className="text-orange-700 text-2xl font-bold">🔥 {selectedChildForDetails.streaks.currentStreak}</p>
                                            <p className="text-xs text-orange-600 font-semibold mt-2">Streak</p>
                                        </div>
                                    </div>

                                    {/* Trust Level */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                        <p className="text-sm text-gray-700 font-semibold mb-3">Trust Level</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all"
                                                    style={{
                                                        width: `${(selectedChildForDetails.trustLevel / 5) * 100}%`,
                                                        backgroundColor: TRUST_COLORS[selectedChildForDetails.trustLevel]
                                                    }}
                                                />
                                            </div>
                                            <span className="text-gray-800 font-bold min-w-fit">{selectedChildForDetails.trustLevel}/5</span>
                                        </div>
                                    </div>

                                    {/* PIN Management */}
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-sm text-gray-700 font-semibold">Login PIN</p>
                                            {!editingPin && (
                                                <button
                                                    onClick={() => {
                                                        setEditingPin(true);
                                                        setNewPin('');
                                                        setModalError('');
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {editingPin ? (
                                            <div className="space-y-4">
                                                <p className="text-slate-300 text-sm">Set a new 4-digit PIN</p>
                                                <div className="flex justify-center gap-3 mb-4">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${newPin[i] ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/20'}`}>
                                                            {newPin[i] ? '●' : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'].map((num, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                if (num === '⌫') setNewPin(newPin.slice(0, -1));
                                                                else if (num !== null && newPin.length < 4) setNewPin(newPin + num);
                                                            }}
                                                            className={`h-10 rounded-lg text-sm font-bold transition-all ${num === null ? 'invisible' : num === '⌫' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40'}`}
                                                        >
                                                            {num}
                                                        </button>
                                                    ))}
                                                </div>
                                                {modalError && <p className="text-red-400 text-xs text-center">{modalError}</p>}
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPin(false);
                                                            setNewPin('');
                                                            setModalError('');
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <Button
                                                        onClick={handleUpdatePin}
                                                        isLoading={modalLoading}
                                                        disabled={newPin.length !== 4}
                                                        className="flex-1"
                                                    >
                                                        Save PIN
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4">
                                                <div className="flex gap-2 flex-1">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className="flex-1 h-3 rounded-full bg-indigo-500" />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-700 font-semibold">••••</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => router.push(`/children/${selectedChildForDetails.id}`)}
                                            className="w-full px-4 py-2 bg-indigo-100 border border-indigo-300 rounded-lg text-indigo-700 text-sm font-semibold hover:bg-indigo-200 transition-colors shadow-sm"
                                        >
                                            View Full Profile
                                        </button>
                                        <button
                                            onClick={() => selectedChildForDetails && handleDeleteChild(selectedChildForDetails.id)}
                                            className="w-full px-4 py-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors shadow-sm"
                                        >
                                            Delete Child
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/60 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                            <span className="text-xl">⭐</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Family Rewards</h1>
                            <p className="text-xs text-indigo-600">Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {pendingCount > 0 && (
                            <Link href="/approvals">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                        <span className="text-xl">🔔</span>
                                    </div>
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                                        {pendingCount}
                                    </span>
                                </div>
                            </Link>
                        )}
                        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800 text-sm transition-colors font-medium">
                            Logout
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {user?.name?.charAt(0) || 'P'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                        Welcome back, {user?.name?.split(' ')[0] || 'Parent'}! 👋
                    </h2>
                    <p className="text-gray-600 text-lg">Here&apos;s what&apos;s happening with your family today.</p>
                </div>

                {/* Subscription Banner */}
                <div className="mb-8">
                    <SubscriptionBanner
                        plan={subscription}
                        onUpgrade={() => router.push('/subscriptions')}
                    />
                </div>

                {/* Quick Actions - Now open modals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
                    <button onClick={() => setActiveModal('child')} className="group text-left">
                        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-2xl p-6 hover:border-green-400 transition-all duration-300 hover:shadow-xl hover:shadow-green-200/30 hover:scale-105">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">👶</span>
                            </div>
                            <h3 className="font-semibold text-gray-800">Add Child</h3>
                            <p className="text-xs text-green-700 font-medium mt-1">New family member</p>
                        </div>
                    </button>
                    <button onClick={() => setActiveModal('task')} className="group text-left">
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-5 hover:border-blue-400 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-100">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">📝</span>
                            </div>
                            <h3 className="font-semibold text-gray-800">New Task</h3>
                            <p className="text-xs text-blue-600 mt-1">Create assignment</p>
                        </div>
                    </button>
                    <button onClick={() => setActiveModal('reward')} className="group text-left">
                        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 hover:border-rose-400 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-rose-100">
                            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">🎁</span>
                            </div>
                            <h3 className="font-semibold text-gray-800">Add Reward</h3>
                            <p className="text-xs text-rose-600 mt-1">New incentive</p>
                        </div>
                    </button>
                    <Link href="/approvals" className="group">
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 hover:border-amber-400 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-100 relative">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h3 className="font-semibold text-gray-800">Approvals</h3>
                            <p className="text-xs text-amber-600 mt-1">
                                {pendingCount > 0 ? `${pendingCount} pending` : 'All caught up'}
                            </p>
                            {pendingCount > 0 && (
                                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </div>
                    </Link>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
                    <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">👨‍👩‍👧‍👦</span>
                            </div>
                            <span className="text-gray-600 text-sm font-medium">Children</span>
                        </div>
                        <p className="text-3xl font-bold text-indigo-600">{children.length}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm border border-yellow-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">⭐</span>
                            </div>
                            <span className="text-gray-600 text-sm font-medium">Total Stars</span>
                        </div>
                        <p className="text-3xl font-bold text-yellow-600">{totalStars}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🔥</span>
                            </div>
                            <span className="text-gray-600 text-sm font-medium">Active Streaks</span>
                        </div>
                        <p className="text-3xl font-bold text-orange-600">{totalStreaks}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">📋</span>
                            </div>
                            <span className="text-gray-600 text-sm font-medium">Active Tasks</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{tasksCount}</p>
                    </div>
                </div>

                {/* Children Section */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Your Children</h3>
                        <Link href="/children" className="text-indigo-600 text-sm hover:text-indigo-700 transition-colors font-medium">
                            View all →
                        </Link>
                    </div>

                    {children.length === 0 ? (
                        <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-10 text-center shadow-sm">
                            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                            <h4 className="text-xl font-semibold text-gray-800 mb-2">Add Your First Child</h4>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Get started by adding your children to the family.
                            </p>
                            <Button onClick={() => setActiveModal('child')}>
                                <span className="mr-2">👶</span> Add a Child
                            </Button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {children.map(child => (
                                <button key={child.id} onClick={() => openChildDetails(child)} className="group text-left w-full">
                                    <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 hover:bg-white/90 hover:border-indigo-200 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform"
                                                style={{ backgroundColor: child.avatar.backgroundColor }}
                                            >
                                                {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-gray-800">{child.name}</h4>
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TRUST_COLORS[child.trustLevel] }} />
                                                </div>
                                                <p className="text-xs text-gray-700 font-semibold mb-3">{AGE_GROUP_LABELS[child.ageGroup]}</p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="flex items-center gap-1 text-yellow-700 font-semibold">⭐ {child.starBalances.rewards || 0}</span>
                                                    <span className="flex items-center gap-1 text-orange-700 font-semibold">🔥 {child.streaks.currentStreak}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid md:grid-cols-3 gap-5 mb-12">
                    <Link href="/tasks" className="group">
                        <div className="bg-gradient-to-br from-blue-100 via-cyan-100 to-sky-100 border border-blue-200 rounded-2xl p-8 hover:border-blue-400 transition-all duration-300 text-center shadow-lg hover:shadow-xl hover:scale-105">
                            <span className="text-4xl mb-3 block">📋</span>
                            <h3 className="font-bold text-gray-800 mb-1 text-lg">Task Library</h3>
                            <p className="text-sm text-blue-700 font-semibold">{tasksCount} active tasks</p>
                        </div>
                    </Link>
                    <Link href="/rewards" className="group">
                        <div className="bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200 rounded-2xl p-6 hover:border-rose-400 transition-all text-center shadow-sm">
                            <span className="text-4xl mb-3 block">🎁</span>
                            <h3 className="font-bold text-gray-800 mb-1 text-lg">Reward Shop</h3>
                            <p className="text-sm text-rose-700 font-semibold">{rewardsCount} rewards available</p>
                        </div>
                    </Link>
                    <Link href="/approvals" className="group">
                        <div className="bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 rounded-2xl p-6 hover:border-amber-400 transition-all text-center relative shadow-sm">
                            <span className="text-4xl mb-3 block">✅</span>
                            <h3 className="font-bold text-gray-800 mb-1 text-lg">Approvals</h3>
                            <p className="text-sm text-amber-700 font-semibold">{pendingCount > 0 ? `${pendingCount} items pending` : 'All caught up!'}</p>
                        </div>
                    </Link>
                </div>

                {/* Family Code */}
                {user?.familyId && (
                    <div className="bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border border-purple-200 rounded-2xl p-8 mb-12 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">Family Code</h3>
                                <p className="text-sm text-gray-700">Share this with your children to let them log in</p>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-8 py-4 border border-indigo-200 shadow-sm">
                                <p className="text-3xl font-bold text-indigo-600 tracking-[0.3em] font-mono">
                                    {user.familyId.replace('family_', '').slice(0, 8).toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Tips */}
                <div className="bg-gradient-to-r from-white via-blue-50 to-indigo-50 border border-gray-200 rounded-2xl p-8 shadow-lg">
                    <h4 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2">💡 <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quick Tips</span></h4>
                    <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                            <span>⭐</span>
                            <p><strong className="text-gray-800">Stars</strong> are earned by completing tasks</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span>�</span>
                            <p><strong className="text-gray-800">Rewards</strong> can be redeemed using stars</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span>🔥</span>
                            <p><strong className="text-gray-800">Streaks</strong> give bonus stars for consistency</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
