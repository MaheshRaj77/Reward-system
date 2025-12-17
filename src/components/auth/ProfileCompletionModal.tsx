'use client';

import { useState } from 'react';
import { useParentAuth } from '@/modules/parent';
import { profileService } from '@/modules/auth/profile.service';

// Email OTP verification is available but skipped for now
// Will be used in parent profile page for email verification
const REQUIRE_EMAIL_VERIFICATION = false;

export function ProfileCompletionModal() {
    const { user } = useParentAuth();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();

        // If verification not required, skip to profile update directly
        if (!REQUIRE_EMAIL_VERIFICATION) {
            await handleProfileUpdate();
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/email-otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.success) {
                setStep(2);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        setLoading(true);
        setError('');

        try {
            if (user) {
                const result = await profileService.updateProfile(user.uid, name, email);

                if (result.success) {
                    window.location.reload();
                } else {
                    setError(result.error || 'Failed to update profile');
                }
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Verify OTP
            const verifyRes = await fetch('/api/auth/email-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
                setError(verifyData.error || 'Invalid OTP');
                setLoading(false);
                return;
            }

            // 2. Update Profile
            await handleProfileUpdate();
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Complete Your Profile</h2>
                    <p className="text-gray-600">Please provide your details to continue</p>
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Parent Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="your@email.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : REQUIRE_EMAIL_VERIFICATION ? 'Verify Email' : 'Continue'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyAndUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP Sent to {email}</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                placeholder="123456"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Updating Profile...' : 'Complete Profile'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                            Change Email
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
