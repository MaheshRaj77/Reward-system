// ============================================
// CHILD UI COMPONENTS
// Age-adaptive components for children's interface
// ============================================

'use client';

import React from 'react';
import type { Task, Child, Reward } from '@/types';
import { AGE_GROUPS, TASK_CATEGORIES, TRUST_LEVELS } from '@/lib/constants';
import { Card, Badge, Button, ProgressBar } from '@/components/ui';

// ============================================
// TASK CARD (Age-Adaptive)
// ============================================

interface TaskCardProps {
    task: Task;
    child: Child;
    onComplete: () => void;
    isCompleting?: boolean;
}

export function TaskCard({ task, child, onComplete, isCompleting }: TaskCardProps) {
    const ageConfig = AGE_GROUPS[child.ageGroup];
    const category = TASK_CATEGORIES[task.category];

    // Simple mode for young children (4-6)
    if (child.ageGroup === '4-6') {
        return (
            <Card hover className="relative overflow-hidden" padding="lg">
                <div className="flex flex-col items-center text-center">
                    <span className="text-6xl mb-4">{category.icon}</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{task.title}</h3>
                    <Button
                        size="lg"
                        onClick={onComplete}
                        isLoading={isCompleting}
                        className="w-full"
                    >
                        ✓ I Did It!
                    </Button>
                </div>
                {/* Fun decoration */}
                <div className="absolute -top-4 -right-4 text-8xl opacity-10">
                    {category.icon}
                </div>
            </Card>
        );
    }

    // Standard mode for older children
    return (
        <Card hover className="relative">
            <div className="flex items-start gap-4">
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${category.color}20` }}
                >
                    {category.icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                        <Badge variant="success">
                            ⭐ {ageConfig.showNumbers ? task.starValue : ''}
                        </Badge>
                        <Badge>{category.label}</Badge>
                        {task.proofRequired !== 'none' && (
                            <Badge variant="warning">📷 Proof needed</Badge>
                        )}
                    </div>
                </div>
                <Button
                    onClick={onComplete}
                    isLoading={isCompleting}
                >
                    Complete
                </Button>
            </div>
        </Card>
    );
}

// ============================================
// STAR BALANCE (Age-Adaptive)
// ============================================

interface StarBalanceProps {
    child: Child;
    showBreakdown?: boolean;
}

export function StarBalance({ child, showBreakdown = true }: StarBalanceProps) {
    const ageConfig = AGE_GROUPS[child.ageGroup];

    // Visual-only mode for young children
    if (child.ageGroup === '4-6') {
        const totalStars = child.starBalances.rewards;
        return (
            <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                <div className="text-center">
                    <div className="text-6xl mb-2">
                        {'⭐'.repeat(Math.min(totalStars, 10))}
                    </div>
                    <p className="text-lg font-medium opacity-90">Your Stars!</p>
                </div>
            </Card>
        );
    }

    // Full display for older children
    return (
        <Card>
            <h3 className="font-semibold text-gray-700 mb-4">Your Stars</h3>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                <span className="text-2xl">⭐</span>
                <span className="font-bold text-lg">{child.starBalances.rewards}</span>
                <span className="text-sm opacity-90">Stars</span>
            </div>
            {showBreakdown && ageConfig.showNumbers && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500 space-y-2">
                        <div className="flex justify-between">
                            <span>This week earned</span>
                            <span>{child.starBalances.weeklyEarned} / {child.starBalances.weeklyLimit}</span>
                        </div>
                        <ProgressBar
                            value={child.starBalances.weeklyEarned}
                            max={child.starBalances.weeklyLimit}
                            color="green"
                            showLabel={false}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}

// ============================================
// STREAK DISPLAY
// ============================================

interface StreakDisplayProps {
    child: Child;
}

export function StreakDisplay({ child }: StreakDisplayProps) {
    const ageConfig = AGE_GROUPS[child.ageGroup];

    if (!ageConfig.showStreaks) return null;

    const streak = child.streaks.currentStreak;

    return (
        <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
            <div className="flex items-center gap-4">
                <div className="text-4xl">🔥</div>
                <div>
                    <p className="text-2xl font-bold">{streak} day{streak !== 1 ? 's' : ''}</p>
                    <p className="text-sm opacity-90">Current streak</p>
                </div>
            </div>
            {streak > 0 && child.streaks.longestStreak > streak && (
                <p className="text-xs mt-2 opacity-75">
                    Best: {child.streaks.longestStreak} days
                </p>
            )}
        </Card>
    );
}

// ============================================
// REWARD CARD (Age-Adaptive)
// ============================================

interface RewardCardProps {
    reward: Reward;
    child: Child;
    onRedeem: () => void;
    isRedeeming?: boolean;
}

export function RewardCard({ reward, child, onRedeem, isRedeeming }: RewardCardProps) {
    const ageConfig = AGE_GROUPS[child.ageGroup];

    const canAfford = child.starBalances.rewards >= reward.starCost;

    // Simple mode for young children
    if (child.ageGroup === '4-6') {
        return (
            <Card hover className={`text-center ${!canAfford ? 'opacity-60' : ''}`} padding="lg">
                <span className="text-5xl">{reward.icon}</span>
                <h3 className="text-lg font-bold mt-3 mb-4">{reward.name}</h3>
                <Button
                    onClick={onRedeem}
                    disabled={!canAfford}
                    isLoading={isRedeeming}
                    className="w-full"
                >
                    {canAfford ? 'I Want This!' : '🔒 Need more stars'}
                </Button>
            </Card>
        );
    }

    // Standard mode
    return (
        <Card hover className={!canAfford ? 'opacity-60' : ''}>
            <div className="flex items-start gap-4">
                <span className="text-4xl">{reward.icon}</span>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                    {reward.description && (
                        <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="success">
                            ⭐ {ageConfig.showNumbers ? reward.starCost : ''}
                        </Badge>
                    </div>
                </div>
                <Button
                    onClick={onRedeem}
                    disabled={!canAfford}
                    isLoading={isRedeeming}
                    variant={canAfford ? 'primary' : 'ghost'}
                >
                    {canAfford ? 'Redeem' : 'Locked'}
                </Button>
            </div>
        </Card>
    );
}

// ============================================
// TRUST LEVEL DISPLAY
// ============================================

interface TrustLevelDisplayProps {
    child: Child;
}

export function TrustLevelDisplay({ child }: TrustLevelDisplayProps) {
    const trustInfo = TRUST_LEVELS[child.trustLevel];

    return (
        <Card>
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-gray-700">Trust Level</h4>
                    <p className="text-sm text-gray-500">{trustInfo.description}</p>
                </div>
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: trustInfo.color }}
                >
                    {child.trustLevel}
                </div>
            </div>
            <div className="mt-3">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                        <div
                            key={level}
                            className={`flex-1 h-2 rounded-full ${level <= child.trustLevel
                                ? 'bg-gradient-to-r from-green-400 to-blue-500'
                                : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">{trustInfo.name}</p>
            </div>
        </Card>
    );
}

// ============================================
// ADJUSTABLE TRUST LEVEL
// ============================================

interface AdjustableTrustLevelProps {
    child: Child;
    onAdjust: (newLevel: 1 | 2 | 3 | 4 | 5, reason: string) => Promise<void>;
    isLoading?: boolean;
}

export function AdjustableTrustLevel({ child, onAdjust, isLoading = false }: AdjustableTrustLevelProps) {
    const [selectedLevel, setSelectedLevel] = React.useState<1 | 2 | 3 | 4 | 5>(child.trustLevel);
    const [adjustmentReason, setAdjustmentReason] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);

    const handleAdjust = async () => {
        if (selectedLevel !== child.trustLevel) {
            await onAdjust(selectedLevel, adjustmentReason || 'Parent adjustment');
            setIsOpen(false);
            setAdjustmentReason('');
        }
    };

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="font-medium text-gray-700">Trust Level</h4>
                    <p className="text-xs text-gray-500">Click to adjust</p>
                </div>
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: TRUST_LEVELS[child.trustLevel].color }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {child.trustLevel}
                </div>
            </div>

            {isOpen && (
                <div className="border-t pt-4 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">Select Trust Level</p>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((level) => {
                                const levelNum = level as 1 | 2 | 3 | 4 | 5;
                                const trustInfo = TRUST_LEVELS[levelNum];
                                return (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(levelNum)}
                                        className={`
                                            p-3 rounded-lg font-semibold transition-all duration-200
                                            ${selectedLevel === levelNum
                                                ? 'ring-2 ring-offset-2 scale-105'
                                                : 'hover:shadow-md'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: trustInfo.color,
                                            color: 'white',
                                        }}
                                    >
                                        {level}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{TRUST_LEVELS[selectedLevel].description}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Adjustment Reason (optional)
                        </label>
                        <textarea
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            placeholder="e.g., Consistent good behavior, needs more responsibility, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleAdjust}
                            disabled={isLoading || selectedLevel === child.trustLevel}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {isLoading ? 'Saving...' : 'Apply Adjustment'}
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setSelectedLevel(child.trustLevel);
                                setAdjustmentReason('');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ============================================
// CELEBRATION ANIMATION
// ============================================

interface CelebrationProps {
    type: 'confetti' | 'stars' | 'fireworks' | 'rainbow';
    isActive: boolean;
    onComplete?: () => void;
}

export function Celebration({ type, isActive, onComplete }: CelebrationProps) {
    if (!isActive) return null;

    const emojis = {
        confetti: ['🎉', '🎊', '🥳', '✨'],
        stars: ['⭐', '🌟', '✨', '💫'],
        fireworks: ['🎆', '🎇', '🌟', '✨'],
        rainbow: ['🌈', '✨', '🦄', '💖'],
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {emojis[type].map((emoji, index) => (
                <div
                    key={index}
                    className="absolute animate-bounce text-4xl"
                    style={{
                        left: `${20 + index * 20}%`,
                        top: `${10 + (index % 2) * 30}%`,
                        animationDelay: `${index * 150}ms`,
                        animationDuration: '1s',
                    }}
                >
                    {emoji}
                </div>
            ))}
        </div>
    );
}

// ============================================
// AVATAR SELECTOR
// ============================================

interface AvatarSelectorProps {
    selected?: string;
    onSelect: (avatarId: string) => void;
    availableAvatars: Array<{ id: string; name: string; emoji: string }>;
}

export function AvatarSelector({ selected, onSelect, availableAvatars }: AvatarSelectorProps) {
    return (
        <div className="grid grid-cols-4 gap-3">
            {availableAvatars.map((avatar) => (
                <button
                    key={avatar.id}
                    onClick={() => onSelect(avatar.id)}
                    className={`
            p-4 rounded-xl text-3xl transition-all duration-200
            ${selected === avatar.id
                            ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                            : 'bg-gray-100 hover:bg-gray-200'}
          `}
                >
                    {avatar.emoji}
                </button>
            ))}
        </div>
    );
}

// ============================================
// PIN INPUT
// ============================================

interface PinInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export function PinInput({ length = 4, value, onChange, error }: PinInputProps) {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, char: string) => {
        if (!/^\d*$/.test(char)) return;

        const newValue = value.split('');
        newValue[index] = char;
        const newPin = newValue.join('').slice(0, length);
        onChange(newPin);

        // Auto-focus next input
        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div>
            <div className="flex justify-center gap-3">
                {Array.from({ length }).map((_, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value[index] || ''}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`
              w-14 h-16 text-center text-2xl font-bold rounded-xl border-2
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition-all duration-200
              ${error ? 'border-red-500' : 'border-gray-200'}
            `}
                    />
                ))}
            </div>
            {error && (
                <p className="text-center text-red-500 text-sm mt-3">{error}</p>
            )}
        </div>
    );
}
