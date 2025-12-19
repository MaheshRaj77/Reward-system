'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PinInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    showVisibilityToggle?: boolean;
}

export function PinInput({
    value,
    onChange,
    length = 4,
    disabled = false,
    showVisibilityToggle = true
}: PinInputProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-hide after 2 seconds
    useEffect(() => {
        if (isVisible) {
            timerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 2000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isVisible]);

    const handleChange = (index: number, inputValue: string) => {
        const digit = inputValue.replace(/\D/g, '').slice(-1);

        if (digit) {
            const newValue = value.split('');
            newValue[index] = digit;
            const updatedValue = newValue.join('').slice(0, length);
            onChange(updatedValue);

            if (index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const newValue = value.split('');

            if (newValue[index]) {
                newValue[index] = '';
                onChange(newValue.join(''));
            } else if (index > 0) {
                newValue[index - 1] = '';
                onChange(newValue.join(''));
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange(pastedData);
        const nextIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
    };

    const toggleVisibility = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(prev => !prev);
    };

    return (
        <div className="flex items-center justify-center gap-3">
            <div className="flex gap-3">
                {Array.from({ length }).map((_, index) => (
                    <input
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        type={isVisible ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={1}
                        value={value[index] || ''}
                        onChange={e => handleChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        disabled={disabled}
                        className={`
                            w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 
                            transition-all duration-200 outline-none shadow-sm
                            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}
                            ${focusedIndex === index
                                ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-100'
                                : value[index]
                                    ? 'border-indigo-400 bg-gradient-to-b from-indigo-50 to-white'
                                    : 'border-gray-200 hover:border-gray-300'
                            }
                        `}
                    />
                ))}
            </div>

            {showVisibilityToggle && (
                <button
                    type="button"
                    onClick={toggleVisibility}
                    className={`
                        p-3 rounded-xl transition-all
                        ${isVisible
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }
                    `}
                    title={isVisible ? 'Hide PIN' : 'Show PIN (auto-hides in 2s)'}
                >
                    {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            )}
        </div>
    );
}

// Display-only PIN component (for showing existing PINs)
interface PinDisplayProps {
    pin: string;
    length?: number;
}

export function PinDisplay({ pin, length = 4 }: PinDisplayProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-hide after 2 seconds
    useEffect(() => {
        if (isVisible) {
            timerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 2000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isVisible]);

    const toggleVisibility = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(prev => !prev);
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-2">
                {Array.from({ length }).map((_, index) => (
                    <div
                        key={index}
                        className={`
                            w-10 h-12 flex items-center justify-center rounded-xl text-xl font-bold
                            transition-all duration-200 shadow-sm
                            ${isVisible
                                ? 'bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-200 text-indigo-700'
                                : 'bg-gradient-to-b from-amber-50 to-white border-2 border-amber-200 text-amber-500'
                            }
                        `}
                    >
                        {isVisible ? (pin[index] || '') : (pin[index] ? '★' : '')}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={toggleVisibility}
                className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${isVisible
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }
                `}
            >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isVisible ? 'Hide' : 'Show'}</span>
            </button>
        </div>
    );
}
