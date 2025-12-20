'use client';

import React, { useEffect, useState } from 'react';
import { AdminFeedbackService, AdminFeedback } from '@/modules/admin/feedback.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, MessageSquare, Search, X, Lightbulb, Bug, User, CheckCircle, Clock, Eye } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminFeedbackPage() {
    const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedFeedback, setSelectedFeedback] = useState<AdminFeedback | null>(null);

    // Real-time listener
    useEffect(() => {
        console.log('[AdminFeedback] Setting up real-time listener...');

        const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(200));

        const unsubscribe = onSnapshot(feedbackQuery, async () => {
            console.log('[AdminFeedback] Snapshot received');
            const data = await AdminFeedbackService.getFeedback();
            setFeedback(data);
            setLastUpdated(new Date());
            setLoading(false);
        }, (error) => {
            console.error('[AdminFeedback] Snapshot error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Stats
    const newCount = feedback.filter(f => f.status === 'new').length;
    const featureCount = feedback.filter(f => f.type === 'feature').length;
    const problemCount = feedback.filter(f => f.type === 'problem').length;

    // Filter
    const filteredFeedback = feedback.filter(f => {
        const matchesSearch = searchQuery === '' ||
            f.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.subject && f.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (f.userName && f.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            f.pagePath.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = typeFilter === 'all' || f.type === typeFilter;

        return matchesSearch && matchesType;
    });

    const handleStatusChange = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
        try {
            await AdminFeedbackService.updateStatus(feedbackId, newStatus);
        } catch {
            alert('Failed to update status');
        }
    };

    const handleExport = () => {
        const escapeCSV = (value: string | number | null): string => {
            const str = String(value ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ['ID', 'Type', 'Subject', 'Message', 'Page', 'User', 'User Type', 'Status', 'Date'];
        const rows = feedback.map(f => [
            escapeCSV(f.id),
            escapeCSV(f.type),
            escapeCSV(f.subject),
            escapeCSV(f.message),
            escapeCSV(f.pagePath),
            escapeCSV(f.userName),
            escapeCSV(f.userType),
            escapeCSV(f.status),
            escapeCSV(f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '')
        ]);

        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pinmbo_feedback_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'feature': return <Lightbulb size={16} className="text-amber-500" />;
            case 'problem': return <Bug size={16} className="text-red-500" />;
            default: return <MessageSquare size={16} className="text-blue-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <Badge variant="warning">New</Badge>;
            case 'reviewed': return <Badge variant="info">Reviewed</Badge>;
            case 'resolved': return <Badge variant="success">Resolved</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getUserTypeBadge = (userType: string) => {
        switch (userType) {
            case 'parent': return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Parent</span>;
            case 'child': return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Child</span>;
            case 'admin': return <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">Admin</span>;
            default: return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Guest</span>;
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
                    <p className="text-gray-500">
                        {feedback.length} feedback items • Updated {lastUpdated.toLocaleTimeString()}
                        <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live
                        </span>
                    </p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{newCount}</p>
                            <p className="text-xs text-gray-500">New</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'feature' ? 'all' : 'feature')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'feature' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Lightbulb size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{featureCount}</p>
                            <p className="text-xs text-gray-500">Features</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'problem' ? 'all' : 'problem')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'problem' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                            <Bug size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{problemCount}</p>
                            <p className="text-xs text-gray-500">Problems</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'feedback' ? 'all' : 'feedback')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'feedback' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <MessageSquare size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{feedback.filter(f => f.type === 'feedback').length}</p>
                            <p className="text-xs text-gray-500">Feedback</p>
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
                            placeholder="Search feedback..."
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
                        {filteredFeedback.length} of {feedback.length} items
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Page</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredFeedback.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No feedback found
                                    </td>
                                </tr>
                            ) : (
                                filteredFeedback.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(item.type)}
                                                <span className="text-sm capitalize">{item.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div>
                                                {item.subject && (
                                                    <p className="font-medium text-gray-900 text-sm truncate">{item.subject}</p>
                                                )}
                                                <p className="text-gray-500 text-sm line-clamp-2">{item.message}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.pagePath}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-900">{item.userName || 'Anonymous'}</span>
                                                {getUserTypeBadge(item.userType)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedFeedback(item)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                                                    title="View details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {item.status === 'new' && (
                                                    <button
                                                        onClick={() => handleStatusChange(item.id, 'reviewed')}
                                                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"
                                                        title="Mark as reviewed"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedFeedback(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                {getTypeIcon(selectedFeedback.type)}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 capitalize">{selectedFeedback.type} Report</h2>
                                    <p className="text-gray-500 text-sm">{selectedFeedback.createdAt ? new Date(selectedFeedback.createdAt).toLocaleString() : ''}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {selectedFeedback.subject && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">Subject</label>
                                    <p className="text-gray-900">{selectedFeedback.subject}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">Message</label>
                                <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">User</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User size={16} className="text-gray-400" />
                                        <span>{selectedFeedback.userName || 'Anonymous'}</span>
                                        {getUserTypeBadge(selectedFeedback.userType)}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">Page</label>
                                    <code className="block text-sm bg-gray-100 px-2 py-1 rounded mt-1">{selectedFeedback.pagePath}</code>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">Screen Size</label>
                                    <p className="text-sm text-gray-600">{selectedFeedback.screenWidth}x{selectedFeedback.screenHeight}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-medium">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">User Agent</label>
                                <p className="text-xs text-gray-500 break-all">{selectedFeedback.userAgent}</p>
                            </div>
                            <div className="pt-4 border-t flex gap-2">
                                <Button
                                    onClick={() => { handleStatusChange(selectedFeedback.id, 'reviewed'); setSelectedFeedback(null); }}
                                    variant="secondary"
                                    disabled={selectedFeedback.status !== 'new'}
                                >
                                    Mark Reviewed
                                </Button>
                                <Button
                                    onClick={() => { handleStatusChange(selectedFeedback.id, 'resolved'); setSelectedFeedback(null); }}
                                    disabled={selectedFeedback.status === 'resolved'}
                                >
                                    Mark Resolved
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
