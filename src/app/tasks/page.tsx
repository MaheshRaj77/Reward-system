'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Badge, Spinner } from '@/components/ui';
import { TASK_CATEGORIES } from '@/lib/constants';

interface TaskData {
    id: string;
    title: string;
    description?: string;
    category: keyof typeof TASK_CATEGORIES;
    starType: 'growth' | 'fun';
    starValue: number;
    taskType: string;
    assignedChildIds: string[];
}

interface EditFormData {
    title: string;
    description: string;
    category: keyof typeof TASK_CATEGORIES;
    starType: 'growth' | 'fun';
    starValue: number;
}

export default function TasksPage() {
    const router = useRouter();
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
        });
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
                    <div className="bg-white border border-indigo-100 rounded-3xl w-full max-w-lg p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Edit Task</h2>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-700 font-medium mb-2">Task Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., Make your bed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Description (Optional)</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none resize-none"
                                    placeholder="Add more details..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.entries(TASK_CATEGORIES) as [keyof typeof TASK_CATEGORIES, typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]][]).slice(0, 6).map(([key, cat]) => (
                                        <button
                                            key={key}
                                            onClick={() => setEditForm({ ...editForm, category: key })}
                                            className={`p-3 rounded-xl text-center transition-all ${editForm.category === key ? 'ring-2 ring-indigo-500 bg-indigo-500/20' : 'bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="text-xl mb-1">{cat.icon}</div>
                                            <div className="text-xs text-slate-300">{cat.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Star Reward</label>
                                <div className="flex gap-3 mb-3">
                                    <button
                                        onClick={() => setEditForm({ ...editForm, starType: 'growth' })}
                                        className={`flex-1 p-3 rounded-xl text-center ${editForm.starType === 'growth' ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-white/5'}`}
                                    >
                                        <span className="text-xl">⭐</span>
                                        <p className="text-xs text-slate-300 mt-1">Growth</p>
                                    </button>
                                    <button
                                        onClick={() => setEditForm({ ...editForm, starType: 'fun' })}
                                        className={`flex-1 p-3 rounded-xl text-center ${editForm.starType === 'fun' ? 'bg-pink-500/20 ring-2 ring-pink-500' : 'bg-white/5'}`}
                                    >
                                        <span className="text-xl">🎉</span>
                                        <p className="text-xs text-slate-300 mt-1">Fun</p>
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={editForm.starValue}
                                        onChange={e => setEditForm({ ...editForm, starValue: parseInt(e.target.value) })}
                                        className="flex-1"
                                    />
                                    <span className="text-white font-bold w-8">{editForm.starValue}</span>
                                </div>
                            </div>

                            {editError && <p className="text-red-400 text-sm">{editError}</p>}

                            <div className="flex gap-3">
                                <button
                                    onClick={closeEditModal}
                                    className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
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
                                                <Badge variant={task.starType === 'growth' ? 'success' : 'info'}>
                                                    {task.starType === 'growth' ? '⭐' : '🎉'} {task.starValue}
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
        </div>
    );
}
