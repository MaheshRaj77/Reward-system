'use client';

import { useEffect, useState } from 'react';
import { AdminTasksService, AdminTask } from '@/modules/admin/tasks.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, Search, Filter, MapPin } from 'lucide-react';

export default function AdminTasksPage() {
    const [tasks, setTasks] = useState<AdminTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await AdminTasksService.getTasks();
                setTasks(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExport = () => {
        const headers = ['ID', 'Title', 'Assigned By', 'Assigned To', 'Status', 'Date', 'Location'];
        const rows = tasks.map(t => [t.id, t.title, t.assignedBy, t.assignedTo, t.status, t.createdAt, t.location || 'Unknown']);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "pinmbo_tasks.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Monitoring</h1>
                    <p className="text-gray-500">Global view of all system tasks</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Search tasks..." />
                    </div>
                    <Button variant="ghost" className="gap-2">
                        <Filter size={18} /> Status
                    </Button>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Task</th>
                            <th className="px-6 py-4">Parent</th>
                            <th className="px-6 py-4">Child</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{task.title}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{task.assignedBy}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{task.assignedTo}</td>
                                <td className="px-6 py-4">
                                    <Badge variant={task.status === 'completed' ? 'success' : task.status === 'approved' ? 'info' : 'warning'}>
                                        {task.status.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    {task.location ? (
                                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                                            <MapPin size={14} className="text-indigo-500" />
                                            {task.location}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Not detected</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{task.createdAt}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
