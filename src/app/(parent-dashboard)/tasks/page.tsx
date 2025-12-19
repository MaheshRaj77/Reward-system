
'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TASK_CATEGORIES } from '@/lib/constants';
import { canUseRecurringTasks, SubscriptionPlan } from '@/lib/constants/subscription';
import { getDoc, doc as firestoreDoc } from 'firebase/firestore';
import { Camera, MessageSquare, Clock, Calendar, Upload, X, UserPlus, Archive, Plus, Image, Check, Pencil, ArrowRight } from 'lucide-react';
import { ChatOverlay } from '@/components/tasks/ChatOverlay';
import { UnreadMessageBadge } from '@/components/tasks/UnreadMessageBadge';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
}

const AVATAR_EMOJIS: Record<string, string> = {
    'bear': '🐻', 'cat': '🐱', 'dog': '🐶', 'dragon': '🐲', 'fox': '🦊',
    'koala': '🐨', 'lion': '🦁', 'monkey': '🐵', 'owl': '🦉', 'panda': '🐼',
    'penguin': '🐧', 'rabbit': '🐰', 'tiger': '🐯', 'unicorn': '🦄', 'wolf': '🐺',
};

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
    isBucketList?: boolean;
    isActive?: boolean;
    status?: string;
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
    assignedChildIds: string[];
    selectedDays: number[];
    selectedDates: number[];
    deadline: string;
    deadlineTime: string;
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

function TasksContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'active';
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
        assignedChildIds: [],
        selectedDays: [],
        selectedDates: [],
        deadline: '',
        deadlineTime: '',
        imageBase64: '',
    });

    // Assign modal state
    const [assigning, setAssigning] = useState<string | null>(null);
    const [assignLoading, setAssignLoading] = useState(false);
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
    const [children, setChildren] = useState<ChildData[]>([]);

    // Bucket list add modal state
    const [showBucketModal, setShowBucketModal] = useState(false);
    const [bucketForm, setBucketForm] = useState({ name: '', imageBase64: '' });
    const [bucketLoading, setBucketLoading] = useState(false);
    const bucketFileInputRef = useRef<HTMLInputElement>(null);
    const [familyId, setFamilyId] = useState('');

    // Edit bucket item modal (Name and Media only)
    const [editingBucketItem, setEditingBucketItem] = useState<TaskData | null>(null);
    const [editBucketForm, setEditBucketForm] = useState({ name: '', imageBase64: '' });
    const [updatingBucket, setUpdatingBucket] = useState(false);
    const editBucketFileRef = useRef<HTMLInputElement>(null);

    // Inline chat state
    const [openChatTaskId, setOpenChatTaskId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<{ id: string; text: string; senderType: 'parent' | 'child'; createdAt: Date }[]>([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [sendingChat, setSendingChat] = useState(false);

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.id);

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
                            selectedDays: data.frequency?.daysOfWeek || [],
                            selectedDates: data.frequency?.daysOfMonth || [],
                            deadline: data.deadline ? new Date(data.deadline.seconds * 1000).toISOString().slice(0, 16) : '',
                            imageBase64: data.imageBase64 || '',
                            isBucketList: data.isBucketList || false,
                            isActive: data.isActive !== false,
                            status: data.status || 'active',
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

    // Load children for assignment
    useEffect(() => {
        const loadChildren = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();
                if (!parent) return;

                const q = query(collection(db, 'children'), where('familyId', '==', parent.id));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const childrenData: ChildData[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        childrenData.push({
                            id: doc.id,
                            name: data.name,
                            avatar: data.avatar || { presetId: 'bear', backgroundColor: '#FFE4B5' },
                        });
                    });
                    setChildren(childrenData);
                });
                return () => unsubscribe();
            } catch (err) {
                console.error('Error loading children:', err);
            }
        };
        loadChildren();
    }, []);

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
            assignedChildIds: task.assignedChildIds || [],
            selectedDays: task.selectedDays || [],
            selectedDates: task.selectedDates || [],
            deadline: task.deadline || '',
            deadlineTime: (task.frequencyType !== 'one-time' && task.deadline) ? task.deadline.split('T')[1] : '',
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
            assignedChildIds: [],
            selectedDays: [],
            selectedDates: [],
            deadline: '',
            deadlineTime: '',
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
                assignedChildIds: editForm.assignedChildIds,
                // Construct nested frequency object
                frequency: editForm.frequencyType === 'one-time' ? null : {
                    type: editForm.frequencyType,
                    interval: 1,
                    ...(editForm.frequencyType === 'weekly' && { daysOfWeek: editForm.selectedDays }),
                    ...(editForm.frequencyType === 'monthly' && { daysOfMonth: editForm.selectedDates }),
                },
                taskType: editForm.frequencyType === 'one-time' ? 'one-time' : 'recurring',
                // Handle deadline: merge date/time if needed or convert string to Timestamp
                deadline: editForm.frequencyType === 'one-time'
                    ? (editForm.deadline ? Timestamp.fromDate(new Date(editForm.deadline)) : null)
                    : (editForm.deadlineTime ? Timestamp.fromDate(new Date(`2000-01-01T${editForm.deadlineTime} `)) : null),
                imageBase64: editForm.imageBase64,
                updatedAt: serverTimestamp(),
            });
            closeEditModal();
        } catch (err) {
            setEditError('Failed to update task');
            console.error('Error updating task:', err);
        } finally {
            setEditLoading(false);
        }
    };

    // Assign bucket list task to children
    const handleAssignTask = async () => {
        if (!assigning || selectedChildIds.length === 0) return;

        setAssignLoading(true);
        try {
            await updateDoc(doc(db, 'tasks', assigning), {
                assignedChildIds: selectedChildIds,
                isBucketList: false,
                isActive: true,
                status: 'active',
                taskType: 'one-time',
            });
            setAssigning(null);
            setSelectedChildIds([]);
            router.push('/tasks?tab=active');
        } catch (err) {
            console.error('Error assigning task:', err);
        } finally {
            setAssignLoading(false);
        }
    };

    const openAssignModal = (taskId: string) => {
        // When assigning from bucket list, redirect to create task page with pre-filled data
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const params = new URLSearchParams();
            params.set('fromBucket', taskId);
            params.set('title', encodeURIComponent(task.title));
            if (task.imageBase64) {
                // Store image in sessionStorage since it can be too long for URL
                sessionStorage.setItem('bucketTaskImage', task.imageBase64);
                params.set('hasImage', 'true');
            }
            router.push(`/ tasks / create ? ${params.toString()} `);
        }
    };

    // Handle bucket list edit submission
    const handleUpdateBucketItem = async () => {
        if (!editingBucketItem || !editBucketForm.name.trim()) return;

        setUpdatingBucket(true);
        try {
            await updateDoc(doc(db, 'tasks', editingBucketItem.id), {
                title: editBucketForm.name.trim(),
                imageBase64: editBucketForm.imageBase64 || null,
                updatedAt: serverTimestamp(),
            });
            setEditingBucketItem(null);
        } catch (err) {
            console.error('Error updating bucket item:', err);
        } finally {
            setUpdatingBucket(false);
        }
    };

    const handleEditBucketImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File is too large! Please choose an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditBucketForm(prev => ({ ...prev, imageBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle bucket list form submission
    const handleAddToBucketList = async () => {
        if (!bucketForm.name.trim()) return;

        setBucketLoading(true);
        try {
            const taskData = {
                familyId,
                title: bucketForm.name.trim(),
                description: '',
                category: 'bucket-list',
                starValue: 5,
                starType: 'growth',
                assignedChildIds: [],
                taskType: 'bucket-list',
                frequency: null,
                deadline: null,
                imageBase64: bucketForm.imageBase64 || null,
                proofRequired: 'photo',
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
            setBucketForm({ name: '', imageBase64: '' });
            setShowBucketModal(false);
        } catch (err) {
            console.error('Error adding to bucket list:', err);
        } finally {
            setBucketLoading(false);
        }
    };

    const handleBucketImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File is too large! Please choose an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setBucketForm(prev => ({ ...prev, imageBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Filter tasks based on current tab
    const filteredTasks = tasks.filter(task => {
        if (currentTab === 'bucket') {
            return task.isBucketList === true;
        }
        // Active tasks: Not bucket list, Assigned to someone, Active, Not pending/completed
        return !task.isBucketList &&
            task.assignedChildIds &&
            task.assignedChildIds.length > 0 &&
            task.isActive !== false &&
            task.status !== 'pending_approval' &&
            task.status !== 'pending' &&
            task.status !== 'completed' &&
            task.status !== 'done';
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Edit Task Modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-indigo-100 rounded-3xl w-full max-w-lg p-6 shadow-lg max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Edit Task</h2>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="space-y-4">
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

                            {/* Category (Text Input) */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Category (Optional)</label>
                                <input
                                    type="text"
                                    value={editForm.category}
                                    onChange={e => setEditForm({ ...editForm, category: e.target.value as keyof typeof TASK_CATEGORIES })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., Chores, Homework"
                                />
                            </div>

                            {/* Assign To */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Assign To</label>
                                <div className="flex flex-wrap gap-2">
                                    {children.map(child => (
                                        <button
                                            key={child.id}
                                            onClick={() => {
                                                const current = editForm.assignedChildIds;
                                                const updated = current.includes(child.id)
                                                    ? current.filter(id => id !== child.id)
                                                    : [...current, child.id];
                                                setEditForm({ ...editForm, assignedChildIds: updated });
                                            }}
                                            className={`flex items - center gap - 2 p - 2 pr - 3 rounded - full border transition - all ${editForm.assignedChildIds.includes(child.id)
                                                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500'
                                                : 'bg-white border-gray-200 hover:border-indigo-200'
                                                } `}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                                style={{ backgroundColor: child.avatar.backgroundColor }}
                                            >
                                                {AVATAR_EMOJIS[child.avatar.presetId] || '🐻'}
                                            </div>
                                            <span className={`text - sm font - medium ${editForm.assignedChildIds.includes(child.id) ? 'text-indigo-900' : 'text-gray-600'
                                                } `}>
                                                {child.name}
                                            </span>
                                            {editForm.assignedChildIds.includes(child.id) && (
                                                <Check size={14} className="text-indigo-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {children.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No children added yet.</p>
                                )}
                            </div>

                            {/* Star Reward */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Star Reward</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⭐</span>
                                    <input
                                        type="number"
                                        value={editForm.starValue}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 1;
                                            setEditForm({ ...editForm, starValue: Math.max(1, Math.min(1000, val)) });
                                        }}
                                        min="1"
                                        max="1000"
                                        className="w-24 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-bold text-lg focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">ℹ️ Maximum reward limit: 1000 stars per task</p>
                            </div>

                            {/* Schedule */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Schedule</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {(['one-time', 'daily', 'weekly', 'monthly'] as const).map(freq => {
                                        const isRecurring = freq !== 'one-time';
                                        const isLocked = isRecurring && !canUseRecurring;
                                        return (
                                            <button
                                                key={freq}
                                                onClick={() => isLocked ? router.push('/subscriptions') : setEditForm({ ...editForm, frequencyType: freq })}
                                                className={`py - 2.5 px - 3 rounded - xl font - medium text - sm transition - all relative ${editForm.frequencyType === freq
                                                    ? freq === 'monthly' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    } `}
                                            >
                                                {freq === 'one-time' ? 'One Time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                                                {isLocked && <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-900 px-1 py-0.5 rounded-full font-bold">PRO</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Weekly Day Selector */}
                                {editForm.frequencyType === 'weekly' && (
                                    <div className="flex justify-center gap-1.5 pt-2">
                                        {WEEKDAYS.map(day => (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleDay(day.id)}
                                                className={`w - 8 h - 8 rounded - full text - xs font - bold transition - all ${editForm.selectedDays.includes(day.id)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    } `}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Monthly Date Selector */}
                                {editForm.frequencyType === 'monthly' && (
                                    <div className="pt-2">
                                        <p className="text-xs text-gray-500 mb-2">Select dates:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => toggleMonthDate(d)}
                                                    className={`w - 7 h - 7 rounded - lg text - xs font - bold transition - all ${editForm.selectedDates.includes(d)
                                                        ? 'bg-purple-500 text-white'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        } `}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Deadline - Different per schedule type */}
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-600">Deadline <span className="text-gray-400">(optional)</span></span>
                                    </div>

                                    {editForm.frequencyType === 'one-time' ? (
                                        <input
                                            type="datetime-local"
                                            value={editForm.deadline}
                                            onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={editForm.deadlineTime}
                                                onChange={e => setEditForm({ ...editForm, deadlineTime: e.target.value })}
                                                className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <span className="text-xs text-gray-500">
                                                {editForm.frequencyType === 'daily' && 'Daily deadline'}
                                                {editForm.frequencyType === 'weekly' && 'On selected days'}
                                                {editForm.frequencyType === 'monthly' && 'On selected dates'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm text-gray-700 font-bold mb-2">Task Image</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border - 2 border - dashed rounded - xl p - 4 flex flex - col items - center justify - center cursor - pointer transition - all hover: border - purple - 300 bg - gray - 50 ${editForm.imageBase64 ? 'border-purple-500 bg-purple-50' : 'border-gray-300'} `}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    {editForm.imageBase64 ? (
                                        <div className="relative w-full h-24 rounded-lg overflow-hidden">
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
                                            <Upload size={20} className="text-gray-400 mb-1" />
                                            <p className="text-sm text-gray-500">Click to upload</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editError && <p className="text-red-500 text-sm">{editError}</p>}

                            {/* Buttons */}
                            <div className="flex flex-col gap-3 pt-2">


                                <div className="flex gap-3">
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
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Task Library</h1>
                            <p className="text-sm text-gray-500 mt-0.5">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowBucketModal(true)}
                                variant="ghost"
                                className="gap-2"
                            >
                                <Archive size={18} />
                                Add to Bucket
                            </Button>
                            <Link href="/tasks/create">
                                <Button className="gap-2">
                                    <span className="text-lg">+</span>
                                    New Task
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => router.push('/tasks?tab=active')}
                            className={`flex - 1 px - 4 py - 2 rounded - lg text - sm font - semibold transition - all ${currentTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'} `}
                        >
                            Active Tasks
                        </button>
                        <button
                            onClick={() => router.push('/tasks?tab=bucket')}
                            className={`flex - 1 px - 4 py - 2 rounded - lg text - sm font - semibold transition - all ${currentTab === 'bucket' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'} `}
                        >
                            Bucket List
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {filteredTasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">{currentTab === 'bucket' ? '📦' : '📋'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {currentTab === 'bucket' ? 'No Bucket List Items' : 'No Tasks Yet'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            {currentTab === 'bucket'
                                ? 'Save tasks to your bucket list to assign them later!'
                                : 'Create your first task for your children to complete and earn stars!'}
                        </p>
                        <Link href="/tasks/create">
                            <Button size="lg" className="gap-2">
                                <span className="text-lg">+</span>
                                {currentTab === 'bucket' ? 'Add to Bucket List' : 'Create Your First Task'}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTasks.map((task) => {
                            const category = TASK_CATEGORIES[task.category] || { icon: '📋', label: 'Task', color: '#6B7280' };
                            const isRecurring = task.taskType === 'recurring';

                            // Simplified card for bucket list items
                            if (task.isBucketList) {
                                return (
                                    <div
                                        key={task.id}
                                        className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Image or Icon */}
                                            {task.imageBase64 ? (
                                                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={task.imageBase64}
                                                        alt={task.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 text-2xl shrink-0 text-gray-400">
                                                    📦
                                                </div>
                                            )}

                                            {/* Title */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {/* Chat Button */}
                                                <button
                                                    onClick={() => setOpenChatTaskId(task.id)}
                                                    disabled={openChatTaskId === task.id}
                                                    className={`h-9 px-3 rounded-lg flex items-center gap-1.5 transition-colors text-sm font-medium ${openChatTaskId === task.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                    title={openChatTaskId === task.id ? 'Chat Open' : 'Open Chat'}
                                                >
                                                    <MessageSquare size={16} />
                                                    <span>{openChatTaskId === task.id ? 'Open' : 'Chat'}</span>
                                                    {openChatTaskId !== task.id && (
                                                        <UnreadMessageBadge
                                                            taskId={task.id}
                                                            familyId={familyId}
                                                            perspective="parent"
                                                        />
                                                    )}
                                                </button>

                                                {/* Edit Button - Opens dedicated bucket edit modal */}
                                                <button
                                                    onClick={() => {
                                                        setEditBucketForm({
                                                            name: task.title,
                                                            imageBase64: task.imageBase64 || ''
                                                        });
                                                        setEditingBucketItem(task);
                                                    }}
                                                    className="w-9 h-9 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                                                    title="Edit Item"
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                {/* Move to Task Button */}
                                                <button
                                                    onClick={() => openAssignModal(task.id)}
                                                    className="h-9 px-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors font-medium text-sm"
                                                    title="Create Task from Item"
                                                >
                                                    <span>Move to Task</span>
                                                    <ArrowRight size={14} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => setTaskToDelete(task.id)}
                                                    disabled={deleting === task.id}
                                                    className="w-9 h-9 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                                                    title="Delete"
                                                >
                                                    {deleting === task.id ? (
                                                        <Spinner size="sm" />
                                                    ) : (
                                                        <X size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Chat Overlay for Bucket List */}
                                        {openChatTaskId === task.id && (
                                            <div className="mt-4 border-t border-gray-100 pt-4">
                                                <ChatOverlay
                                                    taskId={task.id}
                                                    familyId={familyId}
                                                    childIds={task.assignedChildIds || []}
                                                    currentUserId={familyId}
                                                    onClose={() => setOpenChatTaskId(null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Standard card for active tasks
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
                                                style={{ backgroundColor: `${category.color} 15` }}
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
                                                    style={{ backgroundColor: `${category.color} 15`, color: category.color }}
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
                                            {/* Chat Button */}
                                            <button
                                                onClick={() => setOpenChatTaskId(task.id)}
                                                disabled={openChatTaskId === task.id}
                                                className={`h - 10 px - 3 rounded - xl flex items - center gap - 1.5 transition - colors text - sm font - medium relative ${openChatTaskId === task.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-600 hover:bg-green-100'} `}
                                                title={openChatTaskId === task.id ? 'Chat Open' : 'Open Chat'}
                                            >
                                                <MessageSquare size={16} />
                                                <span>{openChatTaskId === task.id ? 'Open' : 'Chat'}</span>
                                                {openChatTaskId !== task.id && (
                                                    <UnreadMessageBadge
                                                        taskId={task.id}
                                                        familyId={familyId}
                                                        perspective="parent"
                                                    />
                                                )}
                                            </button>

                                            {/* Move to Bucket List Button */}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await updateDoc(doc(db, 'tasks', task.id), {
                                                            isBucketList: true,
                                                            isActive: false,
                                                            status: 'bucket-list',
                                                            updatedAt: serverTimestamp(),
                                                        });
                                                        router.push('/tasks?tab=bucket');
                                                    } catch (err) {
                                                        console.error('Error moving to bucket list:', err);
                                                    }
                                                }}
                                                className="h-10 px-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center gap-1.5 transition-colors text-sm font-medium"
                                                title="Move to Bucket List"
                                            >
                                                <Archive size={16} />
                                                <span>Move to Bucket List</span>
                                            </button>

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
                                    {/* Chat Overlay */}
                                    {openChatTaskId === task.id && (
                                        <div className="mt-4 border-t border-gray-100 pt-4">
                                            <ChatOverlay
                                                taskId={task.id}
                                                familyId={familyId}
                                                childIds={task.assignedChildIds}
                                                currentUserId={familyId}
                                                onClose={() => setOpenChatTaskId(null)}
                                            />
                                        </div>
                                    )}
                                </div>

                            );
                        })}
                    </div>
                )
                }
            </main >

            {/* Delete Confirmation Dialog */}
            < ConfirmDialog
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={() => taskToDelete && handleDelete(taskToDelete)}
                title="Delete Task?"
                message="This will permanently delete this task and all associated data. This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                isLoading={!!deleting}
            />

            {/* Assign Modal */}
            {
                assigning && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Assign Task</h2>
                                <button onClick={() => setAssigning(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">Select children to assign this task to:</p>

                            <div className="space-y-2 mb-6">
                                {children.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4">No children found. Add a child first.</p>
                                ) : (
                                    children.map(child => {
                                        const isSelected = selectedChildIds.includes(child.id);
                                        return (
                                            <button
                                                key={child.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedChildIds(selectedChildIds.filter(id => id !== child.id));
                                                    } else {
                                                        setSelectedChildIds([...selectedChildIds, child.id]);
                                                    }
                                                }}
                                                className={`w - full flex items - center gap - 3 p - 3 rounded - xl transition - all ${isSelected ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'} `}
                                            >
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: child.avatar.backgroundColor }}>
                                                    {AVATAR_EMOJIS[child.avatar.presetId] || '🐻'}
                                                </div>
                                                <span className="font-medium text-gray-900">{child.name}</span>
                                                {isSelected && <span className="ml-auto text-green-600">✓</span>}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAssigning(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button
                                    onClick={handleAssignTask}
                                    isLoading={assignLoading}
                                    disabled={selectedChildIds.length === 0}
                                    className="flex-1"
                                >
                                    Assign
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add to Bucket List Modal */}
            {
                showBucketModal && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Add to Bucket List</h2>
                                <button onClick={() => setShowBucketModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            <div className="space-y-4">
                                {/* Task Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Task Name *</label>
                                    <input
                                        type="text"
                                        value={bucketForm.name}
                                        onChange={e => setBucketForm({ ...bucketForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="What needs to be done?"
                                        autoFocus
                                    />
                                </div>

                                {/* Media (Optional) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Media <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="file"
                                        ref={bucketFileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleBucketImageUpload}
                                    />
                                    {bucketForm.imageBase64 ? (
                                        <div className="relative rounded-xl overflow-hidden h-32">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={bucketForm.imageBase64} alt="Task" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setBucketForm({ ...bucketForm, imageBase64: '' })}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 hover:bg-white transition-colors shadow-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => bucketFileInputRef.current?.click()}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600"
                                        >
                                            <Image size={20} />
                                            <span className="font-medium">Add Media</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowBucketModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button
                                    onClick={handleAddToBucketList}
                                    isLoading={bucketLoading}
                                    disabled={!bucketForm.name.trim()}
                                    className="flex-1"
                                >
                                    Add to Bucket List
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Edit Bucket Item Modal */}
            {
                editingBucketItem && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Edit Bucket Item</h2>
                                <button onClick={() => setEditingBucketItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            <div className="space-y-4">
                                {/* Task Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Task Name *</label>
                                    <input
                                        type="text"
                                        value={editBucketForm.name}
                                        onChange={e => setEditBucketForm({ ...editBucketForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="What needs to be done?"
                                    />
                                </div>

                                {/* Media (Optional) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Media <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="file"
                                        ref={editBucketFileRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleEditBucketImageUpload}
                                    />
                                    {editBucketForm.imageBase64 ? (
                                        <div className="relative rounded-xl overflow-hidden h-32">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editBucketForm.imageBase64} alt="Task" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setEditBucketForm({ ...editBucketForm, imageBase64: '' })}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 hover:bg-white transition-colors shadow-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => editBucketFileRef.current?.click()}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600"
                                        >
                                            <Image size={20} />
                                            <span className="font-medium">Add Media</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingBucketItem(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button
                                    onClick={handleUpdateBucketItem}
                                    isLoading={updatingBucket}
                                    disabled={!editBucketForm.name.trim()}
                                    className="flex-1"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function TasksPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" /></div>}>
            <TasksContent />
        </Suspense>
    );
}

