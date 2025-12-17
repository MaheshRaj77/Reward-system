'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TASK_CATEGORIES } from '@/lib/constants';
import { canUseRecurringTasks, SubscriptionPlan } from '@/lib/constants/subscription';
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';
import { Camera, MessageSquare, Clock, Calendar, Upload, X } from 'lucide-react';

interface TaskData {
    id: string;
    title: string;
    description?: string;
    category: keyof typeof TASK_CATEGORIES;
    starType: 'growth';
    starValue: number;
    taskType: string;
    assignedChildIds: string[];
    proofRequired?: 'none' | 'photo';
    isAutoApproved?: boolean;
    isChatEnabled?: boolean;
    frequencyType?: 'one-time' | 'daily' | 'weekly' | 'monthly';
    selectedDays?: number[];
    selectedDates?: number[];
    deadline?: string;
    imageBase64?: string;
}

interface EditFormData {
    title: string;
    description: string;
    category: keyof typeof TASK_CATEGORIES;
    starType: 'growth';
    starValue: number;
    proofRequired: 'none' | 'photo';
    isAutoApproved: boolean;
    isChatEnabled: boolean;
    frequencyType: 'one-time' | 'daily' | 'weekly' | 'monthly';
    selectedDays: number[];
    selectedDates: number[];
    deadline: string;
    imageBase64: string;
}

const WEEKDAYS = [
    { id: 1, label: 'M', full: 'Monday' },
    { id: 2, label: 'T', full: 'Tuesday' },
    { id: 3, label: 'W', full: 'Wednesday' },
    { id: 4, label: 'T', full: 'Thursday' },
    { id: 5, label: 'F', full: 'Friday' },
    { id: 6, label: 'S', full: 'Saturday' },
    { id: 0, label: 'S', full: 'Sunday' },
];

export default function TasksPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<TaskData[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionPlan>('free');
    const canUseRecurring = canUseRecurringTasks(subscription);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormData>({
        title: '',
        description: '',
        category: 'chores' as keyof typeof TASK_CATEGORIES,
        starType: 'growth',
        starValue: 5,
        proofRequired: 'none',
        isAutoApproved: false,
        isChatEnabled: false,
        frequencyType: 'one-time',
        selectedDays: [],
        selectedDates: [],
        deadline: '',
        imageBase64: '',
    });

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                const q = query(
                    collection(db, 'tasks'),
                    where('familyId', '==', parent.id)
                );

                // Load subscription
                const parentDoc = await getDoc(firestoreDoc(db, 'parents', parent.id));
                if (parentDoc.exists()) {
                    const parentData = parentDoc.data();
                    setSubscription(parentData.subscription?.plan || 'free');
                }

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const tasksData: TaskData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        tasksData.push({
                            id: doc.id,
                            title: data.title,
                            description: data.description,
                            category: data.category,
                            starType: data.starType,
                            starValue: data.starValue,
                            taskType: data.taskType,
                            assignedChildIds: data.assignedChildIds || [],
                            proofRequired: data.proofRequired || 'none',
                            isAutoApproved: data.isAutoApproved || false,
                            isChatEnabled: data.isChatEnabled || false,
                            frequencyType: data.frequency?.type || 'one-time',
                            selectedDays: data.frequency?.selectedDays || [],
                            selectedDates: data.frequency?.selectedDates || [],
                            deadline: data.deadline ? new Date(data.deadline.seconds * 1000).toISOString().slice(0, 16) : '',
                            imageBase64: data.imageBase64 || '',
                        });
                    });
                    setTasks(tasksData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                setLoading(false);
            }
        };

        loadTasks();
    }, [router]);

    const handleDelete = async (taskId: string) => {
        setDeleting(taskId);
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
            setTaskToDelete(null);
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('Failed to delete task. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const openEditModal = (task: TaskData) => {
        setEditForm({
            title: task.title,
            description: task.description || '',
            category: task.category,
            starType: task.starType,
            starValue: task.starValue,
            proofRequired: task.proofRequired || 'none',
            isAutoApproved: task.isAutoApproved || false,
            isChatEnabled: task.isChatEnabled || false,
            frequencyType: task.frequencyType || 'one-time',
            selectedDays: task.selectedDays || [],
            selectedDates: task.selectedDates || [],
            deadline: task.deadline || '',
            imageBase64: task.imageBase64 || '',
        });
        setEditing(task.id);
        setEditError('');
    };

    const closeEditModal = () => {
        setEditing(null);
        setEditError('');
        setEditForm({
            title: '',
            description: '',
            category: 'chores',
            starType: 'growth',
            starValue: 5,
            proofRequired: 'none',
            isAutoApproved: false,
            isChatEnabled: false,
            frequencyType: 'one-time',
            selectedDays: [],
            selectedDates: [],
            deadline: '',
            imageBase64: '',
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setEditError('Image must be less than 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditForm({ ...editForm, imageBase64: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const toggleDay = (dayId: number) => {
        setEditForm(prev => ({
            ...prev,
            selectedDays: prev.selectedDays.includes(dayId)
                ? prev.selectedDays.filter(d => d !== dayId)
                : [...prev.selectedDays, dayId]
        }));
    };

    const toggleMonthDate = (date: number) => {
        setEditForm(prev => ({
            ...prev,
            selectedDates: prev.selectedDates.includes(date)
                ? prev.selectedDates.filter(d => d !== date)
                : [...prev.selectedDates, date]
        }));
    };

    const handleSaveEdit = async () => {
        if (!editForm.title.trim()) {
            setEditError('Please enter a task title');
            return;
        }

        setEditLoading(true);
        setEditError('');

        try {
            await updateDoc(doc(db, 'tasks', editing!), {
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                category: editForm.category,
                starType: editForm.starType,
                starValue: editForm.starValue,
                proofRequired: editForm.proofRequired,
                isAutoApproved: editForm.isAutoApproved,
                isChatEnabled: editForm.isChatEnabled,
                frequencyType: editForm.frequencyType,
                selectedDays: editForm.selectedDays,
                selectedDates: editForm.selectedDates,
                deadline: editForm.deadline,
                imageBase64: editForm.imageBase64,
            });
            closeEditModal();
        } catch (err) {
            setEditError('Failed to update task');
            console.error('Error updating task:', err);
        } finally {
            setEditLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Edit Task Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-indigo-100 rounded-3xl w-full max-w-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Edit Task</h2>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Task Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., Make your bed"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Description (Optional)</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                    placeholder="Add more details..."
                                    rows={2}
                                />
                            </div>

                            {/* Category and Stars Row */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm text-gray-700 font-bold mb-2">Category</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]][]).slice(0, 6).map(([key, cat]) => (
                                            <button
                                                key={key}
                                                onClick={() => setEditForm({ ...editForm, category: key })}
                                                className={`p-2 rounded-xl text-center transition-all ${editForm.category === key ? 'ring-2 ring-indigo-500 bg-indigo-100' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}
                                            >
                                                <div className="text-lg">{cat.icon}</div>
                                                <div className="text-[10px] text-gray-600">{cat.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Star Reward */}
                                <div>
                                    <label className="block text-sm text-gray-700 font-bold mb-2">Star Reward</label>
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                        <div className="flex items-center justify-center gap-3 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, starValue: Math.max(1, editForm.starValue - 1) })}
                                                className="w-10 h-10 rounded-lg bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 transition-all"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                value={editForm.starValue}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    setEditForm({ ...editForm, starValue: Math.max(1, Math.min(999, val)) });
                                                }}
                                                min="1"
                                                max="999"
                                                className="w-20 h-12 text-center text-2xl font-black text-amber-600 bg-white border-2 border-amber-300 rounded-lg focus:border-amber-500 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditForm({ ...editForm, starValue: Math.min(999, editForm.starValue + 1) })}
                                                className="w-10 h-10 rounded-lg bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 transition-all"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex justify-center gap-1.5">
                                            {[5, 10, 15, 20, 25, 50].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, starValue: val })}
                                                    className={`px-2 py-1 rounded-full text-xs font-bold transition-all ${editForm.starValue === val ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-100'}`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Options Row: Proof & Approval */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Proof Required */}
                                <div>
                                    <label className="block text-sm text-gray-700 font-bold mb-2">Proof Required</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditForm({ ...editForm, proofRequired: 'none' })}
                                            className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all ${editForm.proofRequired === 'none' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                        >
                                            None
                                        </button>
                                        <button
                                            onClick={() => setEditForm({ ...editForm, proofRequired: 'photo' })}
                                            className={`flex-1 p-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${editForm.proofRequired === 'photo' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                        >
                                            <Camera size={16} />
                                            <span>Photo</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Auto Approval */}
                                <div>
                                    <label className="block text-sm text-gray-700 font-bold mb-2">Approval</label>
                                    <div
                                        onClick={() => setEditForm({ ...editForm, isAutoApproved: !editForm.isAutoApproved })}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${editForm.isAutoApproved ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-bold text-sm ${editForm.isAutoApproved ? 'text-green-800' : 'text-gray-700'}`}>
                                                {editForm.isAutoApproved ? 'Auto-Approve ✨' : 'Parent Approval'}
                                            </span>
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${editForm.isAutoApproved ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editForm.isAutoApproved ? 'translate-x-4' : ''}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Toggle */}
                            <div
                                onClick={() => setEditForm({ ...editForm, isChatEnabled: !editForm.isChatEnabled })}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${editForm.isChatEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${editForm.isChatEnabled ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${editForm.isChatEnabled ? 'text-blue-900' : 'text-gray-700'}`}>Enable Task Chat</div>
                                        <div className="text-xs text-gray-500">Allow child to ask questions</div>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${editForm.isChatEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editForm.isChatEnabled ? 'translate-x-4' : ''}`} />
                                </div>
                            </div>

                            {/* Frequency */}
                            <div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 font-bold mb-2">
                                    <Clock size={16} className="text-indigo-500" />
                                    Frequency
                                </label>
                                <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                                    {(['one-time', 'daily', 'weekly', 'monthly'] as const).map(freq => {
                                        const isRecurring = freq !== 'one-time';
                                        const isLocked = isRecurring && !canUseRecurring;
                                        return (
                                            <button
                                                key={freq}
                                                onClick={() => isLocked ? router.push('/subscriptions') : setEditForm({ ...editForm, frequencyType: freq })}
                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${editForm.frequencyType === freq ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {freq === 'one-time' ? 'Once' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                                                {isLocked && <span className="text-[8px] bg-amber-400 text-amber-900 px-1 rounded">PRO</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Weekly Day Selector */}
                                {editForm.frequencyType === 'weekly' && (
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <span className="text-xs font-bold text-indigo-600 uppercase mb-2 block">Repeat On Days</span>
                                        <div className="flex justify-between gap-1">
                                            {WEEKDAYS.map(day => (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${editForm.selectedDays.includes(day.id) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Monthly Date Selector */}
                                {editForm.frequencyType === 'monthly' && (
                                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                        <span className="text-xs font-bold text-purple-600 uppercase mb-2 block">Repeat On Dates</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => toggleMonthDate(d)}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${editForm.selectedDates.includes(d) ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 font-bold mb-2">
                                    <Calendar size={16} className="text-pink-500" />
                                    Deadline (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editForm.deadline}
                                    onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 font-bold mb-2">
                                    <Upload size={16} className="text-purple-500" />
                                    Task Image
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-purple-300 bg-gray-50 ${editForm.imageBase64 ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {editForm.imageBase64 ? (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editForm.imageBase64} alt="Task Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditForm({ ...editForm, imageBase64: '' }); }}
                                                className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 mb-2">
                                                <Upload size={18} />
                                            </div>
                                            <p className="font-bold text-gray-600 text-sm">Click to upload image</p>
                                            <p className="text-xs text-gray-400">Max 2MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editError && <p className="text-red-500 text-sm">{editError}</p>}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={closeEditModal}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button onClick={handleSaveEdit} isLoading={editLoading} className="flex-1">
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Task Library</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} created</p>
                        </div>
                        <Link href="/tasks/create">
                            <Button className="gap-2">
                                <span className="text-lg">+</span>
                                New Task
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Tasks Yet</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">Create your first task for your children to complete and earn stars!</p>
                        <Link href="/tasks/create">
                            <Button size="lg" className="gap-2">
                                <span className="text-lg">+</span>
                                Create Your First Task
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => {
                            const category = TASK_CATEGORIES[task.category] || { icon: '📋', label: 'Task', color: '#6B7280' };
                            const isRecurring = task.taskType === 'recurring';

                            return (
                                <div
                                    key={task.id}
                                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Image or Category Icon */}
                                        {task.imageBase64 ? (
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={task.imageBase64}
                                                    alt={task.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                                                style={{ backgroundColor: `${category.color}15` }}
                                            >
                                                {category.icon}
                                            </div>
                                        )}

                                        {/* Task Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                                                    {task.description && (
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                                    )}
                                                </div>
                                                {/* Star Badge */}
                                                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 rounded-full border border-amber-200 shrink-0">
                                                    <span className="text-amber-500">⭐</span>
                                                    <span className="font-bold text-amber-700">{task.starValue}</span>
                                                </div>
                                            </div>

                                            {/* Tags Row */}
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <span
                                                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                                                    style={{ backgroundColor: `${category.color}15`, color: category.color }}
                                                >
                                                    {category.label}
                                                </span>
                                                {isRecurring && (
                                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                                                        🔄 {task.frequencyType}
                                                    </span>
                                                )}
                                                {task.proofRequired === 'photo' && (
                                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                                                        📸 Photo Required
                                                    </span>
                                                )}
                                                {task.isAutoApproved && (
                                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                                                        ✨ Auto-approve
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400">
                                                    {task.assignedChildIds.length} child{task.assignedChildIds.length !== 1 ? 'ren' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                                                title="Edit task"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setTaskToDelete(task.id)}
                                                disabled={deleting === task.id}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                                                title="Delete task"
                                            >
                                                {deleting === task.id ? (
                                                    <Spinner size="sm" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={() => taskToDelete && handleDelete(taskToDelete)}
                title="Delete Task?"
                message="This will permanently delete this task and all associated data. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isLoading={!!deleting}
            />
        </div >
    );
}
