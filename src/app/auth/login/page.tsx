'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mobileAuthService } from '@/modules/auth/mobile-auth.service';
import {
    sortedCountryCodes as countryCodes,
    getCountryByCode,
    validatePhoneLength,
    getPhoneLengthHint,
    searchCountries
} from '@/modules/auth/country-codes';


// ============================================
// DISNEY STORYBOOK COLOR PALETTE
// Inspired by classic Disney movie aesthetics
// ============================================
const colors = {
    // Primary
    disneyBlue: '#4A90D9',       // Sky blue castle
    royalPurple: '#6B4C9A',      // Magical purple
    sunsetOrange: '#E8734A',     // Warm sunset
    enchantedTeal: '#2D9B8A',    // Forest green

    // Neutrals (Parchment/Storybook)
    parchment: '#F5E6D3',        // Old paper
    parchmentDark: '#E8D5BE',    // Aged paper
    inkBrown: '#4A3728',         // Ink color
    goldAccent: '#C9A227',       // Gold trim

    // Backgrounds
    skyGradientTop: '#87CEEB',   // Light sky
    skyGradientBottom: '#E0F4FF', // Horizon
};

import { CountryCodeSelector } from '@/components/auth/CountryCodeSelector';

// ============================================
// OTP INPUT COMPONENT
// ============================================
function OTPInput({
    value,
    onChange,
    length = 6
}: {
    value: string;
    onChange: (value: string) => void;
    length?: number;
}) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, digit: string) => {
        if (!/^\d*$/.test(digit)) return;

        const newValue = value.split('');
        newValue[index] = digit;
        const result = newValue.join('').slice(0, length);
        onChange(result);

        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange(pastedData);
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-11 h-12 text-center text-xl font-bold rounded-lg border-2 
                             outline-none transition-all"
                    style={{
                        backgroundColor: colors.parchment,
                        borderColor: colors.goldAccent,
                        color: colors.inkBrown,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// SPARKLE ANIMATION
// ============================================
function Sparkles() {
    const [sparkles, setSparkles] = useState<Array<{
        left: string;
        top: string;
        animationDelay: string;
        animationDuration: string;
        size: string;
    }>>([]);

    useEffect(() => {
        const newSparkles = Array.from({ length: 25 }).map(() => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
            size: `${8 + Math.random() * 8}px`
        }));
        setSparkles(newSparkles);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {sparkles.map((sparkle, i) => (
                <div
                    key={i}
                    className="absolute animate-pulse"
                    style={{
                        left: sparkle.left,
                        top: sparkle.top,
                        animationDelay: sparkle.animationDelay,
                        animationDuration: sparkle.animationDuration,
                    }}
                >
                    <span className="text-white/80" style={{ fontSize: sparkle.size }}>
                        ✦
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// MAIN LOGIN PAGE COMPONENT
// ============================================
export default function ParentLogin() {
    const router = useRouter();
    const [step, setStep] = useState<'MOBILE' | 'OTP'>('MOBILE');

    // Form State
    const [mobile, setMobile] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [otp, setOtp] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Timer State for OTP
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (step === 'OTP') {
            const interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step]);

    const handleSendOTP = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const validation = validatePhoneLength(countryCode, mobile);

        if (!mobile || !validation.valid) {
            setError(validation.message || 'Please enter a valid phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fullPhoneNumber = `${countryCode}${mobile}`;
            const response = await fetch('/api/otp/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
            });

            const data = await response.json();

            if (data.success) {
                setStep('OTP');
                setTimer(30);
                setCanResend(false);
                setSuccessMessage('OTP sent successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length !== 6) {
            setError('Please enter a 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fullPhoneNumber = `${countryCode}${mobile}`;

            // 1. Verify OTP via API
            const verifyResponse = await fetch('/api/otp/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: fullPhoneNumber, code: otp }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyData.success || !verifyData.valid) {
                setError(verifyData.error || 'Invalid OTP');
                setLoading(false);
                return;
            }

            // 2. Authenticate/Register User
            const authResult = await mobileAuthService.authenticateWithMobile(mobile);

            if (authResult.success) {
                setSuccessMessage('Verified! Redirecting...');
                router.push('/dashboard');
            } else {
                setError(authResult.error || 'Authentication failed');
                setLoading(false);
            }

        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        backgroundColor: colors.parchment,
        borderColor: colors.parchmentDark,
        color: colors.inkBrown,
    };

    const inputClassName = "w-full px-4 py-3 rounded-full border-2 outline-none transition-all placeholder:font-medium placeholder:text-[#4A3728]/70";

    return (
        <div
            className="min-h-screen flex"
            style={{ backgroundColor: colors.parchmentDark }}
        >
            {/* ============================================ */}
            {/* LEFT PANEL - Image */}
            {/* ============================================ */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="/images/disney-castle.png"
                        alt="Magical Disney Castle"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>

                <Sparkles />

                <div className="absolute bottom-0 left-0 right-0 p-12 text-center text-white z-10">
                    <h2
                        className="text-5xl font-bold mb-4"
                        style={{
                            fontFamily: 'Georgia, serif',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        }}
                    >
                        Pinmbo World
                    </h2>
                    <p className="text-xl opacity-90 font-medium text-shadow">
                        Where every good deed becomes a magical adventure ✨
                    </p>
                </div>
            </div>

            {/* ============================================ */}
            {/* RIGHT PANEL - Form */}
            {/* ============================================ */}
            {/* ============================================ */}
            {/* RIGHT PANEL - Form */}
            {/* ============================================ */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden bg-white">
                {/* Background gradient - Cleaner & Brighter */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-white to-purple-50" />

                {/* Subtle magical glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-yellow-100/40 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/40 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />

                {/* Mobile Background Image (keep for mobile) */}
                <div className="lg:hidden absolute inset-0 z-0 opacity-10">
                    <img
                        src="/images/disney-castle.png"
                        alt="Background"
                        className="w-full h-full object-cover grayscale"
                    />
                </div>

                <div className="w-full max-w-[440px] relative z-10 perspective-1000">
                    {/* Logo/Brand Section */}
                    <div className="text-center mb-10 lg:hidden">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 text-white transform rotate-3">
                            <span className="text-3xl">✨</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Pinmbo World</h2>
                    </div>

                    {/* Main Card */}
                    <div
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-white/50 relative hover:shadow-[0_20px_60px_-15px_rgba(74,144,217,0.15)] transition-shadow duration-500"
                    >
                        {/* Title */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-100 shadow-sm text-yellow-600 transform transition-transform hover:scale-110 duration-300">
                                {step === 'MOBILE' ? (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                )}
                            </div>
                            <h1
                                className="text-3xl font-bold mb-3 text-gray-900"
                                style={{
                                    fontFamily: 'serif',
                                }}
                            >
                                {step === 'MOBILE' ? 'Welcome Back' : 'Verification'}
                            </h1>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {step === 'MOBILE'
                                    ? 'Enter your mobile number to begin your magical journey'
                                    : (
                                        <>
                                            We sent a code to <span className="font-semibold text-gray-900">{countryCode} {mobile}</span>. Enter it below.
                                        </>
                                    )
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-2xl px-4 py-3 text-sm flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 animate-in fade-in slide-in-from-top-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-6 rounded-2xl px-4 py-3 text-sm flex items-start gap-3 bg-emerald-50 border border-emerald-100 text-emerald-600 animate-in fade-in slide-in-from-top-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {step === 'MOBILE' ? (
                            /* MOBILE FORM */
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-gray-500">
                                        Phone Number
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <CountryCodeSelector
                                            value={countryCode}
                                            onChange={(code) => {
                                                setCountryCode(code);
                                                setMobile('');
                                                setError('');
                                            }}
                                            colors={{
                                                parchment: '#F9FAFB', // gray-50
                                                parchmentDark: '#E5E7EB', // gray-200
                                                goldAccent: '#3B82F6', // blue-500
                                                inkBrown: '#1F2937', // gray-800
                                            }}
                                        />
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                const selectedCountry = getCountryByCode(countryCode);
                                                setMobile(digits.slice(0, selectedCountry.maxLength));
                                            }}
                                            className="flex-1 px-4 py-3 rounded-full border border-gray-200 bg-gray-50/50 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-lg tracking-wide placeholder:text-gray-300 font-medium"
                                            placeholder="Enter number"
                                            maxLength={getCountryByCode(countryCode).maxLength}
                                            autoFocus
                                        />
                                    </div>
                                    {mobile.length > 0 && (
                                        <p className="mt-2 text-xs text-right text-gray-400 font-medium">
                                            {(() => {
                                                const country = getCountryByCode(countryCode);
                                                return `${mobile.length} / ${country.maxLength}`;
                                            })()}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:opacity-90 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(79,70,229,0.4)]"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})`,
                                    }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Sending Code...
                                        </span>
                                    ) : 'Continue →'}
                                </button>

                                <p className="text-center text-xs pt-2 text-gray-400">
                                    By continuing, you agree to our Terms of Service
                                </p>
                            </form>
                        ) : (
                            /* OTP FORM */
                            <form onSubmit={handleVerifyAndLogin} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold mb-4 uppercase tracking-wider text-center text-gray-500">
                                        Enter 6-Digit Code
                                    </label>
                                    <OTPInput value={otp} onChange={setOtp} />
                                </div>

                                <div className="text-center py-2 text-gray-600">
                                    {canResend ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSendOTP()}
                                            className="text-sm font-semibold hover:text-blue-600 transition-colors"
                                        >
                                            Resend Code
                                        </button>
                                    ) : (
                                        <p className="text-sm opacity-60">
                                            Resend in <span className="font-bold">{timer}s</span>
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:opacity-90 hover:translate-y-[-2px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(79,70,229,0.4)]"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})`,
                                    }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Verifying...
                                        </span>
                                    ) : 'Verify & Continue →'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('MOBILE');
                                        setOtp('');
                                        setError('');
                                    }}
                                    className="w-full text-sm font-medium py-2 flex items-center justify-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Change Number
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer text */}
                    <p className="text-center text-xs mt-8 hidden lg:block text-gray-400 font-medium tracking-wide">
                        Secure login powered by Pinmbo ✦
                    </p>
                </div>
            </div>
        </div>
    );
}
