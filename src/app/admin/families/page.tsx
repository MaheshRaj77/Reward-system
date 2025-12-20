'use client';

import React, { useEffect, useState } from 'react';
import { AdminFamiliesService, AdminFamily, ChildDetail } from '@/modules/admin/families.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, Search, X, Star, CheckCircle, Clock, Gift, ListTodo, TrendingUp, ChevronRight, Users } from 'lucide-react';

type ModalType = 'tasks' | 'rewards' | 'stars' | null;

export default function AdminFamiliesPage() {
    const [families, setFamilies] = useState<AdminFamily[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await AdminFamiliesService.getFamilies();
            console.log('Fetched families:', data); // Debug log
            setFamilies(data);
        } catch (e) {
            console.error('Error fetching families:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const escapeCSV = (value: string | number | undefined | null): string => {
            const str = String(value ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            'Family Name', 'Parent Name', 'Parent Email', 'Mobile Number',
            'Child Name', 'Total Tasks', 'Pending Approval', 'Verified Tasks',
            'Total Stars', 'Weekly Stars', 'Growth Stars', 'Stars Spent',
            'Total Rewards', 'Pending Rewards', 'Approved Rewards', 'Given Rewards',
            'Task List', 'Reward List'
        ];
        const rows: string[][] = [];

        families.forEach(f => {
            if (f.children.length === 0) {
                rows.push([
                    escapeCSV(f.familyName), escapeCSV(f.parentName), escapeCSV(f.parentEmail), escapeCSV(f.mobileNumber),
                    'No children', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '', ''
                ]);
            } else {
                f.children.forEach(c => {
                    const pendingTasks = c.tasks.filter(t => t.status === 'completed').length;
                    const verifiedTasks = c.tasks.filter(t => t.status === 'verified' || t.status === 'approved').length;
                    const pendingRewards = c.rewards.filter(r => r.status === 'pending').length;
                    const approvedRewards = c.rewards.filter(r => r.status === 'approved').length;
                    const givenRewards = c.rewards.filter(r => r.status === 'given' || r.status === 'fulfilled' || r.status === 'redeemed').length;

                    const taskList = c.tasks.map(t => `${t.title} (${t.status})`).join('; ');
                    const rewardList = c.rewards.map(r => `${r.title} - ${r.starsCost}⭐ (${r.status})`).join('; ');

                    rows.push([
                        escapeCSV(f.familyName),
                        escapeCSV(f.parentName),
                        escapeCSV(f.parentEmail),
                        escapeCSV(f.mobileNumber),
                        escapeCSV(c.name),
                        escapeCSV(c.totalTasksAssigned),
                        escapeCSV(pendingTasks),
                        escapeCSV(verifiedTasks),
                        escapeCSV(c.totalStarsCollected),
                        escapeCSV(c.starHistory.weekly),
                        escapeCSV(c.starHistory.growth),
                        escapeCSV(c.starHistory.burned),
                        escapeCSV(c.totalRewardsClaimed),
                        escapeCSV(pendingRewards),
                        escapeCSV(approvedRewards),
                        escapeCSV(givenRewards),
                        escapeCSV(taskList),
                        escapeCSV(rewardList)
                    ]);
                });
            }
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pinmbo_families_full_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const openModal = (child: ChildDetail, type: ModalType) => {
        setSelectedChild(child);
        setModalType(type);
    };

    const closeModal = () => {
        setSelectedChild(null);
        setModalType(null);
    };

    const filteredFamilies = families.filter(family =>
        family.familyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        family.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        family.children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': case 'verified': return 'text-green-600 bg-green-50';
            case 'pending': return 'text-yellow-600 bg-yellow-50';
            case 'rejected': return 'text-red-600 bg-red-50';
            case 'approved': return 'text-blue-600 bg-blue-50';
            case 'given': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Family Management</h1>
                    <p className="text-gray-500">{families.length} families • {families.reduce((sum, f) => sum + f.children.length, 0)} children</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={fetchData} variant="ghost" className="gap-2">
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="secondary" className="gap-2">
                        <Download size={18} />
                        Export
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search families or children..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">Family</th>
                                <th className="px-6 py-4 text-left">Children</th>
                                <th className="px-6 py-4 text-center">Total Tasks</th>
                                <th className="px-6 py-4 text-center">Total Stars</th>
                                <th className="px-6 py-4 text-center">Rewards</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredFamilies.map(family => (
                                <React.Fragment key={family.id}>
                                    <tr className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{family.familyName}</p>
                                                    <p className="text-xs text-gray-500">{family.parentName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                                {family.children.length} children
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-gray-900">
                                                {family.children.reduce((sum, c) => sum + c.totalTasksAssigned, 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-yellow-600 flex items-center justify-center gap-1">
                                                <Star size={14} className="fill-current" />
                                                {family.children.reduce((sum, c) => sum + c.totalStarsCollected, 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-gray-900">
                                                {family.children.reduce((sum, c) => sum + c.totalRewardsClaimed, 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setExpandedFamily(expandedFamily === family.id ? null : family.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                {expandedFamily === family.id ? 'Hide' : 'View'} Children
                                                <ChevronRight size={16} className={`transition-transform ${expandedFamily === family.id ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Children Row */}
                                    {expandedFamily === family.id && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 bg-gray-50/50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {family.children.length > 0 ? family.children.map(child => (
                                                        <div key={child.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                                    {child.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-semibold text-gray-900">{child.name}</span>
                                                            </div>

                                                            <div className="grid grid-cols-3 gap-2">
                                                                <button
                                                                    onClick={() => openModal(child, 'tasks')}
                                                                    className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors"
                                                                >
                                                                    <ListTodo size={16} className="mx-auto text-blue-500 mb-1" />
                                                                    <p className="text-sm font-bold text-blue-700">{child.totalTasksAssigned}</p>
                                                                    <p className="text-xs text-blue-600">Tasks</p>
                                                                </button>
                                                                <button
                                                                    onClick={() => openModal(child, 'stars')}
                                                                    className="p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-center transition-colors"
                                                                >
                                                                    <Star size={16} className="mx-auto text-yellow-500 mb-1 fill-current" />
                                                                    <p className="text-sm font-bold text-yellow-700">{child.totalStarsCollected}</p>
                                                                    <p className="text-xs text-yellow-600">Stars</p>
                                                                </button>
                                                                <button
                                                                    onClick={() => openModal(child, 'rewards')}
                                                                    className="p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors"
                                                                >
                                                                    <Gift size={16} className="mx-auto text-purple-500 mb-1" />
                                                                    <p className="text-sm font-bold text-purple-700">{child.totalRewardsClaimed}</p>
                                                                    <p className="text-xs text-purple-600">Rewards</p>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <p className="text-gray-400 text-sm">No children in this family</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredFamilies.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No families found.
                    </div>
                )}
            </div>

            {/* TASKS MODAL */}
            {selectedChild && modalType === 'tasks' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <ListTodo size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedChild.name}'s Tasks</h2>
                                    <p className="text-sm text-gray-500">{selectedChild.tasks.length} total</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-gray-900">{selectedChild.tasks.length}</p>
                                    <p className="text-xs text-gray-500">Total</p>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-yellow-700">{selectedChild.tasks.filter(t => t.status === 'completed').length}</p>
                                    <p className="text-xs text-yellow-600">Pending Approval</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-green-700">{selectedChild.tasks.filter(t => t.status === 'verified' || t.status === 'approved').length}</p>
                                    <p className="text-xs text-green-600">Verified</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {selectedChild.tasks.length > 0 ? selectedChild.tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {task.status === 'completed' || task.status === 'verified' || task.status === 'approved' ? (
                                                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                                            ) : (
                                                <Clock size={18} className="text-yellow-500 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{task.title}</p>
                                                <p className="text-xs text-gray-500">{task.createdAt || 'No date'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-yellow-500 font-medium text-sm">⭐{task.stars}</span>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-400 text-center py-8">No tasks assigned</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REWARDS MODAL */}
            {selectedChild && modalType === 'rewards' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <Gift size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedChild.name}'s Rewards</h2>
                                    <p className="text-sm text-gray-500">{selectedChild.rewards.length} requests</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-4 gap-2 mb-5">
                                <div className="bg-yellow-50 rounded-xl p-2 text-center">
                                    <p className="text-lg font-bold text-yellow-700">{selectedChild.rewards.filter(r => r.status === 'pending').length}</p>
                                    <p className="text-xs text-yellow-600">Pending</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-2 text-center">
                                    <p className="text-lg font-bold text-blue-700">{selectedChild.rewards.filter(r => r.status === 'approved').length}</p>
                                    <p className="text-xs text-blue-600">Approved</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-2 text-center">
                                    <p className="text-lg font-bold text-green-700">{selectedChild.rewards.filter(r => r.status === 'given' || r.status === 'fulfilled' || r.status === 'redeemed').length}</p>
                                    <p className="text-xs text-green-600">Given</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-2 text-center">
                                    <p className="text-lg font-bold text-red-700">{selectedChild.rewards.filter(r => r.status === 'rejected').length}</p>
                                    <p className="text-xs text-red-600">Rejected</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {selectedChild.rewards.length > 0 ? selectedChild.rewards.map(reward => (
                                    <div key={reward.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Gift size={18} className={reward.type === 'custom' ? 'text-purple-500 flex-shrink-0' : 'text-pink-500 flex-shrink-0'} />
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{reward.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {reward.type === 'custom' ? '🎨 Custom' : '🎁 Standard'} • {reward.requestedAt || 'No date'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-yellow-500 font-medium text-sm">⭐{reward.starsCost}</span>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(reward.status)}`}>
                                                {reward.status}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-400 text-center py-8">No reward requests</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STARS MODAL */}
            {selectedChild && modalType === 'stars' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                    <Star size={20} className="fill-current" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedChild.name}'s Stars</h2>
                                    <p className="text-sm text-gray-500">Balance breakdown</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-white text-center">
                                    <Star size={24} className="mx-auto mb-1 fill-current" />
                                    <p className="text-2xl font-bold">{selectedChild.totalStarsCollected}</p>
                                    <p className="text-xs opacity-90">Total Earned</p>
                                </div>
                                <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl p-4 text-white text-center">
                                    <TrendingUp size={24} className="mx-auto mb-1" />
                                    <p className="text-2xl font-bold">{selectedChild.starHistory.burned}</p>
                                    <p className="text-xs opacity-90">Spent</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                                    <span className="font-medium text-gray-900">Weekly Stars</span>
                                    <span className="text-lg font-bold text-blue-700">⭐ {selectedChild.starHistory.weekly}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                                    <span className="font-medium text-gray-900">Growth Stars</span>
                                    <span className="text-lg font-bold text-green-700">⭐ {selectedChild.starHistory.growth}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <span className="font-medium text-gray-900">Current Balance</span>
                                    <span className="text-lg font-bold text-gray-900">⭐ {selectedChild.starHistory.weekly + selectedChild.starHistory.growth}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
