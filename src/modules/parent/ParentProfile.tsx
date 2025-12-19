'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParentAuth } from './use-parent-auth';
import { parentService } from './parent.service';
import { DEFAULT_NOTIFICATIONS } from './types';
import { requestNotificationPermission, isPushSupported, getNotificationPermission } from '@/lib/push-notifications';

export function ParentProfile() {
    const { parent, user, logout, refreshParent } = useParentAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Email change states
    const [showEmailChange, setShowEmailChange] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
    const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

    // Mobile change states
    const [showMobileChange, setShowMobileChange] = useState(false);
    const [newMobileNumber, setNewMobileNumber] = useState('');
    const [mobileOtp, setMobileOtp] = useState('');
    const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
    const [showMobileOtpInput, setShowMobileOtpInput] = useState(false);
    const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);

    // Verify existing email states
    const [showVerifyExistingEmail, setShowVerifyExistingEmail] = useState(false);
    const [showVerifyEmailOtpInput, setShowVerifyEmailOtpInput] = useState(false);
    const [verifyEmailOtp, setVerifyEmailOtp] = useState('');
    const [sendingVerifyOtp, setSendingVerifyOtp] = useState(false);
    const [verifyingExistingEmailOtp, setVerifyingExistingEmailOtp] = useState(false);

    // Notification states
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
    const [updatingNotification, setUpdatingNotification] = useState<string | null>(null);

    useEffect(() => {
        if (parent) {
            setName(parent.name || '');
            setNotifications(parent.notifications || DEFAULT_NOTIFICATIONS);
        }
    }, [parent]);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await parentService.updateParent(user.uid, { name });
            setSuccess('Name updated!');
            setIsEditing(false);
            await refreshParent();
        } catch {
            setError('Failed to update name');
        } finally {
            setLoading(false);
        }
    };

    // Email OTP handlers
    const handleSendEmailOtp = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            setError('Please enter a valid email');
            return;
        }
        setSendingEmailOtp(true);
        setError('');
        try {
            const res = await fetch('/api/auth/email-otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });
            const data = await res.json();
            if (data.success) {
                setShowEmailOtpInput(true);
                setSuccess('OTP sent!');
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch {
            setError('Failed to send OTP');
        } finally {
            setSendingEmailOtp(false);
        }
    };

    const handleVerifyEmailOtp = async () => {
        if (!user || !newEmail) return;
        setVerifyingEmailOtp(true);
        setError('');
        try {
            const res = await fetch('/api/auth/email-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, code: emailOtp }),
            });
            const data = await res.json();
            if (data.success) {
                await parentService.updateParent(user.uid, { email: newEmail, isEmailVerified: true });
                setShowEmailChange(false);
                setShowEmailOtpInput(false);
                setEmailOtp('');
                setNewEmail('');
                setSuccess('Email verified!');
                await refreshParent();
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch {
            setError('Failed to verify');
        } finally {
            setVerifyingEmailOtp(false);
        }
    };

    const cancelEmailChange = () => {
        setShowEmailChange(false);
        setShowEmailOtpInput(false);
        setNewEmail('');
        setEmailOtp('');
    };

    // Verify existing email
    const handleSendVerifyExistingEmailOtp = async () => {
        if (!parent?.email) return;
        setSendingVerifyOtp(true);
        setError('');
        try {
            const res = await fetch('/api/auth/email-otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: parent.email }),
            });
            const data = await res.json();
            if (data.success) {
                setShowVerifyEmailOtpInput(true);
                setSuccess('OTP sent!');
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch {
            setError('Failed to send OTP');
        } finally {
            setSendingVerifyOtp(false);
        }
    };

    const handleVerifyExistingEmailOtp = async () => {
        if (!user || !parent?.email) return;
        setVerifyingExistingEmailOtp(true);
        setError('');
        try {
            const res = await fetch('/api/auth/email-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: parent.email, code: verifyEmailOtp }),
            });
            const data = await res.json();
            if (data.success) {
                await parentService.verifyEmail(user.uid);
                setShowVerifyExistingEmail(false);
                setShowVerifyEmailOtpInput(false);
                setVerifyEmailOtp('');
                setSuccess('Email verified!');
                await refreshParent();
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch {
            setError('Failed to verify');
        } finally {
            setVerifyingExistingEmailOtp(false);
        }
    };

    const cancelVerifyExistingEmail = () => {
        setShowVerifyExistingEmail(false);
        setShowVerifyEmailOtpInput(false);
        setVerifyEmailOtp('');
    };

    // Mobile OTP handlers
    const handleSendMobileOtp = async () => {
        if (!newMobileNumber || newMobileNumber.length < 10) {
            setError('Enter a valid mobile number');
            return;
        }
        setSendingMobileOtp(true);
        setError('');
        try {
            const res = await fetch('/api/otp/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: newMobileNumber }),
            });
            const data = await res.json();
            if (data.success) {
                setShowMobileOtpInput(true);
                setSuccess('OTP sent!');
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch {
            setError('Failed to send OTP');
        } finally {
            setSendingMobileOtp(false);
        }
    };

    const handleVerifyMobileOtp = async () => {
        if (!user || !newMobileNumber) return;
        setVerifyingMobileOtp(true);
        setError('');
        try {
            const res = await fetch('/api/otp/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: newMobileNumber, code: mobileOtp }),
            });
            const data = await res.json();
            if (data.success) {
                await parentService.updateParent(user.uid, { mobileNumber: newMobileNumber });
                setShowMobileChange(false);
                setShowMobileOtpInput(false);
                setMobileOtp('');
                setNewMobileNumber('');
                setSuccess('Mobile updated!');
                await refreshParent();
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch {
            setError('Failed to verify');
        } finally {
            setVerifyingMobileOtp(false);
        }
    };

    const cancelMobileChange = () => {
        setShowMobileChange(false);
        setShowMobileOtpInput(false);
        setNewMobileNumber('');
        setMobileOtp('');
    };

    // Notification toggle handler
    const handleNotificationToggle = async (type: keyof typeof DEFAULT_NOTIFICATIONS) => {
        if (!user) return;

        // Check requirements
        if (type === 'email' && !parent?.isEmailVerified) {
            setError('Verify your email first');
            return;
        }
        if (type === 'sms' && !parent?.mobileNumber) {
            setError('Add mobile number first');
            return;
        }
        if (type === 'whatsapp' && !parent?.mobileNumber) {
            setError('Add mobile number first');
            return;
        }

        // Special handling for push notifications
        if (type === 'push') {
            const newValue = !notifications[type];

            if (newValue) {
                // Enabling push notifications
                if (!isPushSupported()) {
                    setError('Push notifications are not supported in this browser');
                    return;
                }

                const currentPermission = getNotificationPermission();
                if (currentPermission === 'denied') {
                    setError('Notifications are blocked. Please enable them in your browser settings.');
                    return;
                }

                setUpdatingNotification(type);
                setError('');

                try {
                    console.log('[ParentProfile] Starting push notification setup...');

                    // Request permission and get FCM token
                    const token = await requestNotificationPermission();

                    if (!token) {
                        console.error('[ParentProfile] No token received');
                        setError('Failed to enable notifications. Permission may have been denied. Check browser console for details.');
                        setUpdatingNotification(null);
                        return;
                    }

                    console.log('[ParentProfile] Token received:', token.slice(0, 20) + '...');

                    // Save token to Firestore
                    console.log('[ParentProfile] Saving FCM token to Firestore...');
                    const tokenResult = await parentService.saveFcmToken(user.uid, token);
                    if (!tokenResult.success) {
                        console.error('[ParentProfile] Failed to save token:', tokenResult.error);
                        setError(tokenResult.error || 'Failed to save notification token');
                        setUpdatingNotification(null);
                        return;
                    }

                    console.log('[ParentProfile] Token saved successfully');

                    // Update notification setting
                    console.log('[ParentProfile] Updating notification settings...');
                    const result = await parentService.updateNotification(user.uid, type, true);
                    if (result.success) {
                        console.log('[ParentProfile] Notification setting updated');
                        setNotifications(prev => ({ ...prev, [type]: true }));
                        setSuccess('Push notifications enabled! 🔔');
                        await refreshParent();
                    } else {
                        console.error('[ParentProfile] Failed to update notification setting:', result.error);
                        setError(result.error || 'Failed to update');
                    }
                } catch (err) {
                    console.error('[ParentProfile] Push notification setup error:', err);
                    if (err instanceof Error) {
                        setError(`Failed to enable push notifications: ${err.message}`);
                    } else {
                        setError('Failed to enable push notifications');
                    }
                } finally {
                    setUpdatingNotification(null);
                }
                return;
            } else {
                // Disabling push notifications
                setUpdatingNotification(type);
                setError('');

                try {
                    // Remove FCM token
                    await parentService.removeFcmToken(user.uid);

                    // Update notification setting
                    const result = await parentService.updateNotification(user.uid, type, false);
                    if (result.success) {
                        setNotifications(prev => ({ ...prev, [type]: false }));
                        setSuccess('Push notifications disabled');
                        await refreshParent();
                    } else {
                        setError(result.error || 'Failed to update');
                    }
                } catch {
                    setError('Failed to disable push notifications');
                } finally {
                    setUpdatingNotification(null);
                }
                return;
            }
        }

        // Default handling for other notification types
        setUpdatingNotification(type);
        setError('');

        try {
            const newValue = !notifications[type];
            const result = await parentService.updateNotification(user.uid, type, newValue);

            if (result.success) {
                setNotifications(prev => ({ ...prev, [type]: newValue }));
                setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${newValue ? 'enabled' : 'disabled'}`);
                await refreshParent();
            } else {
                setError(result.error || 'Failed to update');
            }
        } catch {
            setError('Failed to update notifications');
        } finally {
            setUpdatingNotification(null);
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/auth/login';
    };

    if (!parent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const notificationConfig = [
        {
            key: 'email' as const,
            label: 'Email Notifications',
            desc: 'Receive updates via email',
            icon: '📧',
            disabled: !parent.isEmailVerified,
            disabledMsg: 'Verify email first'
        },
        {
            key: 'sms' as const,
            label: 'SMS Notifications',
            desc: 'Receive updates via SMS',
            icon: '💬',
            disabled: !parent.mobileNumber,
            disabledMsg: 'Add mobile first'
        },
        {
            key: 'whatsapp' as const,
            label: 'WhatsApp Notifications',
            desc: 'Receive updates on WhatsApp',
            icon: '📱',
            disabled: !parent.mobileNumber,
            disabledMsg: 'Add mobile first'
        },
        {
            key: 'push' as const,
            label: 'Push Notifications',
            desc: 'Mobile & browser push notifications',
            icon: '🔔',
            disabled: false,
            disabledMsg: ''
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/dashboard" className="text-blue-500 font-medium">
                        ← Back
                    </Link>
                    <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
                    <button onClick={handleLogout} className="text-red-500 font-medium">
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm">
                        {success}
                    </div>
                )}

                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mb-3">
                        {parent.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{parent.name || 'Parent'}</h2>
                    <p className="text-gray-500 text-sm">{parent.mobileNumber}</p>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Information</h3>
                    </div>

                    {/* Name Row */}
                    <div className="px-4 py-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Name</span>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-blue-500 text-sm font-medium">
                                    Edit
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <form onSubmit={handleUpdateName} className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                    Save
                                </button>
                                <button type="button" onClick={() => { setIsEditing(false); setName(parent.name || ''); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <p className="text-gray-900 font-medium mt-1">{parent.name || '-'}</p>
                        )}
                    </div>

                    {/* Mobile Row */}
                    <div className="px-4 py-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Mobile</span>
                            {!showMobileChange && (
                                <button onClick={() => setShowMobileChange(true)} className="text-blue-500 text-sm font-medium">
                                    Change
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-900 font-medium">{parent.mobileNumber || '-'}</p>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
                        </div>

                        {showMobileChange && !showMobileOtpInput && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                                <input
                                    type="tel"
                                    value={newMobileNumber}
                                    onChange={(e) => setNewMobileNumber(e.target.value.replace(/[^\d+]/g, ''))}
                                    placeholder="+91 9876543210"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSendMobileOtp} disabled={sendingMobileOtp} className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {sendingMobileOtp ? 'Sending...' : 'Send OTP'}
                                    </button>
                                    <button onClick={cancelMobileChange} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {showMobileOtpInput && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl space-y-2">
                                <p className="text-xs text-blue-700">Enter OTP sent to {newMobileNumber}</p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={mobileOtp}
                                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleVerifyMobileOtp} disabled={mobileOtp.length !== 6 || verifyingMobileOtp} className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {verifyingMobileOtp ? 'Verifying...' : 'Verify'}
                                    </button>
                                    <button onClick={cancelMobileChange} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Email Row */}
                    <div className="px-4 py-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Email</span>
                            <div className="flex gap-2">
                                {parent.email && !parent.isEmailVerified && !showVerifyExistingEmail && (
                                    <button onClick={() => setShowVerifyExistingEmail(true)} className="text-orange-500 text-sm font-medium">
                                        Verify
                                    </button>
                                )}
                                {!showEmailChange && (
                                    <button onClick={() => setShowEmailChange(true)} className="text-blue-500 text-sm font-medium">
                                        {parent.email ? 'Change' : 'Add'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-900 font-medium">{parent.email || <span className="text-gray-400">Not added</span>}</p>
                            {parent.email && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${parent.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {parent.isEmailVerified ? '✓ Verified' : 'Pending'}
                                </span>
                            )}
                        </div>

                        {/* Verify existing email */}
                        {showVerifyExistingEmail && !showVerifyEmailOtpInput && (
                            <div className="mt-3 p-3 bg-orange-50 rounded-xl space-y-2">
                                <p className="text-xs text-orange-700">Verify {parent.email}</p>
                                <div className="flex gap-2">
                                    <button onClick={handleSendVerifyExistingEmailOtp} disabled={sendingVerifyOtp} className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {sendingVerifyOtp ? 'Sending...' : 'Send OTP'}
                                    </button>
                                    <button onClick={cancelVerifyExistingEmail} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {showVerifyEmailOtpInput && (
                            <div className="mt-3 p-3 bg-orange-50 rounded-xl space-y-2">
                                <p className="text-xs text-orange-700">Enter OTP sent to {parent.email}</p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={verifyEmailOtp}
                                    onChange={(e) => setVerifyEmailOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleVerifyExistingEmailOtp} disabled={verifyEmailOtp.length !== 6 || verifyingExistingEmailOtp} className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {verifyingExistingEmailOtp ? 'Verifying...' : 'Verify'}
                                    </button>
                                    <button onClick={cancelVerifyExistingEmail} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add/Change email */}
                        {showEmailChange && !showEmailOtpInput && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSendEmailOtp} disabled={sendingEmailOtp} className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {sendingEmailOtp ? 'Sending...' : 'Send OTP'}
                                    </button>
                                    <button onClick={cancelEmailChange} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {showEmailOtpInput && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl space-y-2">
                                <p className="text-xs text-blue-700">Enter OTP sent to {newEmail}</p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={emailOtp}
                                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleVerifyEmailOtp} disabled={emailOtp.length !== 6 || verifyingEmailOtp} className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
                                        {verifyingEmailOtp ? 'Verifying...' : 'Verify'}
                                    </button>
                                    <button onClick={cancelEmailChange} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifications Card */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Notifications</h3>
                    </div>

                    {notificationConfig.map((item, index) => (
                        <div key={item.key} className={`px-4 py-4 ${index < notificationConfig.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <p className="text-gray-900 font-medium">{item.label}</p>
                                        <p className="text-gray-500 text-xs">{item.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleNotificationToggle(item.key)}
                                    disabled={loading || item.disabled || updatingNotification === item.key}
                                    className={`relative w-12 h-7 rounded-full transition-colors ${notifications[item.key] ? 'bg-blue-500' : item.disabled ? 'bg-gray-200' : 'bg-gray-300'
                                        } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key] ? 'translate-x-5' : ''
                                        }`} />
                                </button>
                            </div>
                            {item.disabled && (
                                <p className="text-orange-600 text-xs mt-2 bg-orange-50 px-2 py-1 rounded">
                                    ⚠️ {item.disabledMsg}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick Links</h3>
                    </div>
                    <Link href="/dashboard" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <span className="text-gray-900">🏠 Dashboard</span>
                        <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/children" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <span className="text-gray-900">👶 Children</span>
                        <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/tasks" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <span className="text-gray-900">✅ Tasks</span>
                        <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/rewards" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
                        <span className="text-gray-900">🎁 Rewards</span>
                        <span className="text-gray-400">→</span>
                    </Link>
                </div>

                <p className="text-center text-gray-400 text-xs py-4">Pinmbo v1.0</p>
            </main>
        </div>
    );
}
