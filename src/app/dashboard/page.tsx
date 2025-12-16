'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { SubscriptionBanner, SubscriptionStatus } from '@/components/parent';
import { canAddChild, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';
import { StatsWidget } from '@/components/dashboard/StatsWidget';
import { ApprovalsWidget } from '@/components/dashboard/ApprovalsWidget';
import { ChildCard } from '@/components/dashboard/ChildCard';
import { Plus, Gift, CheckSquare, UserPlus, Trophy, MessageSquare, Clock } from 'lucide-react';

// Types
interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number };
    streaks: { currentStreak: number };
    ageGroup: string;
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
    const [completionsCount, setCompletionsCount] = useState(0);
    const [familyStreak, setFamilyStreak] = useState(0);
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');

    // Modal State
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    // Child Selection for details/actions
    const [selectedChildForDetails, setSelectedChildForDetails] = useState<ChildData | null>(null);

    // Forms State
    const [childForm, setChildForm] = useState({
        name: '',
        birthYear: new Date().getFullYear() - 8,
        avatar: AVATARS[0],
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

                // Load subscription plan
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    setSubscription(parentDoc.data().subscription?.plan || 'free');
                }

                // Subscribe to children
                const q = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.familyId)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
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

                // Get active tasks count
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('familyId', '==', parent.familyId),
                    where('isActive', '==', true)
                );
                const taskSnap = await getDocs(tasksQuery);
                setTasksCount(taskSnap.size);

                // Get completions count (simple total for stats)
                // Note: For real app, better to maintain a counter on family doc
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('familyId', '==', parent.familyId)
                );
                getDocs(completionsQuery).then(snap => setCompletionsCount(snap.size));

                return () => unsubscribe();
            } catch (error) {
                console.error('Auth error:', error);
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    // Handle Delete Child
    const handleDeleteChild = async (childId: string) => {
        if (!confirm('Are you sure you want to delete this child? This action cannot be undone.')) return;

        setModalLoading(true);
        try {
            if (user?.familyId) {
                await updateDoc(doc(db, 'families', user.familyId), {
                    childIds: arrayRemove(childId)
                });
            }
            await deleteDoc(doc(db, 'children', childId));
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
        if (!canAddChild(subscription, children.length)) {
            // Show upgrade prompt (could be handled better, for now redirect or show error)
            router.push('/subscriptions');
            return;
        }

        if (childForm.pin.length !== 4) {
            setModalError('PIN must be 4 digits');
            return;
        }
        setModalLoading(true);
        setModalError('');

        try {
            const age = new Date().getFullYear() - childForm.birthYear;
            const ageGroup = age <= 6 ? '4-6' : age <= 10 ? '7-10' : age <= 14 ? '11-14' : '15+';

            const childData = {
                name: childForm.name,
                familyId: user!.familyId,
                birthYear: childForm.birthYear,
                ageGroup,
                avatar: { presetId: childForm.avatar.id, backgroundColor: childForm.avatar.color },
                pin: childForm.pin,
                starBalances: { growth: 0, weeklyEarned: 0, weeklyLimit: 100 },
                streaks: { currentStreak: 0, longestStreak: 0, lastCompletionDate: null },
                screenTimeLimits: { dailyLimitMinutes: 60, usedTodayMinutes: 0, bonusMinutesAvailable: 0, bonusUsedTodayMinutes: 0, lastReset: serverTimestamp() },
                achievements: [],
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp(),
                themeColor: childForm.avatar.color,
            };

            const docRef = await addDoc(collection(db, 'children'), childData);
            await updateDoc(doc(db, 'families', user!.familyId), { childIds: arrayUnion(docRef.id) });

            setChildForm({ name: '', birthYear: new Date().getFullYear() - 8, avatar: AVATARS[0], pin: '' });
            setActiveModal(null);
        } catch (err) {
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
                familyId: user!.familyId,
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900 font-sans selection:bg-indigo-100">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-indigo-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                            R
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">RewardSystem</h1>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs font-medium">
                                <span className="text-indigo-500">Family Dashboard</span>
                                {user?.familyId && (
                                    <span className="hidden sm:inline text-gray-300">•</span>
                                )}
                                {user?.familyId && (
                                    <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                        Code: <span className="text-gray-900 font-bold font-mono tracking-wider select-all">{user.familyId.replace('family_', '').slice(0, 8).toUpperCase()}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block">
                            <SubscriptionStatus plan={subscription} childrenCount={children.length} variant="compact" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                            {user?.name.charAt(0)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 inline-block mb-2">
                        Welcome back, {user?.name}
                    </h2>
                    <p className="text-gray-500 text-lg">Here&apos;s what&apos;s happening in your family today.</p>
                </div>

                {/* Subscription Banner */}
                {subscription === 'free' && (
                    <div className="mb-8">
                        <SubscriptionBanner
                            plan="free"
                            onUpgrade={() => router.push('/subscriptions')}
                        />
                    </div>
                )}

                {/* Stats Overview */}
                <StatsWidget
                    totalStars={totalFamilyStars}
                    activeTasks={tasksCount}
                    totalCompletions={completionsCount}
                    familyStreak={familyStreak}
                />



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (Children Grid) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Action Bar */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span>Children</span>
                                <Badge variant="default" className="bg-indigo-100 text-indigo-700 border-none">{children.length}</Badge>
                            </h3>
                            <button
                                onClick={() => {
                                    if (canAddChild(subscription, children.length)) {
                                        setActiveModal('child');
                                    } else {
                                        router.push('/subscriptions');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 hover:translate-y-px"
                            >
                                <Plus size={18} />
                                Add Child
                            </button>
                        </div>

                        {/* Children Grid */}
                        {children.length === 0 ? (
                            <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-10 text-center shadow-lg shadow-indigo-50">
                                <div className="text-6xl mb-4 opacity-50">👨‍👩‍👧‍👦</div>
                                <h3 className="text-xl font-bold mb-2 text-gray-900">Start your family journey</h3>
                                <p className="text-gray-500 mb-6">Add your children to start managing tasks and rewards.</p>
                                <Button onClick={() => setActiveModal('child')}>Add Your First Child</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {children.map(child => (
                                    <ChildCard
                                        key={child.id}
                                        child={child}
                                        onViewProfile={(id) => router.push(`/children/${id}`)}
                                        onDelete={(c) => handleDeleteChild(c.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Quick Actions Panel */}
                        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-6 md:p-8 shadow-lg shadow-indigo-100/50">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link href="/tasks/create" className="group">
                                    <div className="bg-white border border-gray-100 hover:border-indigo-200 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-50">
                                        <div className="w-12 h-12 mx-auto bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                            <CheckSquare size={24} />
                                        </div>
                                        <div className="font-semibold text-gray-900">New Task</div>
                                        <div className="text-xs text-gray-500 mt-1">Assign work</div>
                                    </div>
                                </Link>
                                <Link href="/approvals" className="group">
                                    <div className="bg-white border border-gray-100 hover:border-orange-200 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-50">
                                        <div className="w-12 h-12 mx-auto bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-3 group-hover:scale-110 transition-transform">
                                            <Clock size={24} />
                                        </div>
                                        <div className="font-semibold text-gray-900">Approvals</div>
                                        <div className="text-xs text-gray-500 mt-1">Review tasks</div>
                                    </div>
                                </Link>
                                <Link href="/rewards/create" className="group">
                                    <div className="bg-white border border-gray-100 hover:border-pink-200 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-50">
                                        <div className="w-12 h-12 mx-auto bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 mb-3 group-hover:scale-110 transition-transform">
                                            <Gift size={24} />
                                        </div>
                                        <div className="font-semibold text-gray-900">New Reward</div>
                                        <div className="text-xs text-gray-500 mt-1">Create incentive</div>
                                    </div>
                                </Link>
                                <Link href="/rewards" className="group">
                                    <div className="bg-white border border-gray-100 hover:border-purple-200 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-50">
                                        <div className="w-12 h-12 mx-auto bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                                            <Trophy size={24} />
                                        </div>
                                        <div className="font-semibold text-gray-900">Rewards</div>
                                        <div className="text-xs text-gray-500 mt-1">View Store</div>
                                    </div>
                                </Link>
                                <Link href="/chat" className="group">
                                    <div className="bg-white border border-gray-100 hover:border-blue-200 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-50">
                                        <div className="w-12 h-12 mx-auto bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                            <MessageSquare size={24} />
                                        </div>
                                        <div className="font-semibold text-gray-900">Chat</div>
                                        <div className="text-xs text-gray-500 mt-1">Message Kids</div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Pending Approvals */}
                    <div className="space-y-8">
                        {user?.familyId && (
                            <ApprovalsWidget
                                familyId={user.familyId}
                                onActionComplete={() => {
                                    setCompletionsCount(prev => prev + 1);
                                }}
                            />
                        )}

                        {/* Pro Tip Card */}
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
                            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                💡 Parenting Tip
                            </h4>
                            <p className="text-sm text-amber-700 leading-relaxed">
                                Consistent positive reinforcement builds better habits than punishment. Try to catch your kids doing something good today!
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals Overlay */}
            {activeModal && (
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
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-white/20 backdrop-blur-md">
                                            {AVATAR_EMOJIS[selectedChildForDetails.avatar.presetId]}
                                        </div>
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
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={childForm.name}
                                            onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="Child's name"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Year of Birth</label>
                                            <select
                                                value={childForm.birthYear}
                                                onChange={e => setChildForm({ ...childForm, birthYear: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            >
                                                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 3 - i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">PIN (4 digits)</label>
                                            <input
                                                type="number"
                                                maxLength={4}
                                                value={childForm.pin}
                                                onChange={e => setChildForm({ ...childForm, pin: e.target.value.slice(0, 4) })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                placeholder="1234"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Choose Avatar</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {AVATARS.map(avatar => (
                                                <button
                                                    key={avatar.id}
                                                    onClick={() => setChildForm({ ...childForm, avatar })}
                                                    className={`p-3 rounded-xl text-2xl transition-all ${childForm.avatar.id === avatar.id ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-105' : 'bg-gray-50 hover:bg-gray-100'}`}
                                                >
                                                    {avatar.emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {modalError && <p className="text-red-500 text-sm text-center">{modalError}</p>}
                                    <div className="flex gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
                                        <Button onClick={handleAddChild} isLoading={modalLoading} disabled={!childForm.name || childForm.pin.length !== 4} className="flex-1">Add Child</Button>
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
            )}
        </div>
    );
}
