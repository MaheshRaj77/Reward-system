'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { PWAProvider } from '@/components/pwa-provider';
import { usePWA } from '@/lib/hooks/use-pwa';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const AGE_GROUP_LABELS: Record<string, string> = {
    '4-6': 'Little Explorer',
    '7-10': 'Rising Star',
    '11-14': 'Teen Achiever',
    '15+': 'Young Adult',
};

export default function ChildrenPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [children, setChildren] = useState<ChildData[]>([]);
    const [familyCode, setFamilyCode] = useState('');
    const { saveFamilyCode, cacheChildren, getCachedChildren } = usePWA();

    useEffect(() => {
        const loadChildren = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                const code = parent.familyId.replace('family_', '').slice(0, 8).toUpperCase();
                setFamilyCode(code);
                
                // Save family code to PWA storage (IndexedDB)
                await saveFamilyCode(code, parent.familyId);

                const q = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.familyId)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const childrenData: ChildData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        childrenData.push({
                            id: doc.id,
                            name: data.name,
                            avatar: data.avatar,
                            starBalances: data.starBalances,
                            streaks: data.streaks,
                            ageGroup: data.ageGroup,
                        });
                    });
                    setChildren(childrenData);
                    
                    // Cache children data to IndexedDB for offline access
                    cacheChildren(childrenData).catch((err) => {
                        console.log('Failed to cache children:', err);
                    });
                    
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                console.error('Error loading children:', err);
                
                // Try to load from cache if online loading fails
                try {
                    const cachedData = await getCachedChildren();
                    if (cachedData && cachedData.length > 0) {
                        setChildren(cachedData);
                    }
                } catch (cacheErr) {
                    console.log('No cached children available');
                }
                
                setLoading(false);
            }
        };

        loadChildren();
    }, [router, saveFamilyCode, cacheChildren, getCachedChildren]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <PWAProvider showBanner={true} showButtonInHeader={false}>
            <ChildrenPageContent
                loading={loading}
                children={children}
                familyCode={familyCode}
            />
        </PWAProvider>
    );
}

function ChildrenPageContent({
    loading,
    children,
    familyCode,
}: {
    loading: boolean;
    children: ChildData[];
    familyCode: string;
}) {
    const { canInstall, installApp } = usePWA();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">👨‍👩‍👧‍👦 Children</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {canInstall && (
                            <button
                                onClick={installApp}
                                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2"
                                title="Install app on device"
                            >
                                <span>📱</span>
                                Install App
                            </button>
                        )}
                        <Link href="/children/add">
                            <Button size="sm">+ Add Child</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Family Code */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5 mb-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <h3 className="font-semibold text-gray-800">Family Code</h3>
                            <p className="text-sm text-gray-600">Share with children - they use this to log in</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-indigo-200">
                            <p className="text-2xl font-bold text-gray-800 tracking-[0.3em] font-mono">{familyCode}</p>
                        </div>
                    </div>
                </div>

                {children.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">👶</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Children Yet</h3>
                        <p className="text-gray-600 mb-6">Add your first child to get started with the reward system.</p>
                        <Link href="/children/add">
                            <Button>Add a Child</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {children.map((child) => {
                            const totalStars = child.starBalances.growth || 0;

                            return (
                                <Link key={child.id} href={`/children/${child.id}`}>
                                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-5 hover:bg-white/80 hover:border-indigo-200 transition-all cursor-pointer group shadow-sm">
                                        <div className="flex items-start gap-5">
                                            <div
                                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform"
                                                style={{ backgroundColor: child.avatar.backgroundColor }}
                                            >
                                                {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-bold text-lg text-gray-800">{child.name}</h3>
                                                    <Badge>{AGE_GROUP_LABELS[child.ageGroup] || child.ageGroup}</Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-amber-600">{totalStars}</div>
                                                        <div className="text-xs text-gray-600">⭐ Stars</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-orange-600">{child.streaks.currentStreak}</div>
                                                        <div className="text-xs text-gray-600">🔥 Streak</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
