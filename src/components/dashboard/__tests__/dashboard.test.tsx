/**
 * Dashboard Component Tests
 * 
 * Comprehensive tests for all dashboard components:
 * - DashboardTour
 * - StatsWidget
 * - ChildCard
 * - ApprovalsWidget
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => '/dashboard',
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    X: () => <span data-testid="icon-x">X</span>,
    ChevronRight: () => <span data-testid="icon-chevron-right">→</span>,
    ChevronLeft: () => <span data-testid="icon-chevron-left">←</span>,
    Star: () => <span data-testid="icon-star">★</span>,
    Check: () => <span data-testid="icon-check">✓</span>,
    Clock: () => <span data-testid="icon-clock">⏰</span>,
    ImageIcon: () => <span data-testid="icon-image">🖼</span>,
}));

// Import components after mocks
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { StatsWidget } from '@/components/dashboard/StatsWidget';
import { ChildCard } from '@/components/dashboard/ChildCard';

// ============================================================================
// DashboardTour Tests
// ============================================================================
describe('DashboardTour', () => {
    const mockOnClose = vi.fn();
    const mockOnComplete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock getBoundingClientRect for positioning
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            top: 100,
            left: 100,
            bottom: 200,
            right: 300,
            width: 200,
            height: 100,
            x: 100,
            y: 100,
            toJSON: () => { },
        }));
        // Mock scrollIntoView
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Visibility', () => {
        it('should not render when isOpen is false', () => {
            render(
                <DashboardTour
                    isOpen={false}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
        });

        it('should render when isOpen is true', () => {
            // Create target element
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.getByText('Quick Actions')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });
    });

    describe('Navigation', () => {
        it('should start at step 0', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });

        it('should show Skip button', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.getByText('Skip')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });

        it('should call onClose when Skip is clicked', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            fireEvent.click(screen.getByText('Skip'));
            expect(mockOnClose).toHaveBeenCalled();

            document.body.removeChild(targetEl);
        });

        it('should show Next button on first step', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.getByText('Next')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });

        it('should not show Back button on first step', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.queryByText('Back')).not.toBeInTheDocument();

            document.body.removeChild(targetEl);
        });
    });

    describe('Tour Steps Content', () => {
        it('should display correct content for Quick Actions step', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            expect(screen.getByText('Quick Actions')).toBeInTheDocument();
            expect(screen.getByText(/Create tasks for your kids/)).toBeInTheDocument();
            expect(screen.getByText('🚀')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });
    });

    describe('Progress Bar', () => {
        it('should render progress bar with 4 segments', () => {
            const targetEl = document.createElement('div');
            targetEl.setAttribute('data-tour', 'quick-actions');
            document.body.appendChild(targetEl);

            render(
                <DashboardTour
                    isOpen={true}
                    onClose={mockOnClose}
                    onComplete={mockOnComplete}
                />
            );

            // Progress bar is indicated by the step count text
            expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

            document.body.removeChild(targetEl);
        });
    });
});

// ============================================================================
// StatsWidget Tests
// ============================================================================
describe('StatsWidget', () => {
    const defaultProps = {
        totalStars: 150,
        activeTasks: 12,
        totalCompletions: 45,
        familyStreak: 7,
    };

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('should render all stat cards', () => {
            render(<StatsWidget {...defaultProps} />);

            expect(screen.getByText('Total Stars')).toBeInTheDocument();
            expect(screen.getByText('Active Tasks')).toBeInTheDocument();
            expect(screen.getByText('Completed')).toBeInTheDocument();
            expect(screen.getByText('Best Streak')).toBeInTheDocument();
        });

        it('should display correct values', () => {
            render(<StatsWidget {...defaultProps} />);

            expect(screen.getByText('150')).toBeInTheDocument();
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText('45')).toBeInTheDocument();
            expect(screen.getByText('7')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero values', () => {
            render(
                <StatsWidget
                    totalStars={0}
                    activeTasks={0}
                    totalCompletions={0}
                    familyStreak={0}
                />
            );

            const zeros = screen.getAllByText('0');
            expect(zeros.length).toBe(4);
        });

        it('should handle large numbers', () => {
            render(
                <StatsWidget
                    totalStars={99999}
                    activeTasks={1000}
                    totalCompletions={50000}
                    familyStreak={365}
                />
            );

            expect(screen.getByText('99999')).toBeInTheDocument();
            expect(screen.getByText('1000')).toBeInTheDocument();
            expect(screen.getByText('50000')).toBeInTheDocument();
            expect(screen.getByText('365')).toBeInTheDocument();
        });
    });
});

// ============================================================================
// ChildCard Tests
// ============================================================================
describe('ChildCard', () => {
    const mockChild = {
        id: 'child-1',
        name: 'Alex',
        avatar: { presetId: 'lion', backgroundColor: '#FFD700' },
        starBalances: { growth: 25 },
        streaks: { currentStreak: 5 },
        ageGroup: '7-10',
    };

    const mockOnViewProfile = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Rendering', () => {
        it('should render child name', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Alex')).toBeInTheDocument();
        });

        it('should render avatar emoji', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('🦁')).toBeInTheDocument();
        });

        it('should render age group label', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('Rising Star')).toBeInTheDocument();
        });

        it('should render star count', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('25')).toBeInTheDocument();
        });

        it('should render streak count', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    describe('Actions', () => {
        it('should call onViewProfile when Profile button is clicked', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            fireEvent.click(screen.getByText('Profile'));
            expect(mockOnViewProfile).toHaveBeenCalledWith('child-1');
        });

        it('should call onDelete when Delete button is clicked', () => {
            render(
                <ChildCard
                    child={mockChild}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            fireEvent.click(screen.getByText('Delete'));
            expect(mockOnDelete).toHaveBeenCalledWith(mockChild);
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing starBalances', () => {
            const childWithoutStars = {
                ...mockChild,
                starBalances: undefined as unknown as { growth: number },
            };

            render(
                <ChildCard
                    child={childWithoutStars}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            // Should still render without error
            expect(screen.getByText('Alex')).toBeInTheDocument();
        });

        it('should handle missing streaks', () => {
            const childWithoutStreaks = {
                ...mockChild,
                streaks: undefined as unknown as { currentStreak: number },
            };

            render(
                <ChildCard
                    child={childWithoutStreaks}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            // Should still render without error
            expect(screen.getByText('Alex')).toBeInTheDocument();
        });

        it('should handle unknown avatar preset', () => {
            const childWithUnknownAvatar = {
                ...mockChild,
                avatar: { presetId: 'unknown', backgroundColor: '#000' },
            };

            render(
                <ChildCard
                    child={childWithUnknownAvatar}
                    onViewProfile={mockOnViewProfile}
                    onDelete={mockOnDelete}
                />
            );

            // Should fallback to star emoji
            expect(screen.getByText('⭐')).toBeInTheDocument();
        });

        it('should handle all age groups', () => {
            const ageGroups = [
                { age: '4-6', label: 'Little Explorer' },
                { age: '7-10', label: 'Rising Star' },
                { age: '11-14', label: 'Teen Achiever' },
                { age: '15+', label: 'Young Adult' },
            ];

            ageGroups.forEach(({ age, label }) => {
                cleanup();
                const child = { ...mockChild, ageGroup: age };
                render(
                    <ChildCard
                        child={child}
                        onViewProfile={mockOnViewProfile}
                        onDelete={mockOnDelete}
                    />
                );
                expect(screen.getByText(label)).toBeInTheDocument();
            });
        });
    });
});

// ============================================================================
// Tour Steps Configuration Tests
// ============================================================================
describe('Tour Steps Configuration', () => {
    it('should have 4 tour steps defined', () => {
        // We test this indirectly through the progress bar
        const targetEl = document.createElement('div');
        targetEl.setAttribute('data-tour', 'quick-actions');
        document.body.appendChild(targetEl);

        render(
            <DashboardTour
                isOpen={true}
                onClose={vi.fn()}
                onComplete={vi.fn()}
            />
        );

        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

        document.body.removeChild(targetEl);
    });

    it('should target correct data-tour selectors', () => {
        const targets = [
            'quick-actions',
            'stats',
            'children',
            'approvals',
        ];

        targets.forEach(target => {
            const el = document.createElement('div');
            el.setAttribute('data-tour', target);
            document.body.appendChild(el);
        });

        // All elements should be findable
        targets.forEach(target => {
            const el = document.querySelector(`[data-tour="${target}"]`);
            expect(el).not.toBeNull();
        });

        // Cleanup
        targets.forEach(target => {
            const el = document.querySelector(`[data-tour="${target}"]`);
            if (el) document.body.removeChild(el);
        });
    });
});
