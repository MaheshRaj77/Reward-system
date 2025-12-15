'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES, AGE_GROUPS } from '@/lib/constants';

interface ChildData {
    id: string;
    name: string;
    ageGroup: keyof typeof AGE_GROUPS;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number; fun: number };
    streaks: { currentStreak: number; longestStreak: number };
    trustLevel: number;
}

interface TaskData {
    id: string;
    title: string;
    description?: string;
    category: keyof typeof TASK_CATEGORIES;
    starType: 'growth' | 'fun';
    starValue: number;
    proofRequired: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function ChildHome() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;

    const [child, setChild] = useState<ChildData | null>(null);
    const [tasks, setTasks] = useState<TaskData[]>([]);
    const [completingTask, setCompletingTask] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        const loadChildAndTasks = async () => {
            try {
                // Load child data
                const childDoc = await getDoc(doc(db, 'children', childId));
                if (!childDoc.exists()) {
                    router.push('/child/login');
                    return;
                }

                const childData = childDoc.data();
                setChild({
                    id: childDoc.id,
                    name: childData.name,
                    ageGroup: childData.ageGroup,
                    avatar: childData.avatar,
                    starBalances: childData.starBalances,
                    streaks: childData.streaks,
                    trustLevel: childData.trustLevel,
                });

                // Load tasks assigned to this child
                const q = query(
                    collection(db, 'tasks'),
                    where('assignedChildIds', 'array-contains', childId),
                    where('isActive', '==', true)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const tasksData: TaskData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        tasksData.push({
                            id: doc.id,
                            title: data.title,
                            description: data.description,
                            category: data.category,
                            starType: data.starType,
                            starValue: data.starValue,
                            proofRequired: data.proofRequired || 'none',
                        });
                    });
                    setTasks(tasksData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadChildAndTasks();
    }, [childId, router]);

    const handleCompleteTask = async (task: TaskData) => {
        setCompletingTask(task.id);

        try {
            // Create task completion
            await addDoc(collection(db, 'taskCompletions'), {
                taskId: task.id,
                childId,
                familyId: child?.id ? `family_${child.id.split('_')[0]}` : '',
                status: child?.trustLevel && child.trustLevel >= 3 ? 'auto-approved' : 'pending',
                completedAt: serverTimestamp(),
                starsAwarded: task.starValue,
                starType: task.starType,
            });

            // Show celebration
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 2000);
        } catch (err) {
            console.error('Error completing task:', err);
        } finally {
            setCompletingTask(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!child) {
        return null;
    }

    const ageConfig = AGE_GROUPS[child.ageGroup];
    const isSimpleMode = child.ageGroup === '4-6';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Celebration overlay */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="text-center animate-bounce">
                        <div className="text-8xl mb-4">🎉</div>
                        <div className="text-4xl font-bold text-white">Great Job!</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/10 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{ backgroundColor: child.avatar.backgroundColor }}
                        >
                            {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                        </div>
                        <div className="text-white">
                            <h1 className="font-bold text-lg">Hi, {child.name}!</h1>
                            <p className="text-sm opacity-80">🔥 {child.streaks.currentStreak} day streak</p>
                        </div>
                    </div>
                    <Link href="/child/login">
                        <Button variant="ghost" size="sm" className="text-white">
                            Switch
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Star Balance */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center">
                        <div className="text-4xl mb-1">⭐</div>
                        <div className="text-3xl font-bold">{child.starBalances.growth}</div>
                        {!isSimpleMode && <div className="text-sm opacity-80">Growth Stars</div>}
                    </div>
                    <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl p-4 text-white text-center">
                        <div className="text-4xl mb-1">🎉</div>
                        <div className="text-3xl font-bold">{child.starBalances.fun}</div>
                        {!isSimpleMode && <div className="text-sm opacity-80">Fun Stars</div>}
                    </div>
                </div>
            </div>

            {/* Tasks */}
            <div className="max-w-2xl mx-auto px-4 pb-8">
                <h2 className="text-xl font-bold text-white mb-4">
                    {isSimpleMode ? "Today's Fun!" : "Today's Tasks"}
                </h2>

                {tasks.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-5xl mb-4">🌟</div>
                        <h3 className="font-semibold text-gray-900">All Done!</h3>
                        <p className="text-gray-500">No tasks right now. Great job!</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => {
                            const category = TASK_CATEGORIES[task.category] || { icon: '📋', label: 'Task', color: '#6B7280' };

                            if (isSimpleMode) {
                                // Simple mode for young kids
                                return (
                                    <Card key={task.id} className="relative overflow-hidden" padding="lg">
                                        <div className="flex flex-col items-center text-center">
                                            <span className="text-6xl mb-4">{category.icon}</span>
                                            <h3 className="text-xl font-bold text-gray-900 mb-4">{task.title}</h3>
                                            <Button
                                                size="lg"
                                                onClick={() => handleCompleteTask(task)}
                                                isLoading={completingTask === task.id}
                                                className="w-full"
                                            >
                                                ✓ I Did It!
                                            </Button>
                                        </div>
                                        <div className="absolute -top-4 -right-4 text-8xl opacity-10">
                                            {category.icon}
                                        </div>
                                    </Card>
                                );
                            }

                            // Standard mode for older kids
                            return (
                                <Card key={task.id} hover>
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                                            style={{ backgroundColor: `${category.color}20` }}
                                        >
                                            {category.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{task.title}</h3>
                                            {task.description && (
                                                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-3">
                                                <Badge variant={task.starType === 'growth' ? 'success' : 'info'}>
                                                    {task.starType === 'growth' ? '⭐' : '🎉'} {task.starValue}
                                                </Badge>
                                                <Badge>{category.label}</Badge>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleCompleteTask(task)}
                                            isLoading={completingTask === task.id}
                                        >
                                            Complete
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Navigation */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                    <Link href={`/child/${childId}/rewards`}>
                        <Card hover className="text-center py-6">
                            <div className="text-3xl mb-2">🎁</div>
                            <div className="font-medium text-sm">Rewards</div>
                        </Card>
                    </Link>
                    <Link href={`/child/${childId}/progress`}>
                        <Card hover className="text-center py-6">
                            <div className="text-3xl mb-2">📊</div>
                            <div className="font-medium text-sm">Progress</div>
                        </Card>
                    </Link>
                    <Link href={`/child/${childId}/achievements`}>
                        <Card hover className="text-center py-6">
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="font-medium text-sm">Badges</div>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}
