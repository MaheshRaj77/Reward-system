'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, doc, updateDoc, arrayUnion, serverTimestamp, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { canAddChild, SUBSCRIPTION_PLANS } from '@/lib/constants/subscription';
import type { SubscriptionPlan } from '@/lib/constants/subscription';

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

const AGE_GROUP_LABELS: Record<string, string> = {
    '4-6': 'Little Explorer',
    '7-10': 'Rising Star',
    '11-14': 'Teen Achiever',
    '15+': 'Young Adult',
};

export default function AddChildPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');

    // Subscription state
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const [childCount, setChildCount] = useState(0);
    const [canAdd, setCanAdd] = useState(true);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        birthYear: new Date().getFullYear() - 8,
        avatar: AVATARS[0],
        pin: '',
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

                setFamilyId(parent.familyId);

                // Load subscription
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    const plan = parentData.subscription?.plan || 'free';
                    setSubscription(plan);

                    // Count existing children
                    const childrenQuery = query(
                        collection(db, 'children'),
                        where('familyId', '==', parent.familyId)
                    );
                    const childrenSnapshot = await getDocs(childrenQuery);
                    const count = childrenSnapshot.size;
                    setChildCount(count);

                    // Check if can add
                    setCanAdd(canAddChild(plan, count));
                }

                setLoading(false);
            } catch (err) {
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    const calculateAgeGroup = (birthYear: number) => {
        const age = new Date().getFullYear() - birthYear;
        if (age <= 6) return '4-6';
        if (age <= 10) return '7-10';
        if (age <= 14) return '11-14';
        return '15+';
    };

    const handleSubmit = async () => {
        if (formData.pin.length !== 4) {
            setError('PIN must be 4 digits');
            return;
        }

        // Double-check subscription limit
        if (!canAddChild(subscription, childCount)) {
            setError('Child limit reached. Please upgrade to Premium.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const ageGroup = calculateAgeGroup(formData.birthYear);

            const childData = {
                name: formData.name,
                familyId,
                birthYear: formData.birthYear,
                ageGroup,
                avatar: { presetId: formData.avatar.id, backgroundColor: formData.avatar.color },
                pin: formData.pin,
                starBalances: { growth: 0, weeklyEarned: 0, weeklyLimit: 100 },
                streaks: { currentStreak: 0, longestStreak: 0, lastCompletionDate: null },
                screenTimeLimits: { dailyLimitMinutes: 60, usedTodayMinutes: 0, bonusMinutesAvailable: 0, bonusUsedTodayMinutes: 0, lastReset: serverTimestamp() },
                achievements: [],
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp(),
                themeColor: formData.avatar.color,
            };

            const docRef = await addDoc(collection(db, 'children'), childData);
            await updateDoc(doc(db, 'families', familyId), { childIds: arrayUnion(docRef.id) });

            router.push('/children');
        } catch (err) {
            setError('Failed to add child. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePinInput = (num: number | string) => {
        if (num === 'back') {
            setFormData({ ...formData, pin: formData.pin.slice(0, -1) });
        } else if (formData.pin.length < 4) {
            setFormData({ ...formData, pin: formData.pin + num });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Show upgrade prompt if child limit reached
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
                <div className="flex items-center justify-between mb-6">
                    <Link href="/children" className="text-gray-600 hover:text-gray-800 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">Add Child</h1>
                    <div className="w-6" />
                </div>

                {/* Subscription info */}
                {subscription === 'free' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                        <p className="text-sm text-amber-800">
                            📊 Slots: {childCount + 1}/{SUBSCRIPTION_PLANS.free.features.maxChildren}
                        </p>
                    </div>
                )}

                {/* Step indicators */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                    ))}
                </div>

                {/* Step 1: Name & Age */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">👶</div>
                            <h2 className="text-lg font-semibold text-gray-800">Basic Info</h2>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-2">Child&apos;s Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Enter name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-2">Birth Year</label>
                            <select
                                value={formData.birthYear}
                                onChange={e => setFormData({ ...formData, birthYear: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 3 - i).map(year => (
                                    <option key={year} value={year} className="bg-white">{year}</option>
                                ))}
                            </select>
                            <p className="text-sm text-indigo-600 font-medium mt-2">
                                Age group: {AGE_GROUP_LABELS[calculateAgeGroup(formData.birthYear)]}
                            </p>
                        </div>

                        <Button onClick={() => formData.name.trim() && setStep(2)} className="w-full" disabled={!formData.name.trim()}>
                            Continue
                        </Button>
                    </div>
                )}

                {/* Step 2: Avatar */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Choose an Avatar</h2>
                            <p className="text-gray-600 text-sm">Pick one for {formData.name}</p>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {AVATARS.map(avatar => (
                                <button
                                    key={avatar.id}
                                    onClick={() => setFormData({ ...formData, avatar })}
                                    className={`p-4 rounded-xl text-3xl transition-all ${formData.avatar.id === avatar.id
                                        ? 'ring-2 ring-indigo-500 scale-110 bg-indigo-50'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    {avatar.emoji}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
                            <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
                        </div>
                    </div>
                )}

                {/* Step 3: PIN */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <div
                                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4 shadow-md"
                                style={{ backgroundColor: formData.avatar.color }}
                            >
                                {formData.avatar.emoji}
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800">Set a PIN</h2>
                            <p className="text-gray-600 text-sm">{formData.name} will use this to log in</p>
                        </div>

                        {/* PIN Display */}
                        <div className="flex justify-center gap-3 mb-4">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${formData.pin[i] ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-300 bg-white'
                                        }`}
                                >
                                    {formData.pin[i] ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        {/* Number Pad */}
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'back'].map((num, i) => (
                                <button
                                    key={i}
                                    onClick={() => num !== null && handlePinInput(num)}
                                    disabled={num === null}
                                    className={`h-12 rounded-xl text-lg font-bold transition-all ${num === null
                                        ? 'invisible'
                                        : num === 'back'
                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        }`}
                                >
                                    {num === 'back' ? '⌫' : num}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Back</Button>
                            <Button onClick={handleSubmit} isLoading={submitting} disabled={formData.pin.length !== 4} className="flex-1">
                                Add {formData.name}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
