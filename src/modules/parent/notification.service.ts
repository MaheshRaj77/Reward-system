import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    getDocs,
    limit,
    writeBatch
} from 'firebase/firestore';

export interface ParentNotification {
    id: string;
    parentId: string;
    type: 'task_completion' | 'reward_request' | 'custom_reward_request' | 'task_approval' | 'general';
    title: string;
    message: string;
    childId?: string;
    childName?: string;
    relatedId?: string; // taskId, rewardId, etc.
    isRead: boolean;
    createdAt: Timestamp | Date;
}

export const ParentNotificationService = {
    /**
     * Create a new notification for a parent
     */
    createNotification: async (data: {
        parentId: string;
        type: ParentNotification['type'];
        title: string;
        message: string;
        childId?: string;
        childName?: string;
        relatedId?: string;
    }): Promise<string> => {
        try {
            const docRef = await addDoc(collection(db, 'parentNotifications'), {
                ...data,
                isRead: false,
                createdAt: serverTimestamp()
            });
            console.log('Notification created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    /**
     * Get unread notification count for a parent (real-time)
     */
    subscribeToUnreadCount: (
        parentId: string,
        callback: (count: number) => void
    ): (() => void) => {
        const q = query(
            collection(db, 'parentNotifications'),
            where('parentId', '==', parentId),
            where('isRead', '==', false)
        );

        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        }, (error) => {
            console.error('Error subscribing to notifications:', error);
            callback(0);
        });
    },

    /**
     * Get all notifications for a parent (real-time)
     */
    subscribeToNotifications: (
        parentId: string,
        callback: (notifications: ParentNotification[]) => void
    ): (() => void) => {
        const q = query(
            collection(db, 'parentNotifications'),
            where('parentId', '==', parentId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ParentNotification[];
            callback(notifications);
        }, (error) => {
            console.error('Error subscribing to notifications:', error);
            callback([]);
        });
    },

    /**
     * Mark a notification as read
     */
    markAsRead: async (notificationId: string): Promise<void> => {
        try {
            await updateDoc(doc(db, 'parentNotifications', notificationId), {
                isRead: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read for a parent
     */
    markAllAsRead: async (parentId: string): Promise<void> => {
        try {
            const q = query(
                collection(db, 'parentNotifications'),
                where('parentId', '==', parentId),
                where('isRead', '==', false)
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { isRead: true });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    // Helper functions to create specific notification types
    notifyTaskCompletion: async (
        parentId: string,
        childName: string,
        taskTitle: string,
        taskId: string,
        childId: string,
        requiresApproval: boolean = true
    ) => {
        const message = requiresApproval
            ? `${childName} has completed "${taskTitle}" and is waiting for approval.`
            : `${childName} has completed "${taskTitle}".`;

        return ParentNotificationService.createNotification({
            parentId,
            type: 'task_completion',
            title: 'Task Completed! 🎉',
            message,
            childId,
            childName,
            relatedId: taskId
        });
    },

    notifyRewardRequest: async (
        parentId: string,
        childName: string,
        rewardTitle: string,
        rewardId: string,
        childId: string
    ) => {
        return ParentNotificationService.createNotification({
            parentId,
            type: 'reward_request',
            title: 'Reward Request! 🎁',
            message: `${childName} wants to redeem "${rewardTitle}".`,
            childId,
            childName,
            relatedId: rewardId
        });
    },

    notifyCustomRewardRequest: async (
        parentId: string,
        childName: string,
        rewardName: string,
        requestId: string,
        childId: string
    ) => {
        return ParentNotificationService.createNotification({
            parentId,
            type: 'custom_reward_request',
            title: 'Custom Reward Request! ✨',
            message: `${childName} wants "${rewardName}" as a special reward.`,
            childId,
            childName,
            relatedId: requestId
        });
    }
};
