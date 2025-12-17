/**
 * Parent Module Tests
 * 
 * Test the ParentService and related functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
    app: {},
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    Timestamp: {
        now: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    },
}));

import { ParentService } from '../parent.service';
import { ParentUser, DEFAULT_NOTIFICATIONS } from '../types';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('ParentService', () => {
    let service: ParentService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ParentService();
    });

    describe('createParent', () => {
        it('should create a new parent with default values', async () => {
            const userId = 'test-user-123';
            const mobileNumber = '+919876543210';

            (setDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const parent = await service.createParent(userId, mobileNumber);

            expect(parent).toMatchObject({
                id: userId,
                mobileNumber,
                name: '',
                email: '',
                isProfileComplete: false,
                isEmailVerified: false,
                notifications: DEFAULT_NOTIFICATIONS,
            });

            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it('should set timestamps on creation', async () => {
            (setDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const parent = await service.createParent('user-1', '+911234567890');

            expect(parent.createdAt).toBeDefined();
            expect(parent.updatedAt).toBeDefined();
        });
    });

    describe('getParent', () => {
        it('should return parent if exists', async () => {
            const mockParent: ParentUser = {
                id: 'user-1',
                mobileNumber: '+919876543210',
                name: 'Test Parent',
                email: 'test@example.com',
                isProfileComplete: true,
                isEmailVerified: true,
                notifications: { email: true, sms: false, whatsapp: false, push: false },
                createdAt: {} as ParentUser['createdAt'],
                updatedAt: {} as ParentUser['updatedAt'],
            };

            (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                exists: () => true,
                data: () => mockParent,
            });

            const result = await service.getParent('user-1');

            expect(result).toEqual(mockParent);
        });

        it('should return null if parent does not exist', async () => {
            (getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                exists: () => false,
            });

            const result = await service.getParent('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('completeProfile', () => {
        it('should update name, email, and mark profile complete', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.completeProfile('user-1', 'John Doe', 'john@example.com');

            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    name: 'John Doe',
                    email: 'john@example.com',
                    isProfileComplete: true,
                })
            );
        });

        it('should return error on failure', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firestore error'));

            const result = await service.completeProfile('user-1', 'John', 'john@test.com');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('verifyEmail', () => {
        it('should mark email as verified', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.verifyEmail('user-1');

            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    isEmailVerified: true,
                })
            );
        });
    });

    describe('updateNotification', () => {
        it('should enable email notifications', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.updateNotification('user-1', 'email', true);

            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    'notifications.email': true,
                })
            );
        });

        it('should disable sms notifications', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.updateNotification('user-1', 'sms', false);

            expect(result.success).toBe(true);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    'notifications.sms': false,
                })
            );
        });

        it('should enable whatsapp notifications', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.updateNotification('user-1', 'whatsapp', true);

            expect(result.success).toBe(true);
        });

        it('should enable push notifications', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            const result = await service.updateNotification('user-1', 'push', true);

            expect(result.success).toBe(true);
        });
    });
});

describe('ParentUser Type', () => {
    it('should have all required fields including notifications', () => {
        const parent: ParentUser = {
            id: 'user-1',
            mobileNumber: '+919876543210',
            name: 'Test',
            email: 'test@test.com',
            isProfileComplete: true,
            isEmailVerified: false,
            notifications: { email: false, sms: false, whatsapp: false, push: false },
            createdAt: {} as ParentUser['createdAt'],
            updatedAt: {} as ParentUser['updatedAt'],
        };

        expect(parent.id).toBeDefined();
        expect(parent.mobileNumber).toBeDefined();
        expect(parent.isEmailVerified).toBeDefined();
        expect(parent.notifications).toBeDefined();
        expect(parent.notifications.email).toBeDefined();
        expect(parent.notifications.sms).toBeDefined();
        expect(parent.notifications.whatsapp).toBeDefined();
        expect(parent.notifications.push).toBeDefined();
    });
});
