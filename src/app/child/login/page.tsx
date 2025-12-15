'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    pin: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function ChildLogin() {
    const router = useRouter();
    const [step, setStep] = useState<'code' | 'child' | 'pin'>('code');
    const [familyCode, setFamilyCode] = useState('');
    const [children, setChildren] = useState<ChildData[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCodeSubmit = async () => {
        if (familyCode.length < 6) {
            setError('Please enter your family code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Find family by code
            const familiesQuery = query(collection(db, 'families'));
            const familiesSnapshot = await getDocs(familiesQuery);

            let familyId = '';
            familiesSnapshot.forEach((doc) => {
                const docId = doc.id.replace('family_', '').slice(0, 8).toUpperCase();
                if (docId === familyCode.toUpperCase()) {
                    familyId = doc.id;
                }
            });

            if (!familyId) {
                setError('Family code not found. Ask your parent for the correct code.');
                setLoading(false);
                return;
            }

            // Get children in this family
            const childrenQuery = query(
                collection(db, 'children'),
                where('familyId', '==', familyId)
            );
            const childrenSnapshot = await getDocs(childrenQuery);

            const childrenData: ChildData[] = [];
            childrenSnapshot.forEach((doc) => {
                const data = doc.data();
                childrenData.push({
                    id: doc.id,
                    name: data.name,
                    avatar: data.avatar,
                    pin: data.pin,
                });
            });

            if (childrenData.length === 0) {
                setError('No children found in this family yet.');
                setLoading(false);
                return;
            }

            setChildren(childrenData);
            setStep('child');
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChildSelect = (child: ChildData) => {
        setSelectedChild(child);
        setStep('pin');
        setPin('');
        setError('');
    };

    const handlePinSubmit = () => {
        if (!selectedChild) return;

        if (pin === selectedChild.pin) {
            // Store session
            localStorage.setItem('childSession', JSON.stringify({
                childId: selectedChild.id,
                name: selectedChild.name,
                avatar: selectedChild.avatar,
            }));
            router.push(`/child/${selectedChild.id}/home`);
        } else {
            setError('Wrong PIN. Try again!');
            setPin('');
        }
    };

    const handlePinInput = (num: number | string) => {
        if (num === 'back') {
            setPin(pin.slice(0, -1));
        } else if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                setTimeout(() => {
                    if (selectedChild && newPin === selectedChild.pin) {
                        localStorage.setItem('childSession', JSON.stringify({
                            childId: selectedChild.id,
                            name: selectedChild.name,
                            avatar: selectedChild.avatar,
                        }));
                        router.push(`/child/${selectedChild.id}/home`);
                    } else {
                        setError('Wrong PIN. Try again!');
                        setPin('');
                    }
                }, 200);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>⭐</div>
                <div className="absolute top-20 right-20 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>🌈</div>
                <div className="absolute bottom-20 left-20 text-5xl animate-bounce" style={{ animationDelay: '1s' }}>🎈</div>
                <div className="absolute bottom-10 right-10 text-6xl animate-bounce" style={{ animationDelay: '1.5s' }}>🎉</div>
            </div>

            <div className="bg-white/70 backdrop-blur-md border-2 border-indigo-200 rounded-3xl p-8 w-full max-w-md relative shadow-lg">
                {/* Step: Enter Family Code */}
                {step === 'code' && (
                    <div className="text-center">
                        <div className="text-6xl mb-4">👋</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Hi There!</h1>
                        <p className="text-gray-600 mb-8">Enter your family code to start</p>

                        <input
                            type="text"
                            value={familyCode}
                            onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                            placeholder="FAMILY CODE"
                            className="w-full px-6 py-4 text-center text-2xl font-bold tracking-[0.3em] bg-indigo-50 border-2 border-indigo-300 rounded-2xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                            maxLength={8}
                        />

                        {error && (
                            <p className="text-red-600 mt-4 text-sm font-medium">{error}</p>
                        )}

                        <Button
                            onClick={handleCodeSubmit}
                            isLoading={loading}
                            size="lg"
                            className="w-full mt-6"
                        >
                            Continue →
                        </Button>

                        <button
                            onClick={() => router.push('/')}
                            className="mt-6 text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            ← Back to Home
                        </button>
                    </div>
                )}

                {/* Step: Select Child */}
                {step === 'child' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🌟</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Who&apos;s Playing?</h1>
                        <p className="text-gray-600 mb-6">Tap your picture!</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => handleChildSelect(child)}
                                    className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 transition-all hover:scale-105 shadow-sm"
                                >
                                    <div
                                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-3 shadow-md"
                                        style={{ backgroundColor: child.avatar.backgroundColor }}
                                    >
                                        {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                    </div>
                                    <p className="text-gray-800 font-semibold">{child.name}</p>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('code'); setFamilyCode(''); }}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            ← Try Different Code
                        </button>
                    </div>
                )}

                {/* Step: Enter PIN */}
                {step === 'pin' && selectedChild && (
                    <div className="text-center">
                        <div
                            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4 shadow-md"
                            style={{ backgroundColor: selectedChild.avatar.backgroundColor }}
                        >
                            {AVATAR_EMOJIS[selectedChild.avatar.presetId] || '⭐'}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Hi {selectedChild.name}!</h1>
                        <p className="text-gray-600 mb-6">Enter your secret PIN</p>

                        {/* PIN Display */}
                        <div className="flex justify-center gap-3 mb-6">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${pin[i]
                                            ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                                            : 'border-gray-300 bg-white'
                                        }`}
                                >
                                    {pin[i] ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        {error && (
                            <p className="text-red-600 mb-4 text-sm font-medium animate-shake">{error}</p>
                        )}

                        {/* Number Pad */}
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'back'].map((num, i) => (
                                <button
                                    key={i}
                                    onClick={() => num !== null && handlePinInput(num)}
                                    disabled={num === null}
                                    className={`h-14 rounded-xl text-xl font-bold transition-all ${num === null
                                            ? 'invisible'
                                            : num === 'back'
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
                                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 shadow-sm'
                                        }`}
                                >
                                    {num === 'back' ? '⌫' : num}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('child'); setPin(''); setError(''); }}
                            className="mt-6 text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            ← Pick Someone Else
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
