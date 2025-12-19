'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { Plus, Star, ChevronRight, UserPlus } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    profileImageBase64?: string;
    starBalances: { growth: number };
    streaks: { currentStreak: number; longestStreak: number };
    ageGroup: string;
}

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

    useEffect(() => {
        const loadChildren = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                const familyId = parent.id;

                const q = query(
                    collection(db, 'children'),
                    where('familyId', '==', familyId)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const childrenData: ChildData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        childrenData.push({
                            id: doc.id,
                            name: data.name,
                            avatar: data.avatar,
                            profileImageBase64: data.profileImageBase64,
                            starBalances: data.starBalances || { growth: 0 },
                            streaks: data.streaks || { currentStreak: 0, longestStreak: 0 },
                            ageGroup: data.ageGroup,
                        });
                    });
                    setChildren(childrenData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                console.error('Error loading children:', err);
                setLoading(false);
            }
        };

        loadChildren();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Calculate totals
    const totalStars = children.reduce((acc, c) => acc + (c.starBalances?.growth || 0), 0);
    const bestStreak = Math.max(...children.map(c => c.streaks?.currentStreak || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">Children</h1>
                    <Link href="/children/add">
                        <Button size="sm">
                            <Plus size={16} className="mr-1" />
                            Add Child
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                        <div className="text-2xl font-bold text-gray-900">{children.length}</div>
                        <div className="text-xs text-gray-500 mt-1">Children</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Star size={18} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-2xl font-bold text-gray-900">{totalStars}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Total Stars</div>
                    </div>
                </div>

                {/* Children List */}
                {children.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-4xl">👨‍👩‍</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No children yet</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            Add your first child to start managing tasks and rewards for your family.
                        </p>
                        <Link href="/children/add">
                            <Button>
                                <UserPlus size={18} className="mr-2" />
                                Add Your First Child
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {children.map((child) => (
                            <Link key={child.id} href={`/children/${child.id}`}>
                                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        {child.profileImageBase64 ? (
                                            <img
                                                src={child.profileImageBase64}
                                                alt={child.name}
                                                className="w-14 h-14 rounded-2xl object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-600"
                                                style={{ backgroundColor: child.avatar?.backgroundColor || '#e0e7ff' }}
                                            >
                                                {child.name?.charAt(0).toUpperCase() || 'C'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-gray-900 truncate">{child.name}</h3>
                                                <Badge className="bg-gray-100 text-gray-600 text-xs">
                                                    {AGE_GROUP_LABELS[child.ageGroup] || child.ageGroup}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1 text-yellow-600">
                                                    <Star size={14} className="fill-yellow-500" />
                                                    <span className="font-semibold">{child.starBalances?.growth || 0}</span>
                                                    <span className="text-gray-400">stars</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Quick Add Button - Fixed at bottom on mobile */}
                {children.length > 0 && (
                    <div className="fixed bottom-6 right-6 lg:hidden">
                        <Link href="/children/add">
                            <button className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors">
                                <Plus size={24} />
                            </button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
