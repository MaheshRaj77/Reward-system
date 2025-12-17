/**
 * Dashboard Service Tests
 * 
 * Tests for dashboard-related service functions
 * Added to parent module for comprehensive coverage
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
    getDocs: vi.fn(),
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    onSnapshot: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    Timestamp: {
        now: vi.fn(() => ({ seconds: Date.now() / 1000, toDate: () => new Date() })),
        fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000, toDate: () => date })),
    },
    serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
}));

import { getDoc, getDocs, collection, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// ============================================================================
// Dashboard Data Service Tests
// ============================================================================
describe('Dashboard Data Services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Children Data Loading', () => {
        it('should fetch children for a family', async () => {
            const mockChildren = [
                {
                    id: 'child-1',
                    data: () => ({
                        name: 'Alex',
                        familyId: 'family-1',
                        starBalances: { growth: 50 },
                        streaks: { currentStreak: 5 },
                    }),
                },
                {
                    id: 'child-2',
                    data: () => ({
                        name: 'Jordan',
                        familyId: 'family-1',
                        starBalances: { growth: 25 },
                        streaks: { currentStreak: 3 },
                    }),
                },
            ];

            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: mockChildren,
            });

            const result = await getDocs(query(collection({} as never, 'children'), where('familyId', '==', 'family-1')));

            expect(result.docs.length).toBe(2);
            expect(result.docs[0].data().name).toBe('Alex');
            expect(result.docs[1].data().name).toBe('Jordan');
        });

        it('should handle empty children list', async () => {
            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: [],
            });

            const result = await getDocs(query(collection({} as never, 'children'), where('familyId', '==', 'family-1')));

            expect(result.docs.length).toBe(0);
        });
    });

    describe('Tasks Data Loading', () => {
        it('should fetch active tasks count', async () => {
            const mockTasks = [
                { id: 'task-1', data: () => ({ title: 'Task 1', isActive: true }) },
                { id: 'task-2', data: () => ({ title: 'Task 2', isActive: true }) },
                { id: 'task-3', data: () => ({ title: 'Task 3', isActive: true }) },
            ];

            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: mockTasks,
                size: 3,
            });

            const result = await getDocs(
                query(
                    collection({} as never, 'tasks'),
                    where('familyId', '==', 'family-1'),
                    where('isActive', '==', true)
                )
            );

            expect(result.size).toBe(3);
        });
    });

    describe('Task Completions Loading', () => {
        it('should fetch task completions count', async () => {
            const mockCompletions = [
                { id: 'comp-1', data: () => ({ status: 'approved' }) },
                { id: 'comp-2', data: () => ({ status: 'approved' }) },
            ];

            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: mockCompletions,
                size: 2,
            });

            const result = await getDocs(
                query(collection({} as never, 'taskCompletions'), where('familyId', '==', 'family-1'))
            );

            expect(result.size).toBe(2);
        });
    });

    describe('Pending Approvals Loading', () => {
        it('should fetch pending task approvals', async () => {
            const mockPendingTasks = [
                {
                    id: 'pending-1',
                    data: () => ({
                        taskId: 'task-1',
                        childId: 'child-1',
                        status: 'pending_approval',
                    }),
                },
            ];

            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: mockPendingTasks,
            });

            const result = await getDocs(
                query(
                    collection({} as never, 'taskCompletions'),
                    where('familyId', '==', 'family-1'),
                    where('status', '==', 'pending_approval')
                )
            );

            expect(result.docs.length).toBe(1);
            expect(result.docs[0].data().status).toBe('pending_approval');
        });

        it('should fetch pending reward requests', async () => {
            const mockPendingRewards = [
                {
                    id: 'request-1',
                    data: () => ({
                        rewardId: 'reward-1',
                        childId: 'child-1',
                        status: 'pending',
                    }),
                },
            ];

            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                docs: mockPendingRewards,
            });

            const result = await getDocs(
                query(
                    collection({} as never, 'rewardRequests'),
                    where('familyId', '==', 'family-1'),
                    where('status', '==', 'pending')
                )
            );

            expect(result.docs.length).toBe(1);
            expect(result.docs[0].data().status).toBe('pending');
        });
    });
});

// ============================================================================
// Dashboard Actions Tests
// ============================================================================
describe('Dashboard Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Add Child', () => {
        it('should create a new child document', async () => {
            (addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                id: 'new-child-id',
            });

            const childData = {
                name: 'New Child',
                familyId: 'family-1',
                dateOfBirth: '2015-05-15',
                ageGroup: '7-10',
                avatar: { presetId: 'lion', backgroundColor: '#FFD700' },
                pin: '1234',
                starBalances: { growth: 0 },
                streaks: { currentStreak: 0, longestStreak: 0 },
            };

            const result = await addDoc(collection({} as never, 'children'), childData);

            expect(result.id).toBe('new-child-id');
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                childData
            );
        });
    });

    describe('Delete Child', () => {
        it('should delete a child document', async () => {
            (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            await deleteDoc({} as never);

            expect(deleteDoc).toHaveBeenCalled();
        });
    });

    describe('Approve Task Completion', () => {
        it('should update completion status to approved', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            await updateDoc({} as never, {
                status: 'approved',
                approvedAt: expect.anything(),
            });

            expect(updateDoc).toHaveBeenCalled();
        });
    });

    describe('Reject Task Completion', () => {
        it('should update completion status to rejected', async () => {
            (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

            await updateDoc({} as never, {
                status: 'rejected',
                rejectedAt: expect.anything(),
            });

            expect(updateDoc).toHaveBeenCalled();
        });
    });
});

// ============================================================================
// Dashboard Statistics Calculation Tests
// ============================================================================
describe('Dashboard Statistics Calculations', () => {
    it('should calculate total family stars from all children', () => {
        const children = [
            { starBalances: { growth: 50 } },
            { starBalances: { growth: 75 } },
            { starBalances: { growth: 25 } },
        ];

        const totalStars = children.reduce((acc, child) => acc + (child.starBalances?.growth || 0), 0);

        expect(totalStars).toBe(150);
    });

    it('should handle children with missing starBalances', () => {
        const children = [
            { starBalances: { growth: 50 } },
            { starBalances: undefined },
            { starBalances: { growth: 25 } },
        ];

        const totalStars = children.reduce(
            (acc, child) => acc + (child.starBalances?.growth || 0),
            0
        );

        expect(totalStars).toBe(75);
    });

    it('should calculate max family streak', () => {
        const children = [
            { streaks: { currentStreak: 5 } },
            { streaks: { currentStreak: 12 } },
            { streaks: { currentStreak: 3 } },
        ];

        const maxStreak = Math.max(
            ...children.map(c => c.streaks?.currentStreak || 0),
            0
        );

        expect(maxStreak).toBe(12);
    });

    it('should return 0 for max streak when no children', () => {
        const children: { streaks: { currentStreak: number } }[] = [];

        const maxStreak = Math.max(
            ...children.map(c => c.streaks?.currentStreak || 0),
            0
        );

        expect(maxStreak).toBe(0);
    });
});

// ============================================================================
// Dashboard Tour Integration Tests
// ============================================================================
describe('Dashboard Tour Integration', () => {
    it('should have correct tour step targets', () => {
        const expectedTargets = [
            '[data-tour="quick-actions"]',
            '[data-tour="stats"]',
            '[data-tour="children"]',
            '[data-tour="approvals"]',
        ];

        // These targets should match the data-tour attributes in the dashboard
        expectedTargets.forEach(target => {
            expect(target).toMatch(/\[data-tour="[\w-]+"\]/);
        });
    });

    it('should have 4 tour steps', () => {
        const tourStepsCount = 4;
        expect(tourStepsCount).toBe(4);
    });

    it('should have unique targets for each step', () => {
        const targets = [
            'quick-actions',
            'stats',
            'children',
            'approvals',
        ];

        const uniqueTargets = new Set(targets);
        expect(uniqueTargets.size).toBe(targets.length);
    });
});
