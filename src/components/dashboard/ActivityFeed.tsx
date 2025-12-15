'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui';

interface ActivityItem {
    id: string;
    type: 'task_completion' | 'reward_redemption' | 'child_added' | 'achievement';
    title: string;
    subtitle: string;
    timestamp: Date;
    childName?: string;
    childAvatar?: string;
    status: 'success' | 'warning' | 'info';
}

interface ActivityFeedProps {
    familyId: string;
}

export function ActivityFeed({ familyId }: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadActivity = async () => {
            if (!familyId) return;

            try {
                // Fetch recent task completions
                const completionsQuery = query(
                    collection(db, 'taskCompletions'),
                    where('familyId', '==', familyId),
                    orderBy('completedAt', 'desc'),
                    limit(5)
                );

                const snapshot = await getDocs(completionsQuery);
                const items: ActivityItem[] = [];

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    items.push({
                        id: doc.id,
                        type: 'task_completion',
                        title: 'Task Completed',
                        subtitle: `${data.childName || 'Child'} completed a task`,
                        timestamp: new Date(data.completedAt.seconds * 1000),
                        status: 'success',
                        childName: data.childName
                    });
                }

                setActivities(items);
            } catch (error) {
                console.error('Error loading activity feed:', error);
            } finally {
                setLoading(false);
            }
        };

        loadActivity();
    }, [familyId]);

    if (loading) return (
        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-6 h-full flex items-center justify-center min-h-[200px] shadow-sm shadow-indigo-50">
            <div className="animate-pulse text-indigo-400">Loading updates...</div>
        </div>
    );

    if (activities.length === 0) return (
        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm shadow-indigo-50">
            <div className="text-4xl mb-2 opacity-50">🍃</div>
            <p className="text-gray-900 font-medium">Quiet day so far</p>
            <p className="text-xs text-gray-500">Activity will appear here when tasks are completed</p>
        </div>
    );

    return (
        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-6 h-full shadow-lg shadow-indigo-100/50">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-indigo-500">📡</span> Live Feed
            </h3>
            <div className="space-y-4">
                {activities.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 shadow-sm ${item.status === 'success' ? 'bg-green-100 text-green-600' :
                                item.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {item.type === 'task_completion' ? '✅' : '🎉'}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.subtitle}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
