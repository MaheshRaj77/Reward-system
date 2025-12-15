// ============================================
// PARENT UI COMPONENTS
// Dashboard and management components for parents
// ============================================

'use client';

import React from 'react';
import type { Child, Task, TaskCompletion, Reward, RewardRedemption, Family } from '@/types';
import { TASK_CATEGORIES, TRUST_LEVELS, AGE_GROUPS } from '@/lib/constants';
import { Card, Badge, Button, Avatar, ProgressBar, EmptyState } from '@/components/ui';

// ============================================
// CHILD OVERVIEW CARD
// ============================================

interface ChildOverviewCardProps {
    child: Child;
    onClick?: () => void;
    pendingApprovals?: number;
}

export function ChildOverviewCard({ child, onClick, pendingApprovals = 0 }: ChildOverviewCardProps) {
    const trustInfo = TRUST_LEVELS[child.trustLevel];
    const ageConfig = AGE_GROUPS[child.ageGroup];

    return (
        <Card hover onClick={onClick} className="cursor-pointer">
            <div className="flex items-start gap-4">
                <Avatar
                    name={child.name}
                    backgroundColor={child.themeColor}
                    size="lg"
                />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{child.name}</h3>
                        <Badge>{ageConfig.label}</Badge>
                        {pendingApprovals > 0 && (
                            <Badge variant="warning">{pendingApprovals} pending</Badge>
                        )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>⭐ {child.starBalances.rewards}</span>
                        <span>🔥 {child.streaks.currentStreak} day streak</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: trustInfo.color }}
                        />
                        <span className="text-xs text-gray-500">
                            Trust Level {child.trustLevel}: {trustInfo.name}
                        </span>
                    </div>
                </div>
                <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Card>
    );
}

// ============================================
// APPROVAL QUEUE ITEM
// ============================================

interface ApprovalItemProps {
    completion: TaskCompletion;
    task: Task;
    child: Child;
    onApprove: () => void;
    onReject: () => void;
    isProcessing?: boolean;
}

export function ApprovalItem({
    completion,
    task,
    child,
    onApprove,
    onReject,
    isProcessing
}: ApprovalItemProps) {
    const category = TASK_CATEGORIES[task.category];

    return (
        <Card>
            <div className="flex items-start gap-4">
                <Avatar name={child.name} backgroundColor={child.themeColor} />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{child.name}</span>
                        <span className="text-gray-400">completed</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span>{category.icon}</span>
                        <span className="font-semibold">{task.title}</span>
                    </div>
                    {completion.proof && (
                        <div className="mt-2 text-sm text-gray-500">
                            {completion.proof.type === 'photo' && '📷 Photo attached'}
                            {completion.proof.type === 'timer' && `⏱️ Timer: ${completion.proof.timerDuration}s`}
                            {completion.proof.type === 'checklist' && `✅ Checklist completed`}
                        </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                        {completion.completedAt && new Date(completion.completedAt.seconds * 1000).toLocaleString()}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReject}
                        disabled={isProcessing}
                    >
                        ✕
                    </Button>
                    <Button
                        size="sm"
                        onClick={onApprove}
                        isLoading={isProcessing}
                    >
                        ✓ Approve
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// ============================================
// REDEMPTION QUEUE ITEM
// ============================================

interface RedemptionItemProps {
    redemption: RewardRedemption;
    reward: Reward;
    child: Child;
    onApprove: () => void;
    onReject: () => void;
    onFulfill?: () => void;
    isProcessing?: boolean;
}

export function RedemptionItem({
    redemption,
    reward,
    child,
    onApprove,
    onReject,
    onFulfill,
    isProcessing
}: RedemptionItemProps) {
    return (
        <Card>
            <div className="flex items-start gap-4">
                <div className="text-3xl">{reward.icon}</div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{child.name}</span>
                        <span className="text-gray-400">wants to redeem</span>
                    </div>
                    <span className="font-semibold">{reward.name}</span>
                    <span className="text-gray-500 ml-2">
                        ({redemption.starsDeducted} stars)
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                        {redemption.requestedAt && new Date(redemption.requestedAt.seconds * 1000).toLocaleString()}
                    </div>
                </div>
                <div className="flex gap-2">
                    {redemption.status === 'pending' && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReject}
                                disabled={isProcessing}
                            >
                                ✕
                            </Button>
                            <Button
                                size="sm"
                                onClick={onApprove}
                                isLoading={isProcessing}
                            >
                                ✓ Approve
                            </Button>
                        </>
                    )}
                    {redemption.status === 'approved' && onFulfill && (
                        <Button
                            size="sm"
                            onClick={onFulfill}
                            isLoading={isProcessing}
                        >
                            Mark Fulfilled
                        </Button>
                    )}
                    {redemption.status === 'fulfilled' && (
                        <Badge variant="success">Fulfilled</Badge>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ============================================
// FAMILY STATS WIDGET
// ============================================

interface FamilyStatsWidgetProps {
    family: Family;
    children: Child[];
    completionsThisWeek: number;
    pendingApprovals: number;
}

export function FamilyStatsWidget({
    family,
    children,
    completionsThisWeek,
    pendingApprovals
}: FamilyStatsWidgetProps) {
    const totalStars = children.reduce((sum, c) => sum + c.starBalances.rewards, 0);
    const avgTrust = children.length > 0
        ? children.reduce((sum, c) => sum + c.trustLevel, 0) / children.length
        : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
                <p className="text-3xl font-bold text-indigo-600">{children.length}</p>
                <p className="text-sm text-gray-500">Children</p>
            </Card>
            <Card className="text-center">
                <p className="text-3xl font-bold text-green-600">{completionsThisWeek}</p>
                <p className="text-sm text-gray-500">Tasks This Week</p>
            </Card>
            <Card className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{totalStars}</p>
                <p className="text-sm text-gray-500">Total Stars</p>
            </Card>
            <Card className="text-center">
                <p className="text-3xl font-bold text-orange-600">{pendingApprovals}</p>
                <p className="text-sm text-gray-500">Pending</p>
            </Card>
        </div>
    );
}

// ============================================
// TASK MANAGER CARD
// ============================================

interface TaskManagerCardProps {
    task: Task;
    childName?: string;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function TaskManagerCard({ task, childName, onEdit, onDelete }: TaskManagerCardProps) {
    const category = TASK_CATEGORIES[task.category];

    return (
        <Card>
            <div className="flex items-start gap-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${category.color}20` }}
                >
                    {category.icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Badge variant="success" size="sm">
                            ⭐ {task.starValue}
                        </Badge>
                        <span>{category.label}</span>
                        <span>•</span>
                        <span>{task.taskType}</span>
                        {childName && (
                            <>
                                <span>•</span>
                                <span>Assigned to {childName}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <Button variant="ghost" size="sm" onClick={onEdit}>
                            Edit
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="ghost" size="sm" onClick={onDelete}>
                            Delete
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ============================================
// REWARD MANAGER CARD
// ============================================

interface RewardManagerCardProps {
    reward: Reward;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function RewardManagerCard({ reward, onEdit, onDelete }: RewardManagerCardProps) {
    return (
        <Card>
            <div className="flex items-start gap-4">
                <span className="text-3xl">{reward.icon}</span>
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{reward.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Badge variant="success" size="sm">
                            ⭐ {reward.starCost}
                        </Badge>
                        <span>{reward.category}</span>
                        {reward.limitPerWeek && (
                            <>
                                <span>•</span>
                                <span>Max {reward.limitPerWeek}/week</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <Button variant="ghost" size="sm" onClick={onEdit}>
                            Edit
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="ghost" size="sm" onClick={onDelete}>
                            Delete
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ============================================
// MOTIVATION ALERT
// ============================================

interface MotivationAlertProps {
    child: Child;
    daysSinceActive: number;
    onSendEncouragement: () => void;
}

export function MotivationAlert({ child, daysSinceActive, onSendEncouragement }: MotivationAlertProps) {
    const severity = daysSinceActive >= 7 ? 'severe' : daysSinceActive >= 4 ? 'moderate' : 'mild';

    const colors = {
        mild: 'from-yellow-400 to-orange-400',
        moderate: 'from-orange-400 to-red-400',
        severe: 'from-red-400 to-pink-500',
    };

    return (
        <Card className={`bg-gradient-to-r ${colors[severity]} text-white`}>
            <div className="flex items-center gap-4">
                <Avatar name={child.name} backgroundColor={child.themeColor} />
                <div className="flex-1">
                    <p className="font-medium">
                        {child.name} hasn't completed a task in {daysSinceActive} days
                    </p>
                    <p className="text-sm opacity-90">
                        {severity === 'mild' && 'A gentle reminder might help!'}
                        {severity === 'moderate' && 'Consider assigning an easy task'}
                        {severity === 'severe' && 'Time to re-engage with bonus motivation'}
                    </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onSendEncouragement}>
                    Send Encouragement
                </Button>
            </div>
        </Card>
    );
}

// ============================================
// QUICK ACTION BUTTONS
// ============================================

interface QuickActionsProps {
    onAddChild: () => void;
    onAddTask: () => void;
    onAddReward: () => void;
}

export function QuickActions({ onAddChild, onAddTask, onAddReward }: QuickActionsProps) {
    return (
        <div className="flex gap-3">
            <Button variant="secondary" onClick={onAddChild} leftIcon="👶">
                Add Child
            </Button>
            <Button variant="secondary" onClick={onAddTask} leftIcon="📝">
                Add Task
            </Button>
            <Button variant="secondary" onClick={onAddReward} leftIcon="🎁">
                Add Reward
            </Button>
        </div>
    );
}

// ============================================
// SUBSCRIPTION BANNER
// ============================================

interface SubscriptionBannerProps {
    plan: 'free' | 'premium';
    onUpgrade?: () => void;
}

export function SubscriptionBanner({ plan, onUpgrade }: SubscriptionBannerProps) {
    if (plan === 'premium') {
        return (
            <Card className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⭐</span>
                        <div>
                            <p className="font-bold text-lg">Premium Plan</p>
                            <p className="text-sm opacity-90">You have unlimited children, tasks, and rewards</p>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-4xl">🎯</div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">Free Plan</p>
                        <p className="text-sm text-gray-600">Limited to 2 children and 5 tasks per child</p>
                    </div>
                </div>
                {onUpgrade && (
                    <Button
                        onClick={onUpgrade}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold whitespace-nowrap"
                    >
                        Upgrade to Premium
                    </Button>
                )}
            </div>
        </Card>
    );
}

// ============================================
// SUBSCRIPTION STATUS CARD
// ============================================

interface SubscriptionStatusProps {
    plan: 'free' | 'premium';
    childrenCount: number;
    tasksCount?: number;
}

export function SubscriptionStatus({ plan, childrenCount, tasksCount = 0 }: SubscriptionStatusProps) {
    const isFreePlan = plan === 'free';
    const maxChildren = isFreePlan ? 2 : 999;
    const childrenPercentage = (childrenCount / maxChildren) * 100;
    const childrenRemaining = maxChildren - childrenCount;

    return (
        <Card className="bg-white/80 backdrop-blur-sm">
            <div className="space-y-4">
                {/* Plan Name */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Current Plan</span>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${isFreePlan
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                        {isFreePlan ? '📦' : '⭐'} {isFreePlan ? 'Free' : 'Premium'}
                    </span>
                </div>

                {/* Children Usage */}
                {isFreePlan && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">Children: {childrenCount}/{maxChildren}</span>
                            <span className={`text-xs font-semibold ${childrenRemaining <= 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {childrenRemaining > 0 ? `${childrenRemaining} slots available` : 'Limit reached'}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${childrenRemaining <= 0 ? 'bg-red-500' : 'bg-green-500'
                                    }`}
                                style={{ width: `${Math.min(childrenPercentage, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
                {/* Features List */}
                <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Included Features:</p>
                    <div className="space-y-1 text-xs text-gray-600">
                        {isFreePlan ? (
                            <>
                                <div>✓ Up to 2 children</div>
                                <div>✓ Up to 5 tasks per child</div>
                                <div>✗ Recurring tasks</div>
                                <div>✗ Email notifications</div>
                            </>
                        ) : (
                            <>
                                <div>✓ Unlimited children</div>
                                <div>✓ Unlimited tasks</div>
                                <div>✓ Recurring tasks</div>
                                <div>✓ Email notifications</div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
