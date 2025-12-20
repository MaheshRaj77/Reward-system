'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, query, where, getDocs, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { canUseRecurringTasks, SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/constants/subscription';
import { X, Plus, Camera, Upload, Link as LinkIcon, Check, Calendar, Archive } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';

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
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
    { id: 0, label: 'S' },
];

function CreateTaskContent() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingToBucket, setSavingToBucket] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const [children, setChildren] = useState<ChildData[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const [canUseRecurring, setCanUseRecurring] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrl, setImageUrl] = useState('');

    // Location hook for task analytics
    const { getLocationForTask } = useLocation();

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        starValue: 5,
        assignedTo: [] as string[],
        frequencyType: 'one-time' as 'one-time' | 'daily' | 'weekly' | 'monthly',
        selectedDays: [] as number[],
        selectedDates: [] as number[],
        imageBase64: '',
        deadline: '',
        deadlineTime: '',
    });

    // Drag selection state for monthly dates
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartDate, setDragStartDate] = useState<number | null>(null);

    // Bucket list pre-fill
    const searchParams = useSearchParams();
    const [fromBucketId, setFromBucketId] = useState<string | null>(null);

    // Load pre-filled data from bucket list
    useEffect(() => {
        const bucketId = searchParams.get('fromBucket');
        const titleParam = searchParams.get('title');
        const hasImage = searchParams.get('hasImage');

        if (bucketId && titleParam) {
            setFromBucketId(bucketId);
            // Decode twice since we encoded in openAssignModal and URLSearchParams also encodes
            const title = decodeURIComponent(titleParam);
            let imageBase64 = '';
            if (hasImage === 'true') {
                imageBase64 = sessionStorage.getItem('bucketTaskImage') || '';
                // Don't remove yet - keep for any re-renders
            }
            setFormData(prev => ({
                ...prev,
                title,
                imageBase64,
            }));
        }
    }, [searchParams]);

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

                const parentDoc = await getDoc(doc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    const plan = parentData.subscription?.plan || 'free';
                    setSubscription(plan);
                    setCanUseRecurring(canUseRecurringTasks(plan));
                }

                const childrenQuery = query(
                    collection(db, 'children'),
                    where('familyId', '==', parent.id)
                );
                const childSnapshot = await getDocs(childrenQuery);

                const childrenData: ChildData[] = [];
                for (const childDoc of childSnapshot.docs) {
                    const data = childDoc.data();
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
            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large! Please choose an image under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageBase64: reader.result as string }));
                setShowImageOptions(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlSubmit = () => {
        if (imageUrl.trim()) {
            setFormData(prev => ({ ...prev, imageBase64: imageUrl.trim() }));
            setShowUrlInput(false);
            setShowImageOptions(false);
            setImageUrl('');
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

        if (isRecurring && !canUseRecurring) {
            setError('Recurring tasks require Premium.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            let frequency = null;
            if (isRecurring) {
                frequency = {
                    type: formData.frequencyType as 'daily' | 'weekly' | 'monthly',
                    interval: 1,
                    ...(formData.frequencyType === 'weekly' && { daysOfWeek: formData.selectedDays }),
                    ...(formData.frequencyType === 'monthly' && { daysOfMonth: formData.selectedDates }),
                };
            }

            const taskData = {
                familyId,
                title: formData.title.trim(),
                description: '',
                category: formData.category.trim() || 'general',
                starValue: formData.starValue,
                starType: 'growth',
                assignedChildIds: formData.assignedTo,
                taskType: isRecurring ? 'recurring' : 'one-time',
                frequency,
                deadline: formData.deadline ? Timestamp.fromDate(new Date(formData.deadline)) : null,
                imageBase64: formData.imageBase64 || null,
                proofRequired: 'none', // Optional - parent can require if needed
                isAutoApproved: false, // Never auto-approve
                isChatEnabled: true, // Always enabled
                status: 'active',
                isActive: true,
                createdBy: 'parent',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Get location using consent-aware hook with IP fallback
                location: await getLocationForTask(),
            };

            await addDoc(collection(db, 'tasks'), taskData);

            // If created from bucket list, delete the bucket list item
            if (fromBucketId) {
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'tasks', fromBucketId));
            }

            router.push('/tasks');
        } catch (err) {
            console.error(err);
            setError('Failed to create task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveToBucketList = async () => {
        if (!formData.title.trim()) {
            setError('Please enter a task title');
            return;
        }

        setSavingToBucket(true);
        setError('');

        try {
            // Bucket list only saves name and media - other fields use defaults
            const taskData = {
                familyId,
                title: formData.title.trim(),
                description: '',
                category: 'bucket-list',
                starValue: 5, // Default value
                starType: 'growth',
                assignedChildIds: [],
                taskType: 'bucket-list',
                frequency: null,
                deadline: null,
                imageBase64: formData.imageBase64 || null,
                proofRequired: 'none',
                isAutoApproved: false,
                isChatEnabled: true,
                status: 'bucket-list',
                isActive: false,
                isBucketList: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: 'parent',
            };

            await addDoc(collection(db, 'tasks'), taskData);
            router.push('/tasks?tab=bucket');
        } catch (err) {
            console.error(err);
            setError('Failed to save to bucket list. Please try again.');
        } finally {
            setSavingToBucket(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" /></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-indigo-50 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/tasks" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={20} />
                            </Link>
                            <h1 className="text-lg font-bold text-gray-900">Create Task</h1>
                        </div>
                        <Button
                            size="sm"
                            className="px-6 bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleSubmit}
                            isLoading={submitting}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* Responsive: Single column on mobile, two columns on desktop */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/60 overflow-hidden">
                    <div className="lg:grid lg:grid-cols-2">
                        {/* Left Column - Main Fields */}
                        <div className="p-6 lg:p-8 space-y-6 lg:border-r lg:border-gray-100">

                            {/* Task Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Task Name *</label>
                                <input
                                    type="text"
                                    placeholder="What needs to be done?"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg font-medium placeholder:text-gray-400"
                                />
                            </div>

                            {/* Category (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Category <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Homework, Chores, Health..."
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Star Reward */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Star Reward</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-[120px]">
                                        <input
                                            type="number"
                                            value={formData.starValue}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 1;
                                                setFormData({ ...formData, starValue: Math.max(1, Math.min(1000, val)) });
                                            }}
                                            min="1"
                                            max="1000"
                                            className="w-full px-4 py-3 text-center text-xl font-bold text-amber-600 bg-amber-50 border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">⭐</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">stars for completing</span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                    <span>ℹ️</span> Maximum reward limit: 1000 stars per task
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Schedule, Image, Assign */}
                        <div className="p-6 lg:p-8 space-y-6 bg-gray-50/50">

                            {/* Schedule (Minimal) */}
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700">Schedule</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, frequencyType: 'one-time' })}
                                        className={`py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${formData.frequencyType === 'one-time'
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        One Time
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'daily' }) : router.push('/subscriptions')}
                                        className={`py-2.5 px-3 rounded-xl font-medium text-sm transition-all relative ${formData.frequencyType === 'daily'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Daily
                                        {!canUseRecurring && <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded-full font-bold">PRO</span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'weekly' }) : router.push('/subscriptions')}
                                        className={`py-2.5 px-3 rounded-xl font-medium text-sm transition-all relative ${formData.frequencyType === 'weekly'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Weekly
                                        {!canUseRecurring && <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded-full font-bold">PRO</span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => canUseRecurring ? setFormData({ ...formData, frequencyType: 'monthly' }) : router.push('/subscriptions')}
                                        className={`py-2.5 px-3 rounded-xl font-medium text-sm transition-all relative ${formData.frequencyType === 'monthly'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Monthly
                                        {!canUseRecurring && <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded-full font-bold">PRO</span>}
                                    </button>
                                </div>

                                {formData.frequencyType === 'weekly' && (
                                    <div className="flex justify-center gap-1.5 pt-2">
                                        {WEEKDAYS.map(day => (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleDay(day.id)}
                                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${formData.selectedDays.includes(day.id)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {formData.frequencyType === 'monthly' && (
                                    <div className="pt-2">
                                        <p className="text-xs text-gray-500 mb-2">Select dates (click and drag to select multiple):</p>
                                        <div
                                            className="flex flex-wrap gap-1 select-none"
                                            onMouseLeave={() => {
                                                setIsDragging(false);
                                                setDragStartDate(null);
                                            }}
                                            onMouseUp={() => {
                                                setIsDragging(false);
                                                setDragStartDate(null);
                                            }}
                                        >
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                                                const getTooltip = (date: number) => {
                                                    if (date === 29) return "Feb only in leap years";
                                                    if (date === 30) return "Not in Feb";
                                                    if (date === 31) return "Not in Feb, Apr, Jun, Sep, Nov";
                                                    return undefined;
                                                };
                                                const tooltip = getTooltip(d);

                                                return (
                                                    <div key={d} className="relative group">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setIsDragging(true);
                                                                setDragStartDate(d);
                                                                // Toggle single date
                                                                const current = formData.selectedDates;
                                                                if (current.includes(d)) {
                                                                    setFormData({ ...formData, selectedDates: current.filter(x => x !== d) });
                                                                } else {
                                                                    setFormData({ ...formData, selectedDates: [...current, d].sort((a, b) => a - b) });
                                                                }
                                                            }}
                                                            onMouseEnter={() => {
                                                                if (isDragging && dragStartDate !== null) {
                                                                    const start = Math.min(dragStartDate, d);
                                                                    const end = Math.max(dragStartDate, d);
                                                                    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        selectedDates: [...new Set([...prev.selectedDates, ...range])].sort((a, b) => a - b)
                                                                    }));
                                                                }
                                                            }}
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${formData.selectedDates.includes(d)
                                                                ? 'bg-purple-500 text-white'
                                                                : d >= 29 ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                        {tooltip && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                                {tooltip}
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {formData.selectedDates.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, selectedDates: [] })}
                                                className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Deadline - Different per schedule type */}
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">Deadline <span className="text-gray-400">(optional)</span></span>
                                    </div>

                                    {formData.frequencyType === 'one-time' ? (
                                        <input
                                            type="datetime-local"
                                            value={formData.deadline}
                                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={formData.deadlineTime}
                                                onChange={e => setFormData({ ...formData, deadlineTime: e.target.value })}
                                                className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <span className="text-xs text-gray-500">
                                                {formData.frequencyType === 'daily' && 'Daily deadline'}
                                                {formData.frequencyType === 'weekly' && 'On selected days'}
                                                {formData.frequencyType === 'monthly' && 'On selected dates'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Media Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Media <span className="text-gray-400 font-normal">(optional)</span>
                                </label>

                                {formData.imageBase64 ? (
                                    <div className="relative rounded-xl overflow-hidden h-40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={formData.imageBase64} alt="Task" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageBase64: '' })}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 hover:bg-white transition-colors shadow-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowImageOptions(!showImageOptions)}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600"
                                        >
                                            <Plus size={20} />
                                            <span className="font-medium">Add Media</span>
                                        </button>

                                        {showImageOptions && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                                                >
                                                    <Camera size={18} className="text-indigo-500" />
                                                    <span className="font-medium text-gray-700">Take Photo</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                                >
                                                    <Upload size={18} className="text-indigo-500" />
                                                    <span className="font-medium text-gray-700">Upload Image</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowUrlInput(true); setShowImageOptions(false); }}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                                >
                                                    <LinkIcon size={18} className="text-indigo-500" />
                                                    <span className="font-medium text-gray-700">Image URL</span>
                                                </button>
                                            </div>
                                        )}

                                        {showUrlInput && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-10">
                                                <input
                                                    type="url"
                                                    value={imageUrl}
                                                    onChange={e => setImageUrl(e.target.value)}
                                                    placeholder="Paste image URL..."
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 mb-3 focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowUrlInput(false)}
                                                        className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleUrlSubmit}
                                                        className="flex-1 py-2 rounded-lg bg-indigo-500 text-white font-medium"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <input
                                    type="file"
                                    ref={cameraInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handleImageUpload}
                                />
                            </div>

                            {/* Assign To */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Assign To</label>
                                <div className="flex flex-wrap gap-2">
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
                                                className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full transition-all ${cannotSelect
                                                    ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-indigo-100 border-2 border-indigo-500'
                                                        : 'bg-gray-100 hover:bg-gray-200'}`}
                                            >
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: child.avatar.backgroundColor }}>
                                                    {AVATAR_EMOJIS[child.avatar.presetId]}
                                                </div>
                                                <span className={`font-medium text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{child.name}</span>
                                                {isSelected && <Check size={14} className="text-indigo-600" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                                    <X size={16} /> {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div >
    );
}

export default function CreateTaskPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" /></div>}>
            <CreateTaskContent />
        </Suspense>
    );
}
