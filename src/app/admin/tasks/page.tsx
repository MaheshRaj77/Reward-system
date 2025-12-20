'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminTasksService, AdminTask } from '@/modules/admin/tasks.service';
import { Spinner, Button } from '@/components/ui';
import { Download, Search, RefreshCw, Star, Calendar, Users, X, Repeat, Tag, Clock } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminTasksPage() {
    const [tasks, setTasks] = useState<AdminTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Real-time listener for tasks
    useEffect(() => {
        console.log('[AdminTasks] Setting up real-time listener...');

        const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(200));

        const unsubscribe = onSnapshot(tasksQuery, async (snapshot) => {
            console.log('[AdminTasks] Snapshot received, docs:', snapshot.docs.length);

            // Fetch the full data using service (to resolve parent/child names)
            const data = await AdminTasksService.getTasks();
            setTasks(data);
            setLastUpdated(new Date());
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error('[AdminTasks] Snapshot error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Active tasks (exclude bucket-list)
    const activeTasks = tasks.filter(t => t.status !== 'bucket-list');

    // Stats by type
    const oneTimeTasks = activeTasks.filter(t => t.taskType === 'one-time');
    const dailyTasks = activeTasks.filter(t => t.taskType === 'recurring' && t.frequency?.startsWith('Daily'));
    const weeklyTasks = activeTasks.filter(t => t.taskType === 'recurring' && t.frequency?.startsWith('Weekly'));
    const monthlyTasks = activeTasks.filter(t => t.taskType === 'recurring' && t.frequency?.startsWith('Monthly'));

    // Filter tasks
    const filteredTasks = activeTasks.filter(task => {
        const matchesSearch = searchQuery === '' ||
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.assignedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.category.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesType = true;
        if (typeFilter === 'one-time') matchesType = task.taskType === 'one-time';
        else if (typeFilter === 'daily') matchesType = task.taskType === 'recurring' && (task.frequency?.startsWith('Daily') ?? false);
        else if (typeFilter === 'weekly') matchesType = task.taskType === 'recurring' && (task.frequency?.startsWith('Weekly') ?? false);
        else if (typeFilter === 'monthly') matchesType = task.taskType === 'recurring' && (task.frequency?.startsWith('Monthly') ?? false);

        return matchesSearch && matchesType;
    });

    const handleExport = () => {
        const escapeCSV = (value: string | number | null): string => {
            const str = String(value ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ['ID', 'Title', 'Category', 'Parent', 'Children', 'Status', 'Stars', 'Type', 'Frequency', 'Deadline', 'Created Date'];
        const rows = activeTasks.map(t => [
            escapeCSV(t.id),
            escapeCSV(t.title),
            escapeCSV(t.category),
            escapeCSV(t.assignedBy),
            escapeCSV(t.assignedTo),
            escapeCSV(t.status),
            escapeCSV(t.stars),
            escapeCSV(t.taskType),
            escapeCSV(t.frequency),
            escapeCSV(t.deadline),
            escapeCSV(t.createdAt)
        ]);

        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pinmbo_tasks_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="text-yellow-600 text-xs">⏳ Pending</span>;
            case 'approved':
            case 'verified':
                return <span className="text-green-600 text-xs">✅ Done</span>;
            case 'active':
                return <span className="text-blue-600 text-xs">🔵 Active</span>;
            default:
                return <span className="text-gray-500 text-xs">{status}</span>;
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                    <p className="text-gray-500">
                        {activeTasks.length} tasks • Updated {lastUpdated.toLocaleTimeString()}
                        <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExport} variant="secondary" className="gap-2">
                        <Download size={18} />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards - By Task Type */}
            <div className="grid grid-cols-4 gap-4">
                <button
                    onClick={() => setTypeFilter(typeFilter === 'one-time' ? 'all' : 'one-time')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'one-time' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{oneTimeTasks.length}</p>
                            <p className="text-xs text-gray-500">One-Time</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'daily' ? 'all' : 'daily')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'daily' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <Repeat size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{dailyTasks.length}</p>
                            <p className="text-xs text-gray-500">Daily</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'weekly' ? 'all' : 'weekly')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'weekly' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <Repeat size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{weeklyTasks.length}</p>
                            <p className="text-xs text-gray-500">Weekly</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'monthly' ? 'all' : 'monthly')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'monthly' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{monthlyTasks.length}</p>
                            <p className="text-xs text-gray-500">Monthly</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search by task, parent, child, or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    {typeFilter !== 'all' && (
                        <button
                            onClick={() => setTypeFilter('all')}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700 flex items-center gap-2"
                        >
                            {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                            <X size={14} />
                        </button>
                    )}
                    <span className="text-sm text-gray-500">
                        {filteredTasks.length} of {activeTasks.length} tasks
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Task</th>
                                <th className="px-6 py-4">Parent</th>
                                <th className="px-6 py-4">Children</th>
                                <th className="px-6 py-4">Stars</th>
                                <th className="px-6 py-4">Frequency</th>
                                <th className="px-6 py-4">Deadline</th>
                                <th className="px-6 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No tasks found
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{task.title}</p>
                                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                    <Tag size={10} />
                                                    {task.category}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{task.assignedBy}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{task.assignedTo}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                                <Star size={14} className="fill-amber-400" />
                                                {task.stars}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.taskType === 'recurring' && task.frequency ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium">
                                                    <Repeat size={12} />
                                                    {task.frequency}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
                                                    One-time
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {task.deadline || <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{task.createdAt}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
