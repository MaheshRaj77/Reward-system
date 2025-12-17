'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, query, where, getDocs, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
import { canUseRecurringTasks, SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/constants/subscription';
import { ChevronLeft, Upload, Clock, Calendar, Star, Users, Check, X, Repeat, Image as ImageIcon, MessageSquare, Camera, ShieldCheck } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    taskCount: number;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const WEEKDAYS = [
    { id: 1, label: 'M', full: 'Monday' },
    { id: 2, label: 'T', full: 'Tuesday' },
    { id: 3, label: 'W', full: 'Wednesday' },
    { id: 4, label: 'T', full: 'Thursday' },
    { id: 5, label: 'F', full: 'Friday' },
    { id: 6, label: 'S', full: 'Saturday' },
    { id: 0, label: 'S', full: 'Sunday' },
];

export default function CreateTaskPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const [children, setChildren] = useState<ChildData[]>([]);

    // Auth & Subscription
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const [canUseRecurring, setCanUseRecurring] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'chores' as keyof typeof TASK_CATEGORIES,
        starValue: 5,
        assignedTo: [] as string[],
        frequencyType: 'one-time' as 'one-time' | 'daily' | 'weekly' | 'monthly',
        selectedDays: [] as number[], // For weekly
        selectedDates: [] as number[], // For monthly (1-31)
        imageBase64: '',
        proofRequired: 'none' as 'none' | 'photo',
        isAutoApproved: false,
        isChatEnabled: false,
        deadline: '', // YYYY-MM-DD format
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.id);

                // Load subscription
                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    const plan = parentData.subscription?.plan || 'free';
                    setSubscription(plan);
                    setCanUseRecurring(canUseRecurringTasks(plan));
                }

                // Load children with task counts
                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.id)
                );
                const childSnapshot = await getDocs(childrenQuery);

                const childrenData: ChildData[] = [];
                for (const childDoc of childSnapshot.docs) {
                    const data = childDoc.data();

                    // Simple count active tasks
                    const tasksQuery = query(
                        collection(db, 'tasks'),
                        where('familyId', '==', parent.id),
                        where('assignedChildIds', 'array-contains', childDoc.id),
                        where('isActive', '==', true)
                    );
                    const tasksSnapshot = await getDocs(tasksQuery);

                    childrenData.push({
                        id: childDoc.id,
                        name: data.name,
                        avatar: data.avatar,
                        taskCount: tasksSnapshot.size,
                    });
                }

                setChildren(childrenData);
                // Auto-select first child if not assigned
                if (childrenData.length > 0) {
                    setFormData(prev => ({ ...prev, assignedTo: [childrenData[0].id] }));
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                router.push('/auth/login');
            }
        };

        loadData();
    }, [router]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB Limit
                alert("File is too large! Please choose an image under 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleDay = (dayId: number) => {
        setFormData(prev => {
            const current = prev.selectedDays;
            if (current.includes(dayId)) {
                return { ...prev, selectedDays: current.filter(d => d !== dayId) };
            } else {
                return { ...prev, selectedDays: [...current, dayId] };
            }
        });
    };

    const toggleMonthDate = (date: number) => {
        setFormData(prev => {
            const current = prev.selectedDates;
            if (current.includes(date)) {
                return { ...prev, selectedDates: current.filter(d => d !== date) };
            } else {
                return { ...prev, selectedDates: [...current, date].sort((a, b) => a - b) };
            }
        });
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            setError('Please enter a task title');
            return;
        }
        if (formData.assignedTo.length === 0) {
            setError('Please assign to at least one child');
            return;
        }

        const isRecurring = formData.frequencyType !== 'one-time';

        if (formData.frequencyType === 'weekly' && formData.selectedDays.length === 0) {
            setError('Please select at least one day for weekly tasks');
            return;
        }

        if (formData.frequencyType === 'monthly' && formData.selectedDates.length === 0) {
            setError('Please select at least one date for monthly tasks');
            return;
        }

        // Check Recurring Permission
        if (isRecurring && !canUseRecurring) {
            setError('Recurring tasks require Premium.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // Build frequency object conditionally to avoid undefined values
            let frequency = null;
            if (isRecurring) {
                frequency = {
                    type: formData.frequencyType as 'daily' | 'weekly' | 'monthly',
                    interval: 1
                };
                if (formData.frequencyType === 'weekly') {
                    frequency = { ...frequency, daysOfWeek: formData.selectedDays };
                }
                if (formData.frequencyType === 'monthly') {
                    frequency = { ...frequency, daysOfMonth: formData.selectedDates };
                }
            }

            // Construct Task Object
            const taskData = {
                familyId,
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                starValue: formData.starValue,
                starType: 'growth', // Default star type
                assignedChildIds: formData.assignedTo,
                taskType: isRecurring ? 'recurring' : 'one-time',
                frequency,
                deadline: formData.deadline ? Timestamp.fromDate(new Date(formData.deadline)) : null,
                imageBase64: formData.imageBase64 || null,
                proofRequired: formData.proofRequired,
                isAutoApproved: formData.isAutoApproved,
                isChatEnabled: formData.isChatEnabled,
                status: 'active', // Task status
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: 'parent',
            };

            await addDoc(collection(db, 'tasks'), taskData);
            router.push('/tasks');
        } catch (err) {
            console.error(err);
            setError('Failed to create task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" /></div>;

    const currentCategory = TASK_CATEGORIES[formData.category];

    // Generate days for monthly selector (1-31)
    const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Define a task for your children</p>
                        </div>
                        <Link
                            href="/tasks"
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

                {/* 1. Task Details */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Task Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Clean your room"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-lg placeholder:font-normal"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Category</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {(Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, any][]).slice(0, 6).map(([key, cat]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: key })}
                                    className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2 ${formData.category === key ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <span className="text-2xl">{cat.icon}</span>
                                    <span className="text-xs font-bold">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Star Reward</label>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, starValue: Math.max(1, formData.starValue - 1) })}
                                    className="w-11 h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
                                >
                                    −
                                </button>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.starValue}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 1;
                                            setFormData({ ...formData, starValue: Math.max(1, Math.min(999, val)) });
                                        }}
                                        min="1"
                                        max="999"
                                        className="w-20 h-14 text-center text-2xl font-black text-amber-600 bg-white border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none shadow-sm"
                                    />
                                    <Star className="absolute -top-1.5 -right-1.5 text-amber-400 fill-amber-400" size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, starValue: Math.min(999, formData.starValue + 1) })}
                                    className="w-11 h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
                                >
                                    +
                                </button>

                                <div className="border-l border-amber-200 h-10 mx-2"></div>

                                {/* Quick Select Buttons - inline */}
                                <div className="flex gap-1.5">
                                    {[5, 10, 15, 20, 25, 50].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, starValue: val })}
                                            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${formData.starValue === val ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 hover:bg-amber-100 border border-amber-200'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Options (Proof & Approval) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50 space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-500" size={20} />
                        Task Options
                    </h3>

                    <div className="space-y-6">
                        {/* Row 1: Proof & Auto-Approval */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Proof Required */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Proof Required</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFormData({ ...formData, proofRequired: 'none' })}
                                        className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all ${formData.proofRequired === 'none' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        None
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, proofRequired: 'photo' })}
                                        className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${formData.proofRequired === 'photo' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                        <Camera size={16} />
                                        <span>Photo</span>
                                    </button>
                                </div>
                            </div>

                            {/* Auto Approval */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Approval</label>
                                <div
                                    onClick={() => setFormData({ ...formData, isAutoApproved: !formData.isAutoApproved })}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.isAutoApproved ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-bold ${formData.isAutoApproved ? 'text-green-800' : 'text-slate-700'}`}>
                                            {formData.isAutoApproved ? 'Auto-Approve ✨' : 'Parent Approval'}
                                        </span>
                                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isAutoApproved ? 'bg-green-500' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isAutoApproved ? 'translate-x-4' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Chat Enable */}
                        <div>
                            <div
                                onClick={() => setFormData({ ...formData, isChatEnabled: !formData.isChatEnabled })}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${formData.isChatEnabled ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${formData.isChatEnabled ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <div className={`font-bold ${formData.isChatEnabled ? 'text-blue-900' : 'text-slate-700'}`}>Enable Task Chat</div>
                                        <div className="text-xs opacity-70">Allow child to ask questions or clarify doubts about this task</div>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isChatEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isChatEnabled ? 'translate-x-4' : ''}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Schedule */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                        <Clock className="text-indigo-500" size={20} />
                        Schedule & Timing
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Frequency */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">Frequency</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, frequencyType: 'one-time' })}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${formData.frequencyType === 'one-time'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                                >
                                    <span className="text-2xl block mb-1">📌</span>
                                    <span className="font-bold text-sm">One Time</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'daily' }) : router.push('/subscriptions')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all relative ${formData.frequencyType === 'daily'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                                >
                                    <span className="text-2xl block mb-1">🔄</span>
                                    <span className="font-bold text-sm">Daily</span>
                                    {!canUseRecurring && <span className="absolute top-2 right-2 text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'weekly' }) : router.push('/subscriptions')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all relative ${formData.frequencyType === 'weekly'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                                >
                                    <span className="text-2xl block mb-1">📅</span>
                                    <span className="font-bold text-sm">Weekly</span>
                                    {!canUseRecurring && <span className="absolute top-2 right-2 text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'monthly' }) : router.push('/subscriptions')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all relative ${formData.frequencyType === 'monthly'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                                >
                                    <span className="text-2xl block mb-1">📆</span>
                                    <span className="font-bold text-sm">Monthly</span>
                                    {!canUseRecurring && <span className="absolute top-2 right-2 text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                </button>
                            </div>

                            {/* Daily Info */}
                            {formData.frequencyType === 'daily' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                    <p className="text-sm font-medium text-green-700 text-center">✨ This task will appear every day</p>
                                </div>
                            )}

                            {/* Weekly Selector */}
                            {formData.frequencyType === 'weekly' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3 block">Select Days</span>
                                    <div className="flex justify-between gap-1">
                                        {WEEKDAYS.map(day => {
                                            const isSelected = formData.selectedDays.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-blue-200'}`}
                                                >
                                                    {day.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Monthly Selector */}
                            {formData.frequencyType === 'monthly' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3 block">Select Dates</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {monthDays.map(d => {
                                            const isSelected = formData.selectedDates.includes(d);
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => toggleMonthDate(d)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${isSelected ? 'bg-purple-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600 border border-purple-200'}`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Deadline */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                                Deadline
                                <span className="text-xs font-normal text-slate-400 normal-case">(Optional)</span>
                            </label>
                            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Set a deadline</p>
                                        <p className="text-xs text-slate-500">Task will be marked overdue after this</p>
                                    </div>
                                </div>
                                <input
                                    type="datetime-local"
                                    value={formData.deadline}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-rose-200 focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all font-medium text-slate-900"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Task Image */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                        <ImageIcon className="text-violet-500" size={20} />
                        Task Image
                        <span className="text-xs font-normal text-slate-400 ml-1">(Optional)</span>
                    </h3>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all group ${formData.imageBase64
                            ? 'border-0'
                            : 'border-2 border-dashed border-slate-200 hover:border-violet-400 bg-gradient-to-br from-slate-50 to-violet-50/30'}`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />

                        {formData.imageBase64 ? (
                            <div className="relative h-56">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formData.imageBase64} alt="Task Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 text-white font-bold text-sm transition-all">Click to change</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, imageBase64: '' }); }}
                                    className="absolute top-3 right-3 bg-white shadow-lg p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="py-12 px-6 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center text-violet-500 mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={28} />
                                </div>
                                <p className="font-bold text-slate-700 mb-1">Add an image to help illustrate this task</p>
                                <p className="text-sm text-slate-400">Click to upload • JPG, PNG up to 2MB</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Assignees */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 font-bold text-slate-900">
                            <Users className="text-blue-500" size={20} />
                            Assign To
                        </label>
                        {subscription === 'free' && (
                            <span className="text-xs text-slate-400">
                                Max {SUBSCRIPTION_PLANS.free.features.maxTasksPerChild} tasks per child
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {children.map(child => {
                            const isSelected = formData.assignedTo.includes(child.id);
                            const maxTasks = SUBSCRIPTION_PLANS[subscription].features.maxTasksPerChild;
                            const isAtLimit = child.taskCount >= maxTasks;
                            const cannotSelect = isAtLimit && !isSelected;

                            return (
                                <button
                                    key={child.id}
                                    type="button"
                                    disabled={cannotSelect}
                                    onClick={() => {
                                        if (cannotSelect) return;
                                        setFormData({
                                            ...formData,
                                            assignedTo: isSelected
                                                ? formData.assignedTo.filter(id => id !== child.id)
                                                : [...formData.assignedTo, child.id]
                                        });
                                    }}
                                    className={`relative flex items-center gap-3 pl-2 pr-4 py-2 rounded-full border-2 transition-all ${cannotSelect
                                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-transparent bg-slate-100 hover:bg-slate-200'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: child.avatar.backgroundColor }}>
                                        {AVATAR_EMOJIS[child.avatar.presetId]}
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{child.name}</div>
                                        <div className={`text-[10px] ${isAtLimit ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                            {child.taskCount}/{maxTasks} tasks
                                            {isAtLimit && ' (limit reached)'}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-blue-600" />}
                                    {cannotSelect && (
                                        <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                            MAX
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Upgrade prompt if any child is at limit */}
                    {subscription === 'free' && children.some(c => c.taskCount >= SUBSCRIPTION_PLANS.free.features.maxTasksPerChild) && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-500">⚡</span>
                                <span className="text-sm font-medium text-amber-800">Some children have reached the task limit</span>
                            </div>
                            <Link href="/subscriptions" className="text-xs font-bold text-amber-600 hover:text-amber-700 underline">
                                Upgrade to Premium
                            </Link>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                        <X size={16} /> {error}
                    </div>
                )}

                <div className="pt-4">
                    <Button
                        size="lg"
                        className="w-full text-lg h-14 bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200"
                        onClick={handleSubmit}
                        isLoading={submitting}
                    >
                        Create Task
                    </Button>
                </div>
            </main>
        </div>
    );
}
