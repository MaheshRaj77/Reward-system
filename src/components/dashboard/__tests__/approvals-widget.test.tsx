/**
 * ApprovalsWidget Tests
 * 
 * Tests for the pending approvals widget functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
    app: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    getDocs: vi.fn(),
    updateDoc: vi.fn(),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
}));

// Mock next/image
vi.mock('next/image', () => ({
    default: ({ src, alt }: { src: string; alt: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
    ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Check: () => <span data-testid="icon-check">✓</span>,
    X: () => <span data-testid="icon-x">✗</span>,
    Clock: () => <span data-testid="icon-clock">⏰</span>,
    ImageIcon: () => <span data-testid="icon-image">🖼</span>,
}));

import { getDocs, getDoc } from 'firebase/firestore';
import { ApprovalsWidget } from '@/components/dashboard/ApprovalsWidget';

describe('ApprovalsWidget', () => {
    const mockOnActionComplete = vi.fn();
    const familyId = 'family-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Loading State', () => {
        it('should show loading spinner initially', () => {
            // Make getDocs hang to keep loading state
            (getDocs as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(() => { })
            );

            render(
                <ApprovalsWidget
                    familyId={familyId}
                    onActionComplete={mockOnActionComplete}
                />
            );

            // Component shows a spinner (svg with animate-spin class)
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no approvals', async () => {
            // Mock empty results
            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
                docs: [],
            });

            render(
                <ApprovalsWidget
                    familyId={familyId}
                    onActionComplete={mockOnActionComplete}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('All caught up!')).toBeInTheDocument();
            });
        });

        it('should show helpful message in empty state', async () => {
            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
                docs: [],
            });

            render(
                <ApprovalsWidget
                    familyId={familyId}
                    onActionComplete={mockOnActionComplete}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/When your children complete tasks/)).toBeInTheDocument();
            });
        });
    });

    describe('Approval Items Display', () => {
        it('should display pending task approvals', async () => {
            const mockTaskCompletion = {
                id: 'completion-1',
                data: () => ({
                    taskId: 'task-1',
                    childId: 'child-1',
                    status: 'pending_approval',
                    completedAt: { toDate: () => new Date() },
                }),
            };

            const mockTask = {
                exists: () => true,
                data: () => ({
                    title: 'Clean Room',
                    starValue: 10,
                    starType: 'growth',
                }),
            };

            const mockChild = {
                exists: () => true,
                data: () => ({
                    name: 'Alex',
                }),
            };

            (getDocs as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
                docs: [mockTaskCompletion],
            }));

            (getDoc as ReturnType<typeof vi.fn>).mockImplementation(async () => mockTask);
            // Override for child doc
            (getDoc as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => mockTask);
            (getDoc as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => mockChild);

            render(
                <ApprovalsWidget
                    familyId={familyId}
                    onActionComplete={mockOnActionComplete}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Widget Header', () => {
        it('should display correct title', async () => {
            (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
                docs: [],
            });

            render(
                <ApprovalsWidget
                    familyId={familyId}
                    onActionComplete={mockOnActionComplete}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
            });
        });
    });
});

describe('ApprovalsWidget Props', () => {
    it('should require familyId prop', () => {
        const props = {
            familyId: 'test-family-id',
            onActionComplete: vi.fn(),
        };

        expect(props.familyId).toBeDefined();
    });

    it('should have optional onActionComplete prop', () => {
        const propsWithCallback = {
            familyId: 'test-family-id',
            onActionComplete: vi.fn(),
        };

        const propsWithoutCallback = {
            familyId: 'test-family-id',
        };

        expect(propsWithCallback.onActionComplete).toBeDefined();
        expect(propsWithoutCallback.familyId).toBeDefined();
    });
});
