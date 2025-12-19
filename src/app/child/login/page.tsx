'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
    useChildLogin,
    ChildProfile,
    AVATAR_EMOJIS
} from '@/modules/children';

export default function ChildLogin() {
    const router = useRouter();
    const { loading, error, getChildrenByMobile, verifyAndLogin, clearError } = useChildLogin();

    const [step, setStep] = useState<'mobile' | 'child' | 'pin'>('mobile');
    const [mobileNumber, setMobileNumber] = useState('');
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
    const [pin, setPin] = useState('');
    const [localError, setLocalError] = useState('');

    const handleMobileSubmit = async () => {
        if (mobileNumber.length < 10) {
            setLocalError('Please enter a valid mobile number');
            return;
        }

        setLocalError('');
        const foundChildren = await getChildrenByMobile(mobileNumber);

        if (foundChildren.length > 0) {
            setChildren(foundChildren);
            setStep('child');
        }
    };

    const handleChildSelect = (child: ChildProfile) => {
        setSelectedChild(child);
        setStep('pin');
        setPin('');
        setLocalError('');
        clearError();
    };

    const handlePinInput = async (num: number | string) => {
        if (!selectedChild) return;

        if (num === 'back') {
            setPin(pin.slice(0, -1));
            setLocalError('');
        } else if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            // Auto-submit when 4 digits entered
            if (newPin.length === 4) {
                setLocalError('');
                const success = await verifyAndLogin(selectedChild, newPin);
                if (!success) {
                    setPin('');
                }
            }
        }
    };

    const displayError = localError || error;

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
                {/* Step: Enter Parent Mobile Number */}
                {step === 'mobile' && (
                    <div className="text-center">
                        <div className="text-6xl mb-4">👋</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Hi There!</h1>
                        <p className="text-gray-600 mb-8">Enter your parent&apos;s mobile number</p>

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">+91</span>
                            <input
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setMobileNumber(value);
                                    setLocalError('');
                                }}
                                placeholder="9876543210"
                                className="w-full pl-14 pr-6 py-4 text-center text-2xl font-bold tracking-wider bg-indigo-50 border-2 border-indigo-300 rounded-2xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                maxLength={10}
                            />
                        </div>

                        {displayError && (
                            <p className="text-red-600 mt-4 text-sm font-medium">{displayError}</p>
                        )}

                        <Button
                            onClick={handleMobileSubmit}
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
                                        style={{ backgroundColor: child.avatar?.backgroundColor || '#e0e7ff' }}
                                    >
                                        {AVATAR_EMOJIS[child.avatar?.presetId || ''] || '⭐'}
                                    </div>
                                    <p className="text-gray-800 font-semibold">{child.name}</p>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('mobile'); setMobileNumber(''); clearError(); }}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            ← Try Different Number
                        </button>
                    </div>
                )}

                {/* Step: Enter PIN */}
                {step === 'pin' && selectedChild && (
                    <div className="text-center">
                        <div
                            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-4 shadow-md"
                            style={{ backgroundColor: selectedChild.avatar?.backgroundColor || '#e0e7ff' }}
                        >
                            {AVATAR_EMOJIS[selectedChild.avatar?.presetId || ''] || '⭐'}
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

                        {displayError && (
                            <p className="text-red-600 mb-4 text-sm font-medium animate-shake">{displayError}</p>
                        )}

                        {/* Number Pad */}
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'back'].map((num, i) => (
                                <button
                                    key={i}
                                    onClick={() => num !== null && handlePinInput(num)}
                                    disabled={num === null || loading}
                                    className={`h-14 rounded-xl text-xl font-bold transition-all ${num === null
                                        ? 'invisible'
                                        : num === 'back'
                                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95 shadow-sm'
                                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {num === 'back' ? '⌫' : num}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('child'); setPin(''); setLocalError(''); clearError(); }}
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
