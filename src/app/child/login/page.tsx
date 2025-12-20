'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
    useChildLogin,
    ChildProfile,
    AVATAR_EMOJIS
} from '@/modules/children';
import { CountryCodeSelector } from '@/components/auth/CountryCodeSelector';
import { getCountryByCode } from '@/modules/auth/country-codes';

export default function ChildLogin() {
    const router = useRouter();
    const { loading, error, getChildrenByMobile, verifyAndLogin, clearError } = useChildLogin();

    const [step, setStep] = useState<'mobile' | 'child' | 'pin'>('mobile');
    const [countryCode, setCountryCode] = useState('+91');
    const [mobileNumber, setMobileNumber] = useState('');
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
    const [pin, setPin] = useState('');
    const [localError, setLocalError] = useState('');

    const handleMobileSubmit = async () => {
        const country = getCountryByCode(countryCode);

        if (mobileNumber.length < country.minLength) {
            setLocalError(`Please enter a valid mobile number (min ${country.minLength} digits)`);
            return;
        }

        setLocalError('');
        const fullNumber = `${countryCode}${mobileNumber}`;
        const foundChildren = await getChildrenByMobile(fullNumber);

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
        <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-sm border border-gray-100">
                {/* Step: Enter Parent Mobile Number */}
                {step === 'mobile' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">👋</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Hi There!</h1>
                        <p className="text-gray-500 mb-6">Enter your parent&apos;s mobile number</p>

                        <div className="flex gap-2 items-center">
                            <CountryCodeSelector
                                value={countryCode}
                                onChange={(code) => {
                                    setCountryCode(code);
                                    setMobileNumber('');
                                    setLocalError('');
                                }}
                                colors={{
                                    parchment: '#F9FAFB', // bg-gray-50
                                    parchmentDark: '#E5E7EB', // border-gray-200
                                    goldAccent: '#10B981', // emerald-500
                                    inkBrown: '#1F2937', // text-gray-800
                                }}
                            />
                            <input
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    const country = getCountryByCode(countryCode);
                                    setMobileNumber(value.slice(0, country.maxLength));
                                    setLocalError('');
                                }}
                                placeholder="9876543210"
                                className="flex-1 px-4 py-3.5 text-xl font-semibold tracking-wider bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                                maxLength={getCountryByCode(countryCode).maxLength}
                            />
                        </div>

                        {displayError && (
                            <p className="text-red-500 mt-3 text-sm">{displayError}</p>
                        )}

                        <Button
                            onClick={handleMobileSubmit}
                            isLoading={loading}
                            size="lg"
                            className="w-full mt-5 bg-emerald-500 hover:bg-emerald-600"
                        >
                            Continue →
                        </Button>

                        <button
                            onClick={() => router.push('/')}
                            className="mt-5 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            ← Back to Home
                        </button>
                    </div>
                )}

                {/* Step: Select Child */}
                {step === 'child' && (
                    <div className="text-center">
                        <div className="text-4xl mb-3">🌟</div>
                        <h1 className="text-xl font-bold text-gray-800 mb-2">Who&apos;s Here?</h1>
                        <p className="text-gray-500 mb-5">Choose your profile</p>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => handleChildSelect(child)}
                                    className="bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl p-4 transition-all"
                                >
                                    <div
                                        className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2"
                                        style={{ backgroundColor: child.avatar?.backgroundColor || '#e0f2fe' }}
                                    >
                                        {AVATAR_EMOJIS[child.avatar?.presetId || ''] || '⭐'}
                                    </div>
                                    <p className="text-gray-800 font-medium text-sm">{child.name}</p>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('mobile'); setMobileNumber(''); setCountryCode('+91'); clearError(); }}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                            ← Try Different Number
                        </button>
                    </div>
                )}

                {/* Step: Enter PIN */}
                {step === 'pin' && selectedChild && (
                    <div className="text-center">
                        <div
                            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3"
                            style={{ backgroundColor: selectedChild.avatar?.backgroundColor || '#e0f2fe' }}
                        >
                            {AVATAR_EMOJIS[selectedChild.avatar?.presetId || ''] || '⭐'}
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 mb-1">Hi {selectedChild.name}!</h1>
                        <p className="text-gray-500 mb-5">Enter your secret PIN</p>

                        {/* PIN Display */}
                        <div className="flex justify-center gap-3 mb-5">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${pin[i]
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    {pin[i] ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        {displayError && (
                            <p className="text-red-500 mb-4 text-sm">{displayError}</p>
                        )}

                        {/* Number Pad */}
                        <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'back'].map((num, i) => (
                                <button
                                    key={i}
                                    onClick={() => num !== null && handlePinInput(num)}
                                    disabled={num === null || loading}
                                    className={`h-12 rounded-xl text-lg font-semibold transition-all ${num === null
                                        ? 'invisible'
                                        : num === 'back'
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95'
                                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {num === 'back' ? '⌫' : num}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { setStep('child'); setPin(''); setLocalError(''); clearError(); }}
                            className="mt-5 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            ← Pick Someone Else
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
