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

// ============================================
// COUNTRY CODE SELECTOR COMPONENT
// ============================================
function CountryCodeSelector({
    value,
    onChange,
    colors,
}: {
    value: string;
    onChange: (code: string) => void;
    colors: {
        parchment: string;
        parchmentDark: string;
        goldAccent: string;
        inkBrown: string;
    };
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedCountry = countryCodes.find(c => c.code === value) || countryCodes[0];

    const filteredCountries = searchCountries(search);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <>
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-full border-2 outline-none transition-all hover:border-[#C9A227] min-w-[90px] justify-center"
                    style={{
                        backgroundColor: colors.parchment,
                        borderColor: isOpen ? colors.goldAccent : colors.parchmentDark,
                        color: colors.inkBrown,
                    }}
                >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="font-bold text-sm">{selectedCountry.code}</span>
                    <svg
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 mt-2 w-72 rounded-2xl border-2 shadow-2xl overflow-hidden"
                    style={{
                        backgroundColor: colors.parchment,
                        borderColor: colors.goldAccent,
                        zIndex: 9999,
                    }}
                >
                    {/* Search Input */}
                    <div className="p-3 border-b-2" style={{ borderColor: colors.parchmentDark }}>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: colors.inkBrown }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, code, or ISO..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 outline-none text-sm transition-all focus:border-[#C9A227]"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: colors.parchmentDark,
                                    color: colors.inkBrown,
                                }}
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country, index) => (
                                <button
                                    key={`${country.code}-${country.iso2}`}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left group"
                                    style={{
                                        color: colors.inkBrown,
                                        borderBottom: index < filteredCountries.length - 1 ? `1px solid ${colors.parchmentDark}40` : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.parchmentDark;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={() => {
                                        onChange(country.code);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span className="text-2xl">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-semibold block truncate">{country.country}</span>
                                        {country.iso2 && (
                                            <span className="text-xs opacity-50">{country.iso2}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold px-2 py-1 rounded-md" style={{ backgroundColor: `${colors.goldAccent}20`, color: colors.inkBrown }}>
                                        {country.code}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-sm text-center" style={{ color: colors.inkBrown }}>
                                <span className="opacity-60">No countries found for &quot;</span>
                                <span className="font-semibold">{search}</span>
                                <span className="opacity-60">&quot;</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

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
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#F5E6D3] via-[#FFF8F0] to-[#E8D5BE]" />

                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${colors.goldAccent} 0%, transparent 70%)` }} />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${colors.disneyBlue} 0%, transparent 70%)` }} />

                {/* Mobile Background Image */}
                <div className="lg:hidden absolute inset-0 z-0">
                    <img
                        src="/images/disney-castle.png"
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/90 to-white/95" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    {/* Logo/Brand Section */}
                    <div className="text-center mb-8 lg:hidden">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})` }}>
                            <span className="text-3xl">✨</span>
                        </div>
                        <h2 className="text-2xl font-bold" style={{ color: colors.inkBrown, fontFamily: 'Georgia, serif' }}>Pinmbo World</h2>
                    </div>

                    {/* Main Card */}
                    <div
                        className="rounded-3xl p-8 relative overflow-hidden"
                        style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 25px 50px -12px rgba(74, 55, 40, 0.15), 0 0 0 1px rgba(201, 162, 39, 0.2)',
                        }}
                    >
                        {/* Accent line at top */}
                        <div className="absolute top-0 left-8 right-8 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${colors.goldAccent}, ${colors.disneyBlue}, ${colors.royalPurple})` }} />

                        {/* Title */}
                        <div className="text-center mb-8 pt-2">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: `linear-gradient(135deg, ${colors.goldAccent}20, ${colors.goldAccent}40)` }}>
                                {step === 'MOBILE' ? (
                                    <svg className="w-7 h-7" fill="none" stroke={colors.goldAccent} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-7 h-7" fill="none" stroke={colors.goldAccent} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                )}
                            </div>
                            <h1
                                className="text-2xl font-bold mb-2"
                                style={{
                                    color: colors.inkBrown,
                                    fontFamily: 'Georgia, serif',
                                }}
                            >
                                {step === 'MOBILE' ? 'Welcome Back!' : 'Enter Verification Code'}
                            </h1>
                            <p className="text-sm" style={{ color: colors.inkBrown, opacity: 0.7 }}>
                                {step === 'MOBILE'
                                    ? 'Sign in with your phone number'
                                    : (
                                        <>
                                            Code sent to <span className="font-semibold">{countryCode} {mobile}</span>
                                        </>
                                    )
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="#DC2626" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span style={{ color: '#991B1B' }}>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-5 rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <svg className="w-5 h-5 flex-shrink-0" fill="#16A34A" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span style={{ color: '#065F46' }}>{successMessage}</span>
                            </div>
                        )}

                        {step === 'MOBILE' ? (
                            /* MOBILE FORM */
                            <form onSubmit={handleSendOTP} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: colors.inkBrown, opacity: 0.6 }}>
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
                                            colors={colors}
                                        />
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                const selectedCountry = getCountryByCode(countryCode);
                                                setMobile(digits.slice(0, selectedCountry.maxLength));
                                            }}
                                            className="flex-1 px-4 py-3.5 rounded-xl border-2 outline-none transition-all focus:border-[#C9A227] text-lg tracking-wide"
                                            style={{
                                                backgroundColor: 'white',
                                                borderColor: '#E5E7EB',
                                                color: colors.inkBrown,
                                            }}
                                            placeholder="Enter number"
                                            maxLength={getCountryByCode(countryCode).maxLength}
                                            autoFocus
                                        />
                                    </div>
                                    {mobile.length > 0 && (
                                        <p className="mt-2 text-xs text-right" style={{ color: colors.inkBrown, opacity: 0.5 }}>
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
                                    className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})`,
                                        boxShadow: '0 4px 14px rgba(74, 144, 217, 0.4)',
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

                                <p className="text-center text-xs pt-2" style={{ color: colors.inkBrown, opacity: 0.5 }}>
                                    By continuing, you agree to our Terms of Service
                                </p>
                            </form>
                        ) : (
                            /* OTP FORM */
                            <form onSubmit={handleVerifyAndLogin} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold mb-3 uppercase tracking-wide text-center" style={{ color: colors.inkBrown, opacity: 0.6 }}>
                                        6-Digit Code
                                    </label>
                                    <OTPInput value={otp} onChange={setOtp} />
                                </div>

                                <div className="text-center py-2" style={{ color: colors.inkBrown }}>
                                    {canResend ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSendOTP()}
                                            className="text-sm font-semibold hover:underline"
                                            style={{ color: colors.disneyBlue }}
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
                                    className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.disneyBlue}, ${colors.royalPurple})`,
                                        boxShadow: '0 4px 14px rgba(74, 144, 217, 0.4)',
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
                                    className="w-full text-sm font-medium py-2 flex items-center justify-center gap-1"
                                    style={{ color: colors.inkBrown, opacity: 0.7 }}
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
                    <p className="text-center text-xs mt-6 hidden lg:block" style={{ color: colors.inkBrown, opacity: 0.4 }}>
                        Secure login powered by Pinmbo ✦
                    </p>
                </div>
            </div>
        </div>
    );
}
