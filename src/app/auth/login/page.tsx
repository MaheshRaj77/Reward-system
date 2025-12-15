'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function ParentLogin() {
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        familyName: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegister) {
                const { registerParent } = await import('@/lib/auth/parent-auth');
                const result = await registerParent({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    familyName: formData.familyName,
                });

                if (result.success) {
                    router.push('/dashboard');
                } else {
                    setError(result.error || 'Registration failed');
                }
            } else {
                const { loginParent } = await import('@/lib/auth/parent-auth');
                const result = await loginParent(formData.email, formData.password);

                if (result.success) {
                    router.push('/dashboard');
                } else {
                    setError(result.error || 'Login failed');
                }
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');

        try {
            const { loginWithGoogle } = await import('@/lib/auth/parent-auth');
            const result = await loginWithGoogle();

            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Google login failed');
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResetSuccess(false);

        try {
            const { resetParentPassword } = await import('@/lib/auth/parent-auth');
            const result = await resetParentPassword(resetEmail);

            if (result.success) {
                setResetSuccess(true);
                setResetEmail('');
                setTimeout(() => {
                    setShowReset(false);
                    setResetSuccess(false);
                }, 3000);
            } else {
                setError(result.error || 'Password reset failed');
            }
        } catch (err) {
            setError('Password reset failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            {/* Decorative */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-indigo-200 rounded-3xl p-8 w-full max-w-md relative shadow-lg">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                            <span className="text-3xl">⭐</span>
                        </div>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {showReset ? 'Reset Password' : isRegister ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {showReset ? 'Enter your email to receive a reset link' : isRegister ? 'Start rewarding your children today' : 'Sign in to your parent account'}
                    </p>
                </div>

                {showReset ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-700 font-medium mb-2">Email Address</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {resetSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
                                ✓ Reset email sent! Check your inbox for the reset link.
                            </div>
                        )}

                        <Button type="submit" isLoading={loading} className="w-full">
                            Send Reset Link
                        </Button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowReset(false);
                                setError('');
                                setResetEmail('');
                            }}
                            className="w-full text-indigo-600 hover:text-indigo-700 text-sm transition-colors font-medium"
                        >
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <>
                        {/* Google Sign In */}
                        <Button
                            variant="secondary"
                            onClick={handleGoogleLogin}
                            isLoading={googleLoading}
                            className="w-full mb-4 bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>

                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-gray-500 text-sm">or</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isRegister && (
                                <>
                                    <div>
                                        <label className="block text-sm text-gray-700 font-medium mb-2">Your Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="John Smith"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 font-medium mb-2">Family Name</label>
                                        <input
                                            type="text"
                                            value={formData.familyName}
                                            onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="The Smiths"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm text-gray-700 font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-700 font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" isLoading={loading} className="w-full">
                                {isRegister ? 'Create Account' : 'Sign In'}
                            </Button>
                        </form>

                        <div className="mt-6 space-y-3 text-center">
                            <button
                                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                                className="text-indigo-600 hover:text-indigo-700 text-sm transition-colors block w-full font-medium"
                            >
                                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                            </button>
                            {!isRegister && (
                                <button
                                    onClick={() => setShowReset(true)}
                                    className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <Link href="/child/login" className="text-gray-600 hover:text-gray-800 text-sm transition-colors">
                                👶 I&apos;m a child → Log in here
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
