'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { PinInput } from '@/components/ui/PinInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar, CHILD_AVATARS, getAvatarById } from '@/components/ui/Avatar';
import { TASK_CATEGORIES } from '@/lib/constants';
import { SubscriptionBanner, SubscriptionStatus } from '@/components/parent';
import { canAddChild, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';
import { StatsWidget } from '@/components/dashboard/StatsWidget';
import { ApprovalsWidget } from '@/components/dashboard/ApprovalsWidget';
import { ChildCard } from '@/components/dashboard/ChildCard';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { Plus, Gift, CheckSquare, UserPlus, Trophy, MessageSquare, Clock, LogOut, HelpCircle, Users, ChevronRight } from 'lucide-react';

// Types
interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number };
    streaks: { currentStreak: number };
    ageGroup: string;
}

// Using CHILD_AVATARS from @/components/ui/Avatar

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
    const [user, setUser] = useState<{ name: string; parentId: string } | null>(null);
    const [children, setChildren] = useState<ChildData[]>([]);
    const [tasksCount, setTasksCount] = useState(0);
    const [completionsCount, setCompletionsCount] = useState(0);
    const [familyStreak, setFamilyStreak] = useState(0);
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');

    // Modal State
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    // Child Selection for details/actions
    const [selectedChildForDetails, setSelectedChildForDetails] = useState<ChildData | null>(null);
    const [childToDelete, setChildToDelete] = useState<string | null>(null);

    // Tour State
    const [showTour, setShowTour] = useState(false);

    // Forms State
    const [childForm, setChildForm] = useState({
        name: '',
        pin: '',
    });

    // Reward Form
    const [rewardForm, setRewardForm] = useState({
        name: '',
        cost: 10,
        starType: 'growth' as const,
        icon: REWARD_ICONS[0],
        availableTo: [] as string[],
    });

    // Refs for cleanup
    const unsubscribeChildrenRef = useRef<(() => void) | null>(null);
    const unsubscribeTasksRef = useRef<(() => void) | null>(null);
    const unsubscribeCompletionsRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const setupListeners = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setUser({ name: parent.name || 'Parent', parentId: parent.id });

                // Load subscription plan
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    setSubscription(parentDoc.data().subscription?.plan || 'free');
                }

                // Subscribe to children (real-time)
                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.id)
                );

                unsubscribeChildrenRef.current = onSnapshot(childrenQuery, (snapshot) => {
                    const childrenData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as ChildData[];
                    setChildren(childrenData);

                    // Update max streak
                    const maxStreak = Math.max(...childrenData.map(c => c.streaks?.currentStreak || 0), 0);
                    setFamilyStreak(maxStreak);

                    setLoading(false);
                });

                // Subscribe to tasks count (real-time)
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('familyId', '==', parent.id),
                    where('isActive', '==', true)
                );
                unsubscribeTasksRef.current = onSnapshot(tasksQuery, (snapshot) => {
                    setTasksCount(snapshot.size);
                });

                // Subscribe to completions count (real-time)
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('familyId', '==', parent.id)
                );
                unsubscribeCompletionsRef.current = onSnapshot(completionsQuery, (snapshot) => {
                    setCompletionsCount(snapshot.size);
                });

            } catch (error) {
                console.error('Auth error:', error);
                router.push('/auth/login');
            }
        };

        setupListeners();

        // Cleanup function
        return () => {
            if (unsubscribeChildrenRef.current) unsubscribeChildrenRef.current();
            if (unsubscribeTasksRef.current) unsubscribeTasksRef.current();
            if (unsubscribeCompletionsRef.current) unsubscribeCompletionsRef.current();
        };
    }, [router]);

    // Handle Logout
    const handleLogout = async () => {
        try {
            const { logoutParent } = await import('@/lib/auth/parent-auth');
            await logoutParent();
            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Handle Delete Child
    const handleDeleteChild = async (childId: string) => {
        setModalLoading(true);
        try {
            if (user?.parentId) {
                await updateDoc(doc(db, 'families', user.parentId), {
                    childIds: arrayRemove(childId)
                });
            }
            await deleteDoc(doc(db, 'children', childId));
            setActiveModal(null);
            setSelectedChildForDetails(null);
            setChildToDelete(null);
        } catch (error) {
            console.error('Error deleting child:', error);
            setModalError('Failed to delete child');
        } finally {
            setModalLoading(false);
        }
    };

    // Add Child Handler
    const handleAddChild = async () => {
        if (!canAddChild(subscription, children.length)) {
            router.push('/subscriptions');
            return;
        }

        if (!childForm.name.trim()) {
            setModalError('Please enter a name');
            return;
        }

        if (childForm.pin.length !== 4) {
            setModalError('PIN must be 4 digits');
            return;
        }

        // Check if PIN is already used by another child
        const existingPins = await getDocs(
            query(collection(db, 'children'), where('familyId', '==', user!.parentId))
        );
        const pinExists = existingPins.docs.some((doc) => (doc.data() as { pin: string }).pin === childForm.pin);
        if (pinExists) {
            setModalError('This PIN is already used by another child.');
            return;
        }

        setModalLoading(true);
        setModalError('');

        try {
            const defaultAvatar = CHILD_AVATARS[Math.floor(Math.random() * CHILD_AVATARS.length)];

            const childData = {
                name: childForm.name.trim(),
                familyId: user!.parentId,
                birthYear: new Date().getFullYear() - 8,
                ageGroup: '7-10',
                avatar: { presetId: defaultAvatar.id, backgroundColor: defaultAvatar.color },
                pin: childForm.pin,
                starBalances: { growth: 0, weeklyEarned: 0, weeklyLimit: 100 },
                streaks: { currentStreak: 0, longestStreak: 0, lastCompletionDate: null },
                screenTimeLimits: { dailyLimitMinutes: 60, usedTodayMinutes: 0, bonusMinutesAvailable: 0, bonusUsedTodayMinutes: 0, lastReset: serverTimestamp() },
                achievements: [],
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp(),
                themeColor: defaultAvatar.color,
            };

            await addDoc(collection(db, 'children'), childData);

            setChildForm({ name: '', pin: '' });
            setActiveModal(null);
        } catch (err) {
            console.error('Error adding child:', err);
            setModalError('Failed to add child');
        } finally {
            setModalLoading(false);
        }
    };

    // Add Reward Handler
    const handleAddReward = async () => {
        if (!rewardForm.name.trim()) return;
        setModalLoading(true);
        try {
            await addDoc(collection(db, 'rewards'), {
                familyId: user!.parentId,
                name: rewardForm.name,
                cost: rewardForm.cost,
                starType: rewardForm.starType,
                icon: rewardForm.icon,
                availableTo: rewardForm.availableTo.length > 0 ? rewardForm.availableTo : 'all',
                createdAt: serverTimestamp(),
            });
            setRewardForm({ name: '', cost: 10, starType: 'growth', icon: REWARD_ICONS[0], availableTo: [] });
            setActiveModal(null);
        } catch (err) {
            setModalError('Failed to create reward');
        } finally {
            setModalLoading(false);
        }
    };


    const totalFamilyStars = children.reduce((acc, child) => acc + (child.starBalances?.growth || 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar - Minimal */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
                    <div className="lg:hidden w-10" />
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <SubscriptionStatus plan={subscription} childrenCount={children.length} variant="compact" />
                        <button
                            onClick={() => setShowTour(true)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Take a tour"
                        >
                            <HelpCircle size={18} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-6 lg:p-8 max-w-6xl">
                {/* Greeting */}
                <div className="mb-6">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-500">Here&apos;s your family overview</p>
                </div>

                {/* Subscription Banner */}
                {subscription === 'free' && (
                    <div className="mb-6">
                        <SubscriptionBanner plan="free" onUpgrade={() => router.push('/subscriptions')} />
                    </div>
                )}

                {/* Quick Actions - More Prominent */}
                <div className="mb-8" data-tour="quick-actions">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Link
                            href="/tasks/create"
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <CheckSquare size={24} className="text-indigo-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">New Task</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Create a task</p>
                        </Link>
                        <Link
                            href="/rewards/create"
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Gift size={24} className="text-rose-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">New Reward</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Add a reward</p>
                        </Link>
                        <Link
                            href="/tasks"
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Clock size={24} className="text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">All Tasks</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{tasksCount} active tasks</p>
                        </Link>
                        <Link
                            href="/rewards"
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Trophy size={24} className="text-purple-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">Rewards</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Manage rewards</p>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="stats">
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">⭐</span>
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Total</span>
                        </div>
                        <div className="text-3xl font-bold text-amber-700">{totalFamilyStars}</div>
                        <div className="text-sm text-amber-600 mt-1">Family Stars</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                            <CheckSquare size={24} className="text-indigo-600" />
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>
                        </div>
                        <div className="text-3xl font-bold text-indigo-700">{tasksCount}</div>
                        <div className="text-sm text-indigo-600 mt-1">Tasks</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
                        <div className="flex items-center justify-between mb-3">
                            <Trophy size={24} className="text-green-600" />
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Done</span>
                        </div>
                        <div className="text-3xl font-bold text-green-700">{completionsCount}</div>
                        <div className="text-sm text-green-600 mt-1">Completed</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 border border-orange-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">🔥</span>
                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Best</span>
                        </div>
                        <div className="text-3xl font-bold text-orange-700">{familyStreak}</div>
                        <div className="text-sm text-orange-600 mt-1">Day Streak</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Children Section */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-tour="children">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users size={20} className="text-indigo-600" />
                                    <h2 className="text-lg font-bold text-gray-900">Children</h2>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{children.length}</span>
                                </div>
                                <button
                                    data-tour="add-child"
                                    onClick={() => {
                                        if (canAddChild(subscription, children.length)) {
                                            setActiveModal('child');
                                        } else {
                                            router.push('/subscriptions');
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>

                            {children.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                        <span className="text-4xl">👨‍👩‍👧</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Add your first child</h3>
                                    <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Start managing tasks and rewards for your family</p>
                                    <Button onClick={() => setActiveModal('child')} size="lg" className="gap-2">
                                        <UserPlus size={18} />
                                        Add Child
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {children.map(child => (
                                        <Link
                                            key={child.id}
                                            href={`/children/${child.id}`}
                                            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                                        >
                                            <Avatar
                                                emoji={getAvatarById(child.avatar?.presetId || 'lion').emoji}
                                                size="md"
                                                backgroundColor={child.avatar?.backgroundColor || '#6366f1'}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate">{child.name}</h3>
                                                <p className="text-sm text-gray-500">{AGE_GROUP_LABELS[child.ageGroup]}</p>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="text-center">
                                                    <div className="font-bold text-amber-600 text-lg">{child.starBalances?.growth || 0}</div>
                                                    <div className="text-xs text-gray-400">Stars</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-orange-600 text-lg">{child.streaks?.currentStreak || 0}</div>
                                                    <div className="text-xs text-gray-400">Streak</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6" data-tour="approvals">
                        {/* Approvals */}
                        {user?.parentId && (
                            <ApprovalsWidget
                                familyId={user.parentId}
                                onActionComplete={() => setCompletionsCount(prev => prev + 1)}
                            />
                        )}

                        {/* Tip Card */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <span className="text-xl">💡</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-800 mb-1">Parenting Tip</h3>
                                    <p className="text-sm text-amber-700 leading-relaxed">
                                        Celebrate small wins! Recognizing effort builds confidence and motivation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals Overlay */}
            {
                activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                        <div
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Manage Child Modal (Details) */}
                            {activeModal === 'childDetails' && selectedChildForDetails && (
                                <div className="p-0">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <Avatar
                                                emoji={getAvatarById(selectedChildForDetails.avatar?.presetId || 'lion').emoji}
                                                size="lg"
                                                backgroundColor={selectedChildForDetails.avatar?.backgroundColor || '#6366f1'}
                                            />
                                            <div>
                                                <h2 className="text-2xl font-bold">{selectedChildForDetails.name}</h2>
                                                <p className="opacity-80">{AGE_GROUP_LABELS[selectedChildForDetails.ageGroup]}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <button
                                                onClick={() => router.push(`/children/${selectedChildForDetails.id}`)}
                                                className="p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-2xl text-left transition-colors group"
                                            >
                                                <div className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform origin-left">👤</div>
                                                <div className="font-bold text-gray-900">View Profile</div>
                                                <div className="text-xs text-gray-500">See full stats & history</div>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteChild(selectedChildForDetails.id)}
                                                className="p-4 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-2xl text-left transition-colors group"
                                            >
                                                <div className="text-red-500 mb-2 group-hover:scale-110 transition-transform origin-left">🗑️</div>
                                                <div className="font-bold text-gray-900">Delete Child</div>
                                                <div className="text-xs text-gray-500">Remove from family</div>
                                            </button>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button variant="ghost" onClick={() => setActiveModal(null)}>Close</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add Child Modal */}
                            {activeModal === 'child' && (
                                <div className="p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Child</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Child&apos;s Name</label>
                                            <input
                                                type="text"
                                                value={childForm.name}
                                                onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                placeholder="Enter child's name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN (4 digits)</label>
                                            <PinInput
                                                value={childForm.pin}
                                                onChange={(pin) => setChildForm({ ...childForm, pin })}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Your child will use this PIN to log in</p>
                                        </div>
                                        {modalError && <p className="text-red-500 text-sm text-center">{modalError}</p>}
                                        <div className="flex gap-3 mt-6">
                                            <Button variant="ghost" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
                                            <Button onClick={handleAddChild} isLoading={modalLoading} disabled={!childForm.name.trim() || childForm.pin.length !== 4} className="flex-1">Add Child</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add Reward Modal */}
                            {activeModal === 'reward' && (
                                <div className="p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Reward</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reward Name</label>
                                            <input
                                                type="text"
                                                value={rewardForm.name}
                                                onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                                placeholder="e.g. Ice Cream, 30m Screen Time"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Cost (Stars)</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="1" max="100"
                                                    value={rewardForm.cost}
                                                    onChange={e => setRewardForm({ ...rewardForm, cost: parseInt(e.target.value) })}
                                                    className="flex-1"
                                                />
                                                <span className="font-bold text-lg w-12 text-center text-pink-600">{rewardForm.cost}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Icon</label>
                                            <div className="flex flex-wrap gap-2">
                                                {REWARD_ICONS.map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setRewardForm({ ...rewardForm, icon })}
                                                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${rewardForm.icon === icon ? 'bg-pink-100 ring-2 ring-pink-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {modalError && <p className="text-red-500 text-sm text-center">{modalError}</p>}
                                        <div className="flex gap-3 mt-6">
                                            <Button variant="ghost" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
                                            <Button onClick={handleAddReward} isLoading={modalLoading} disabled={!rewardForm.name} className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-none">Create Reward</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {/* Delete Child Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!childToDelete}
                onClose={() => setChildToDelete(null)}
                onConfirm={() => childToDelete && handleDeleteChild(childToDelete)}
                title="Delete Child?"
                message="This will permanently delete this child's profile, including all their tasks and progress. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isLoading={modalLoading}
            />

            {/* Dashboard Tour */}
            <DashboardTour
                isOpen={showTour}
                onClose={() => setShowTour(false)}
                onComplete={() => {
                    setShowTour(false);
                    localStorage.setItem('hasSeenDashboardTour', 'true');
                }}
            />
        </div >
    );
}
