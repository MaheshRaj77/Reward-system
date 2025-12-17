'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mobileAuthService } from '@/modules/auth/mobile-auth.service';

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
    const [countryCode] = useState('+91');
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

        if (!mobile || mobile.length < 10) {
            setError('Please enter a valid mobile number');
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
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
                {/* Mobile Background Image */}
                <div className="lg:hidden absolute inset-0 z-0">
                    <img
                        src="/images/disney-castle.png"
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/30" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    <div
                        className="rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md bg-[#F5E6D3]/70 lg:bg-[#F5E6D3]/95"
                        style={{
                            border: `4px solid ${colors.goldAccent}`,
                            boxShadow: `0 10px 40px rgba(74, 55, 40, 0.3), inset 0 2px 0 rgba(255,255,255,0.5)`,
                        }}
                    >
                        {/* Decorative corners */}
                        {[
                            { top: 2, left: 2 },
                            { top: 2, right: 2 },
                            { bottom: 2, left: 2 },
                            { bottom: 2, right: 2 }
                        ].map((pos, i) => (
                            <div
                                key={i}
                                className="absolute text-2xl opacity-50"
                                style={{
                                    color: colors.goldAccent,
                                    ...pos
                                }}
                            >
                                ✦
                            </div>
                        ))}

                        {/* Title */}
                        <div className="text-center mb-8">
                            <h1
                                className="text-3xl font-bold mb-2"
                                style={{
                                    color: colors.inkBrown,
                                    fontFamily: 'Georgia, serif',
                                    textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
                                }}
                            >
                                {step === 'MOBILE' ? 'Welcome Back' : 'Verify Magic Code'}
                            </h1>
                            <p style={{ color: colors.inkBrown, opacity: 0.8 }}>
                                {step === 'MOBILE'
                                    ? 'Enter your mobile number to begin'
                                    : `We sent a code to ${countryCode} ${mobile}`
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-xl px-4 py-3 text-sm text-center font-medium"
                                style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-4 rounded-xl px-4 py-3 text-sm text-center font-medium"
                                style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                                {successMessage}
                            </div>
                        )}

                        {step === 'MOBILE' ? (
                            /* MOBILE FORM */
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={countryCode}
                                            readOnly
                                            className="w-16 px-2 py-3 rounded-full border-2 outline-none text-center font-bold text-lg"
                                            style={inputStyle}
                                        />
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                            className={inputClassName}
                                            style={{
                                                ...inputStyle,
                                                fontSize: '1.2rem',
                                                letterSpacing: '1px'
                                            }}
                                            placeholder="Mobile Number"
                                            maxLength={10}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-full font-bold text-white text-lg transition-all 
                                             hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        backgroundColor: colors.disneyBlue,
                                        boxShadow: `0 4px 0 ${colors.royalPurple}`,
                                    }}
                                >
                                    {loading ? 'Sending Magic Code...' : 'Get Magic Code'}
                                </button>
                            </form>
                        ) : (
                            /* OTP FORM */
                            <form onSubmit={handleVerifyAndLogin} className="space-y-6">
                                <div className="py-2">
                                    <OTPInput value={otp} onChange={setOtp} />
                                </div>

                                <div className="text-center" style={{ color: colors.inkBrown }}>
                                    {canResend ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSendOTP()}
                                            className="font-bold hover:underline"
                                            style={{ color: colors.disneyBlue }}
                                        >
                                            Resend Code
                                        </button>
                                    ) : (
                                        <p className="text-sm opacity-80">
                                            Resend code in <span className="font-bold">{timer}s</span>
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="w-full py-4 rounded-full font-bold text-white text-lg transition-all 
                                             hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        backgroundColor: colors.disneyBlue,
                                        boxShadow: `0 4px 0 ${colors.royalPurple}`,
                                    }}
                                >
                                    {loading ? 'Verifying...' : 'Unlock Adventure'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('MOBILE');
                                        setOtp('');
                                        setError('');
                                    }}
                                    className="w-full text-sm font-medium hover:underline py-2"
                                    style={{ color: colors.inkBrown }}
                                >
                                    Change Mobile Number
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
