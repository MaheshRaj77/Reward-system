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

                setFamilyId(parent.familyId);

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
                    where('familyId', '==', parent.familyId)
                );
                const childSnapshot = await getDocs(childrenQuery);

                const childrenData: ChildData[] = [];
                for (const childDoc of childSnapshot.docs) {
                    const data = childDoc.data();

                    // Simple count active tasks
                    const tasksQuery = query(
                        collection(db, 'tasks'),
                        where('familyId', '==', parent.familyId),
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
            <div className="bg-white sticky top-0 z-20 border-b border-indigo-50 px-4 py-4 shadow-sm bg-opacity-80 backdrop-blur-md">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/tasks" className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">Create New Task</h1>
                </div>
            </div>

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

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, any][]).slice(0, 6).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        onClick={() => setFormData({ ...formData, category: key })}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all border ${formData.category === key ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <span className="text-2xl">{cat.icon}</span>
                                        <span className="text-xs font-bold">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Star Reward</label>
                            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 text-center">
                                <div className="text-4xl font-black text-amber-500 mb-2">{formData.starValue}</div>
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <Star className="text-amber-400 fill-amber-400" size={16} />
                                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Stars Awarded</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={formData.starValue}
                                    onChange={e => setFormData({ ...formData, starValue: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
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

                {/* 3. Schedule & Image */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50 space-y-8">
                    {/* Schedule Row */}
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Frequency Selector */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 font-bold text-slate-900">
                                    <Clock className="text-indigo-500" size={20} />
                                    Frequency
                                </label>

                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setFormData({ ...formData, frequencyType: 'one-time' })}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${formData.frequencyType === 'one-time' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Once
                                    </button>
                                    <button
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'daily' }) : router.push('/subscriptions')}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${formData.frequencyType === 'daily' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Daily
                                        {!canUseRecurring && <span className="text-[10px] bg-amber-400 text-amber-900 px-1 rounded">PRO</span>}
                                    </button>
                                    <button
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'weekly' }) : router.push('/subscriptions')}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${formData.frequencyType === 'weekly' ? 'bg-indigo-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Weekly
                                        {!canUseRecurring && <span className="text-[10px] bg-amber-400 text-amber-900 px-1 rounded">PRO</span>}
                                    </button>
                                    <button
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'monthly' }) : router.push('/subscriptions')}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${formData.frequencyType === 'monthly' ? 'bg-purple-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Monthly
                                        {!canUseRecurring && <span className="text-[10px] bg-amber-400 text-amber-900 px-1 rounded">PRO</span>}
                                    </button>
                                </div>
                            </div>

                            {/* Daily Info */}
                            {formData.frequencyType === 'daily' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 text-center">
                                    <p className="text-sm font-bold text-indigo-700">Task repeats every single day.</p>
                                </div>
                            )}

                            {/* Weekly Selector */}
                            {formData.frequencyType === 'weekly' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-3 block">Repeat On Days</span>
                                    <div className="flex justify-between gap-1">
                                        {WEEKDAYS.map(day => {
                                            const isSelected = formData.selectedDays.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'bg-white text-slate-400 hover:bg-white hover:text-slate-600'}`}
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
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3 block">Repeat On Days</span>
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {monthDays.map(d => {
                                            const isSelected = formData.selectedDates.includes(d);
                                            return (
                                                <button
                                                    key={d}
                                                    onClick={() => toggleMonthDate(d)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-purple-600 text-white shadow-lg scale-110' : 'bg-white text-slate-400 hover:bg-white hover:text-slate-600'}`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {formData.selectedDates.length > 0 && (
                                        <p className="text-center text-xs text-purple-500 mt-4 font-medium">
                                            Repeats on: {formData.selectedDates.join(', ')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Deadline Input (Optional) */}
                        <div className="flex-1">
                            <label className="flex items-center gap-2 font-bold text-slate-900 mb-4">
                                <Calendar className="text-pink-500" size={20} />
                                Deadline <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                            </label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-medium text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="flex items-center gap-2 font-bold text-slate-900 mb-4">
                            <ImageIcon className="text-purple-500" size={20} />
                            Task Image
                        </label>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-purple-300 bg-slate-50 ${formData.imageBase64 ? 'border-purple-500 bg-purple-50' : 'border-slate-300'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />

                            {formData.imageBase64 ? (
                                <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={formData.imageBase64} alt="Task Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, imageBase64: '' }); }}
                                        className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <p className="font-bold text-slate-600">Click to upload image</p>
                                    <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG (Max 2MB)</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Assignees */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <label className="flex items-center gap-2 font-bold text-slate-900 mb-4">
                        <Users className="text-blue-500" size={20} />
                        Assign To
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {children.map(child => {
                            const isSelected = formData.assignedTo.includes(child.id);
                            return (
                                <button
                                    key={child.id}
                                    onClick={() => setFormData({
                                        ...formData,
                                        assignedTo: isSelected ? formData.assignedTo.filter(id => id !== child.id) : [...formData.assignedTo, child.id]
                                    })}
                                    className={`flex items-center gap-3 pl-2 pr-4 py-2 rounded-full border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-slate-100 hover:bg-slate-200'}`}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: child.avatar.backgroundColor }}>
                                        {AVATAR_EMOJIS[child.avatar.presetId]}
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{child.name}</div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-blue-600" />}
                                </button>
                            )
                        })}
                    </div>
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
