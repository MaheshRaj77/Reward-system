// ============================================
// FLOATING FEEDBACK WIDGET COMPONENT
// A floating feedback form that appears on every page
// Saves feedback to Firestore with page and user context
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lightbulb, Bug, MessageSquare } from 'lucide-react';

interface FeedbackData {
    type: 'feature' | 'problem' | 'feedback';
    subject: string;
    message: string;
}

interface UserContext {
    userId: string | null;
    userName: string | null;
    userType: 'parent' | 'child' | 'admin' | 'guest';
    familyId: string | null;
}

export function FeedbackWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userContext, setUserContext] = useState<UserContext>({
        userId: null,
        userName: null,
        userType: 'guest',
        familyId: null
    });
    const [formData, setFormData] = useState<FeedbackData>({
        type: 'problem',
        subject: '',
        message: '',
    });

    // Get user context - check synchronously first, then async for Firebase
    useEffect(() => {
        // First, check localStorage synchronously for child session
        const childSession = localStorage.getItem('childSession');
        if (childSession) {
            try {
                const child = JSON.parse(childSession);
                console.log('[Feedback] Found child session:', child);
                setUserContext({
                    userId: child.childId || child.id || null,
                    userName: child.name || 'Child',
                    userType: 'child',
                    familyId: child.familyId || null
                });
                return; // Exit early if child found
            } catch (e) {
                console.error('[Feedback] Error parsing child session:', e);
            }
        }

        // Check for admin auth
        const adminAuth = localStorage.getItem('pinmbo_admin_auth');
        if (adminAuth === 'true') {
            console.log('[Feedback] Found admin session');
            setUserContext({
                userId: 'admin',
                userName: 'Admin',
                userType: 'admin',
                familyId: null
            });
            return; // Exit early if admin found
        }

        // Check Firebase auth for parent (async)
        const checkFirebaseAuth = async () => {
            try {
                const { auth, db } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');

                const user = auth.currentUser;
                if (user) {
                    console.log('[Feedback] Found Firebase user:', user.uid);
                    try {
                        const parentDoc = await getDoc(doc(db, 'parents', user.uid));
                        if (parentDoc.exists()) {
                            const parentData = parentDoc.data();
                            console.log('[Feedback] Found parent data:', parentData?.name);
                            setUserContext({
                                userId: user.uid,
                                userName: parentData?.displayName || parentData?.name || user.displayName || 'Parent',
                                userType: 'parent',
                                familyId: parentData?.familyId || user.uid
                            });
                            return;
                        }
                    } catch (e) {
                        console.error('[Feedback] Error getting parent data:', e);
                    }
                }

                // If no user found anywhere, remain as guest
                console.log('[Feedback] No user found, remaining as guest');
            } catch (e) {
                console.error('[Feedback] Error checking Firebase auth:', e);
            }
        };

        checkFirebaseAuth();
    }, []);

    const feedbackTypes = [
        { value: 'feature', label: 'Feature', Icon: Lightbulb },
        { value: 'problem', label: 'Problem', Icon: Bug },
        { value: 'feedback', label: 'Feedback', Icon: MessageSquare },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Get fresh user context at submit time
        let currentContext = { ...userContext };

        // Double-check Firebase auth for parent at submit time
        if (currentContext.userType === 'guest') {
            try {
                const { auth, db: fireDb } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const user = auth.currentUser;
                if (user) {
                    const parentDoc = await getDoc(doc(fireDb, 'parents', user.uid));
                    if (parentDoc.exists()) {
                        const parentData = parentDoc.data();
                        currentContext = {
                            userId: user.uid,
                            userName: parentData?.displayName || parentData?.name || user.displayName || 'Parent',
                            userType: 'parent',
                            familyId: parentData?.familyId || user.uid
                        };
                        console.log('[Feedback] Updated context from Firebase auth at submit:', currentContext);
                    }
                }
            } catch (e) {
                console.error('[Feedback] Error checking Firebase auth at submit:', e);
            }
        }

        // Double-check child session at submit time
        if (currentContext.userType === 'guest') {
            const childSession = localStorage.getItem('childSession');
            if (childSession) {
                try {
                    const child = JSON.parse(childSession);
                    currentContext = {
                        userId: child.childId || child.id || null,
                        userName: child.name || 'Child',
                        userType: 'child',
                        familyId: child.familyId || null
                    };
                    console.log('[Feedback] Updated context from child session at submit:', currentContext);
                } catch (e) {
                    console.error('[Feedback] Error re-parsing child session:', e);
                }
            }
        }

        // Double-check admin at submit time
        if (currentContext.userType === 'guest') {
            const adminAuth = localStorage.getItem('pinmbo_admin_auth');
            if (adminAuth === 'true') {
                currentContext = {
                    userId: 'admin',
                    userName: 'Admin',
                    userType: 'admin',
                    familyId: null
                };
                console.log('[Feedback] Updated context from admin auth at submit');
            }
        }

        console.log('[Feedback] Submitting with context:', currentContext);

        try {
            // Save to Firestore
            await addDoc(collection(db, 'feedback'), {
                // Feedback content
                type: formData.type,
                subject: formData.subject || null,
                message: formData.message,

                // Page context
                pagePath: pathname,
                pageTitle: document.title || null,

                // User context
                userId: currentContext.userId,
                userName: currentContext.userName,
                userType: currentContext.userType,
                familyId: currentContext.familyId,

                // Metadata
                userAgent: navigator.userAgent,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                createdAt: serverTimestamp(),
                status: 'new' // new, reviewed, resolved
            });

            console.log('[Feedback] Saved to Firestore:', {
                type: formData.type,
                page: pathname,
                user: currentContext.userName || 'Guest'
            });

            setIsSubmitting(false);
            setIsSubmitted(true);

            // Reset after showing success
            setTimeout(() => {
                setIsOpen(false);
                setIsSubmitted(false);
                setFormData({ type: 'problem', subject: '', message: '' });
            }, 2000);
        } catch (error) {
            console.error('[Feedback] Failed to save:', error);
            setIsSubmitting(false);
            alert('Failed to submit feedback. Please try again.');
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    fixed bottom-6 right-6 z-50
                    w-14 h-14 rounded-full
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    text-white shadow-lg shadow-indigo-500/30
                    flex items-center justify-center
                    hover:from-indigo-600 hover:to-purple-700
                    hover:shadow-xl hover:shadow-indigo-500/40
                    hover:scale-110
                    active:scale-95
                    transition-all duration-300 ease-out
                    ${isOpen ? 'rotate-45' : 'rotate-0'}
                `}
                aria-label="Open feedback form"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>

            {/* Feedback Form Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <div className="absolute top-6 right-6 z-10">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-8">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-3xl">💬</span>
                                <h2 className="text-2xl font-bold text-gray-900">Share Your Feedback</h2>
                            </div>

                            {isSubmitted ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-6 animate-bounce">🎉</div>
                                    <h4 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h4>
                                    <p className="text-gray-600">Your feedback helps us improve.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Feedback Type Selection */}
                                    <div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {feedbackTypes.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as FeedbackData['type'] }))}
                                                    className={`
                                                        p-6 rounded-2xl border-2 transition-all duration-200 text-center
                                                        flex flex-col items-center justify-center gap-3
                                                        ${formData.type === type.value
                                                            ? 'bg-indigo-50 border-indigo-500 border-4 shadow-lg'
                                                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                                        }
                                                    `}
                                                >
                                                    <type.Icon size={32} className={formData.type === type.value ? 'text-indigo-600' : 'text-gray-500'} />
                                                    <span className={`text-sm font-semibold ${formData.type === type.value ? 'text-indigo-600' : 'text-gray-700'
                                                        }`}>
                                                        {type.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Subject Field */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            Subject <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                            placeholder="Brief summary..."
                                            className="
                                                w-full px-4 py-3 rounded-2xl border border-gray-200
                                                bg-white text-gray-900 placeholder-gray-400
                                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                transition-all duration-200 text-base
                                            "
                                        />
                                    </div>

                                    {/* Message Field */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                            {formData.type === 'problem' ? 'What went wrong?' : 'Your Message'}
                                        </label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                            placeholder={formData.type === 'problem' ? 'Tell us more...' : 'Share your thoughts...'}
                                            required
                                            rows={5}
                                            className="
                                                w-full px-4 py-3 rounded-2xl border border-gray-200
                                                bg-white text-gray-900 placeholder-gray-400
                                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                transition-all duration-200 resize-none text-base
                                            "
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.message}
                                        className={`
                                            w-full py-4 px-6 rounded-2xl font-semibold text-base
                                            bg-gradient-to-r from-indigo-500 to-indigo-600 text-white
                                            hover:from-indigo-600 hover:to-indigo-700
                                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                            transition-all duration-200
                                            shadow-lg shadow-indigo-500/25
                                            flex items-center justify-center gap-2
                                            ${(isSubmitting || !formData.message) ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl'}
                                        `}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <span>✈️</span>
                                                Submit Feedback
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
