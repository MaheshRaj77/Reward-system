'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';
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
    const [deleting, setDeleting] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
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
                    where('familyId', '==', parent.familyId)
                );

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
        } catch (err) {
            console.error('Error deleting task:', err);
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Edit Task Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-indigo-100 rounded-3xl w-full max-w-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
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
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                        <div className="text-3xl font-black text-amber-500 text-center mb-2">{editForm.starValue}</div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={editForm.starValue}
                                            onChange={e => setEditForm({ ...editForm, starValue: parseInt(e.target.value) })}
                                            className="w-full accent-amber-500 h-2"
                                        />
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
                                    {(['one-time', 'daily', 'weekly', 'monthly'] as const).map(freq => (
                                        <button
                                            key={freq}
                                            onClick={() => setEditForm({ ...editForm, frequencyType: freq })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${editForm.frequencyType === freq ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {freq === 'one-time' ? 'Once' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </button>
                                    ))}
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
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
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
                                    type="date"
                                    value={editForm.deadline}
                                    onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
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

            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">📋 Task Library</h1>
                    </div>
                    <Link href="/tasks/create">
                        <Button size="sm">+ New Task</Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {tasks.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Tasks Yet</h3>
                        <p className="text-gray-600 mb-6">Create your first task for your children to complete.</p>
                        <Link href="/tasks/create">
                            <Button>Create a Task</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => {
                            const category = TASK_CATEGORIES[task.category] || { icon: '📋', label: 'Task', color: '#6B7280' };

                            return (
                                <div key={task.id} className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-5 hover:bg-white/80 hover:border-indigo-200 transition-colors shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                                            style={{ backgroundColor: `${category.color}20` }}
                                        >
                                            {category.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800">{task.title}</h3>
                                            {task.description && (
                                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <Badge variant="success">
                                                    ⭐ {task.starValue}
                                                </Badge>
                                                <Badge>{category.label}</Badge>
                                                <Badge variant="default">{task.taskType}</Badge>
                                                <span className="text-xs text-gray-500">
                                                    {task.assignedChildIds.length} child{task.assignedChildIds.length !== 1 ? 'ren' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                                                title="Edit task"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                disabled={deleting === task.id}
                                                className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                                                title="Delete task"
                                            >
                                                {deleting === task.id ? '...' : '🗑️'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div >
    );
}
