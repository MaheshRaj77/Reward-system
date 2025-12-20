'use client';

import { useState, useEffect } from 'react';
import { useParentAuth } from '@/modules/parent';
import { ParentNotificationService, ParentNotification } from '@/modules/parent/notification.service';
import { Spinner } from '@/components/ui';
import { Bell, CheckCircle, Gift, Star, Target, Trash2, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const { parent, loading: authLoading } = useParentAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<ParentNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!parent?.id) return;

        setLoading(true);
        const unsubscribe = ParentNotificationService.subscribeToNotifications(
            parent.id,
            (data) => {
                setNotifications(data);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [parent?.id]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await ParentNotificationService.markAsRead(notificationId);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!parent?.id) return;
        try {
            await ParentNotificationService.markAllAsRead(parent.id);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = (notification: ParentNotification) => {
        // Mark as read first
        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }

        // Navigate based on type
        switch (notification.type) {
            case 'task_completion':
                router.push('/approvals');
                break;
            case 'reward_request':
            case 'custom_reward_request':
                router.push('/approvals');
                break;
            default:
                break;
        }
    };

    const getNotificationIcon = (type: ParentNotification['type']) => {
        switch (type) {
            case 'task_completion':
                return <Target className="text-green-500" size={20} />;
            case 'reward_request':
                return <Gift className="text-pink-500" size={20} />;
            case 'custom_reward_request':
                return <Star className="text-amber-500" size={20} />;
            default:
                return <Bell className="text-indigo-500" size={20} />;
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Spinner size="lg" className="text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                        <CheckCheck size={16} />
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-indigo-50/50' : ''
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!notification.isRead ? 'bg-white shadow-sm' : 'bg-gray-100'
                                    }`}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                                        {notification.message}
                                    </p>
                                    {notification.childName && (
                                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                            👶 {notification.childName}
                                        </span>
                                    )}
                                </div>

                                {/* Unread indicator */}
                                {!notification.isRead && (
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <Bell className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                        <p className="text-gray-500 text-sm">
                            You'll see notifications here when your children complete tasks or request rewards.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
