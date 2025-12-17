'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
    target: string;
    title: string;
    content: string;
    icon: string;
}

interface DashboardTourProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: '[data-tour="quick-actions"]',
        title: 'Quick Actions',
        content: 'Create tasks for your kids, set up rewards, and manage your family from here.',
        icon: '🚀',
    },
    {
        target: '[data-tour="stats"]',
        title: 'Family Stats',
        content: 'Track stars earned, active tasks, completions, and streaks at a glance.',
        icon: '📊',
    },
    {
        target: '[data-tour="children"]',
        title: 'Your Children',
        content: 'View and manage your children. Tap any child to see their full profile.',
        icon: '👨‍👩‍👧‍👦',
    },
    {
        target: '[data-tour="approvals"]',
        title: 'Approvals',
        content: 'Review completed tasks and reward requests from your kids here.',
        icon: '✅',
    },
];

export function DashboardTour({ isOpen, onClose, onComplete }: DashboardTourProps) {
    const [step, setStep] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setStep(0);
        }
    }

    const currentStep = TOUR_STEPS[step];


    const updatePosition = useCallback(() => {
        if (!currentStep) return;

        const el = document.querySelector(currentStep.target);
        if (el) {
            const rect = el.getBoundingClientRect();
            const tooltipHeight = 320; // More accurate estimate
            const tooltipWidth = 320; // w-80 = 320px
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Calculate available space
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Determine vertical position
            let tooltipTop: number;
            if (spaceBelow >= tooltipHeight + 16) {
                // Enough space below - position below
                tooltipTop = rect.bottom + 16;
            } else if (spaceAbove >= tooltipHeight + 16) {
                // Not enough space below but enough above - position above
                tooltipTop = rect.top - tooltipHeight - 16;
            } else {
                // Not enough space either side - position where there's more space
                if (spaceBelow > spaceAbove) {
                    tooltipTop = Math.max(16, viewportHeight - tooltipHeight - 16);
                } else {
                    tooltipTop = 16;
                }
            }

            // Determine horizontal position (centered on element, but within viewport)
            let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            tooltipLeft = Math.max(16, Math.min(tooltipLeft, viewportWidth - tooltipWidth - 16));

            setPosition({
                top: tooltipTop,
                left: tooltipLeft,
            });
            setTargetRect(rect);
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStep]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(updatePosition, 100);
        }
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(updatePosition, 50);
        }
    }, [step, isOpen, updatePosition]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    const goNext = () => {
        if (step < TOUR_STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            onComplete();
        }
    };

    const goPrev = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    };

    const handleClose = () => {
        setStep(0);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay with Spotlight */}
            <div className="fixed inset-0 z-[100]">
                <svg
                    className="absolute inset-0 w-full h-full"
                    onClick={handleClose}
                    style={{ cursor: 'pointer' }}
                >
                    <defs>
                        <mask id="spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 8}
                                    y={targetRect.top - 8}
                                    width={targetRect.width + 16}
                                    height={targetRect.height + 16}
                                    rx="12"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.6)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>
            </div>

            {/* Highlighted Element Border */}
            {targetRect && (
                <div
                    className="fixed z-[100] pointer-events-none"
                    style={{
                        left: targetRect.left - 8,
                        top: targetRect.top - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                >
                    <div className="w-full h-full rounded-xl ring-4 ring-indigo-500 ring-offset-0 animate-pulse" />
                </div>
            )}

            {/* Tooltip */}
            <div
                className="fixed z-[101] w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
                style={{ top: position.top, left: position.left }}
            >
                {/* Progress bar */}
                <div className="flex h-1">
                    {TOUR_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 ${i <= step ? 'bg-indigo-500' : 'bg-gray-200'}`}
                        />
                    ))}
                </div>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{currentStep.icon}</span>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Step {step + 1} of {TOUR_STEPS.length}</p>
                            <h3 className="font-bold text-gray-900">{currentStep.title}</h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-gray-600 text-sm leading-relaxed">{currentStep.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Skip
                    </button>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={goPrev}
                                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={goNext}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                        >
                            {step === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
                            {step < TOUR_STEPS.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
