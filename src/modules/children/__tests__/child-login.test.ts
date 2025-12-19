/**
 * Child Login Fix Test
 * 
 * Verifies the fix for children login when parent has no familyId
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

// Mock firestore functions directly
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    doc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    Timestamp: {
        now: vi.fn(),
    },
}));

import { childService } from '../child.service';

describe('Child Login with Missing FamilyId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should find children even if parent has no familyId, using parentId as fallback', async () => {
        // Setup scenarios
        const parentMobile = '+919876543210';
        const parentId = 'parent-123';

        // Mock parent query response
        mockGetDocs.mockImplementation(async (query: any) => {
            console.log('getDocs called');
            // Check if this is the parent query (simplified check)
            // In a real mock we might check query constraints
            // For this test, valid assumption is sequence: 1. Parent, 2. Children

            if (mockGetDocs.mock.calls.length === 1) {
                console.log('Returning parent mock');
                return {
                    empty: false,
                    docs: [
                        {
                            id: parentId,
                            data: () => ({
                                mobileNumber: parentMobile,
                                // familyId is intentionally missing
                            }),
                        },
                    ],
                };
            }

            if (mockGetDocs.mock.calls.length === 2) {
                console.log('Returning children mock');
                const docs = [
                    {
                        id: 'child-1',
                        data: () => ({
                            name: 'Kiddo',
                            familyId: parentId,
                        }),
                    },
                ];
                return {
                    empty: false,
                    docs: docs,
                    forEach: (callback: any) => docs.forEach(callback),
                };
            }

            return { empty: true, docs: [] };
        });

        // Act
        console.log('Calling getChildrenByParentMobile');
        const children = await childService.getChildrenByParentMobile(parentMobile);
        console.log('Children returned:', children);

        // Assert
        // Before the fix, this should fail (return empty array) because logic requires familyId
        // After the fix, it should use parent.id as fallback and find the child
        expect(children).toHaveLength(1);
        expect(children[0].name).toBe('Kiddo');
    });
});
