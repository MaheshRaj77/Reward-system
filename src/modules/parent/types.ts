import { Timestamp } from 'firebase/firestore';

// Parent user - authenticated via mobile
export interface ParentUser {
    id: string;                    // Firebase Auth UID
    mobileNumber: string;          // Verified mobile (unique identifier)
    name: string;                  // Set during profile completion
    email: string;                 // Email address
    isProfileComplete: boolean;    // false until name+email set
    isEmailVerified: boolean;      // true after OTP verification

    // Notification preferences
    notifications: {
        email: boolean;            // Email notifications
        sms: boolean;              // SMS notifications
        whatsapp: boolean;         // WhatsApp notifications
        push: boolean;             // Push notifications
    };

    // Push notification token
    fcmToken?: string;             // Firebase Cloud Messaging token
    fcmTokenUpdatedAt?: Timestamp; // When token was last updated

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Default notification preferences
export const DEFAULT_NOTIFICATIONS = {
    email: false,
    sms: false,
    whatsapp: false,
    push: false,
};

// Child profile - linked to parent
export interface ChildProfile {
    id: string;
    parentId: string;              // Parent's UID
    name: string;
    age: number;
    avatar?: string;
    totalStars: number;
    currentStreak: number;
    bestStreak: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Task assigned to child
export interface Task {
    id: string;
    parentId: string;
    childId: string;
    title: string;
    description?: string;
    starValue: number;
    dueDate?: Timestamp;
    status: 'pending' | 'completed' | 'expired';
    createdAt: Timestamp;
    completedAt?: Timestamp;
}

// Reward that can be redeemed
export interface Reward {
    id: string;
    parentId: string;
    childId?: string;              // Optional - can be family-wide
    title: string;
    description?: string;
    starCost: number;
    isActive: boolean;
    createdAt: Timestamp;
}

// Export collection names as constants
export const COLLECTIONS = {
    PARENTS: 'parents',
    CHILDREN: 'children',
    TASKS: 'tasks',
    REWARDS: 'rewards',
    EMAIL_OTPS: 'email_otps',
} as const;
