'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuthService } from '@/modules/admin/auth.service';
import { Button } from '@/components/ui';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const success = AdminAuthService.login(password);
        if (success) {
            router.push('/admin/dashboard');
        } else {
            setError('Invalid password. Access denied.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
                    {/* Back to Home Link */}
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors mb-6"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </a>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-4">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                        <p className="text-gray-400 mt-2 text-center">Enter your secure password to continue</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base"
                            isLoading={loading}
                        >
                            Access Dashboard
                        </Button>

                        <div className="text-center">
                            <p className="text-xs text-gray-600">Secure Environment • Monitoring Active</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
