'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { PinInput } from '@/components/ui/PinInput';
import { canAddChild, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';

const DEFAULT_AVATARS = [
    { id: 'lion', emoji: '🦁', color: '#FFA500' },
    { id: 'panda', emoji: '🐼', color: '#2D3748' },
    { id: 'owl', emoji: '🦉', color: '#805AD5' },
    { id: 'fox', emoji: '🦊', color: '#ED8936' },
    { id: 'unicorn', emoji: '🦄', color: '#D53F8C' },
    { id: 'robot', emoji: '🤖', color: '#4299E1' },
];

export default function AddChildPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const [childCount, setChildCount] = useState(0);
    const [canAdd, setCanAdd] = useState(true);

    const [name, setName] = useState('');
    const [pin, setPin] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.id);

                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    const plan = parentData.subscription?.plan || 'free';
                    setSubscription(plan);

                    const childrenQuery = query(
                        collection(db, 'children'),
                        where('familyId', '==', parent.id)
                    );
                    const childrenSnapshot = await getDocs(childrenQuery);
                    const count = childrenSnapshot.size;
                    setChildCount(count);
                    setCanAdd(canAddChild(plan, count));
                }

                setLoading(false);
            } catch (err) {
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }
        if (pin.length !== 4) {
            setError('PIN must be 4 digits');
            return;
        }
        if (!canAddChild(subscription, childCount)) {
            setError('Child limit reached. Please upgrade to Premium.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // Pick a random avatar
            const avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

            const childData = {
                name: name.trim(),
                familyId,
                birthYear: new Date().getFullYear() - 8,
                ageGroup: '7-10',
                avatar: { presetId: avatar.id, backgroundColor: avatar.color },
                pin,
                starBalances: { growth: 0, weeklyEarned: 0, weeklyLimit: 100 },
                streaks: { currentStreak: 0, longestStreak: 0, lastCompletionDate: null },
                screenTimeLimits: { dailyLimitMinutes: 60, usedTodayMinutes: 0, bonusMinutesAvailable: 0, bonusUsedTodayMinutes: 0, lastReset: serverTimestamp() },
                achievements: [],
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp(),
                themeColor: avatar.color,
            };

            await addDoc(collection(db, 'children'), childData);

            router.push('/children');
        } catch (err) {
            console.error('Error adding child:', err);
            setError('Failed to add child. Please try again.');
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

    if (!canAdd) {
        const maxChildren = SUBSCRIPTION_PLANS[subscription].features.maxChildren;
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white/60 backdrop-blur-md border border-indigo-100 rounded-3xl p-8 w-full max-w-md shadow-lg text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Child Limit Reached</h2>
                    <p className="text-gray-600 mb-2">
                        You have {childCount} of {maxChildren} children on the Free plan.
                    </p>
                    <p className="text-gray-600 mb-6">
                        Upgrade to Premium for unlimited children!
                    </p>
                    <div className="space-y-3">
                        <Button
                            onClick={() => router.push('/subscriptions')}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        >
                            👑 Upgrade to Premium
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/children')}
                            className="w-full"
                        >
                            Back to Children
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white/60 backdrop-blur-md border border-indigo-100 rounded-3xl p-8 w-full max-w-md shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/children" className="text-gray-600 hover:text-gray-800 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">Add Child</h1>
                    <div className="w-6" />
                </div>

                {subscription === 'free' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-center">
                        <p className="text-sm text-amber-800">
                            📊 Slots: {childCount + 1}/{SUBSCRIPTION_PLANS.free.features.maxChildren}
                        </p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm text-gray-700 font-bold mb-2">Child&apos;s Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Enter name"
                        />
                    </div>

                    {/* PIN Input */}
                    <div>
                        <label className="block text-sm text-gray-700 font-bold mb-2">Set a 4-Digit PIN</label>
                        <p className="text-xs text-gray-500 mb-3">Your child will use this PIN to log in</p>
                        <div className="flex justify-center">
                            <PinInput
                                value={pin}
                                onChange={setPin}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleSubmit}
                        isLoading={submitting}
                        disabled={!name.trim() || pin.length !== 4}
                        className="w-full"
                    >
                        Add Child
                    </Button>
                </div>
            </div>
        </div>
    );
}

