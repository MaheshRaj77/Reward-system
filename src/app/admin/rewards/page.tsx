'use client';

import React, { useEffect, useState } from 'react';
import { AdminRewardsService, AdminReward } from '@/modules/admin/rewards.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, Gift, Star, Search, X, User, Users } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminRewardsPage() {
    const [rewards, setRewards] = useState<AdminReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Real-time listener for both collections
    useEffect(() => {
        console.log('[AdminRewards] Setting up real-time listeners...');

        let updateTimeout: NodeJS.Timeout | null = null;

        const fetchRewards = async () => {
            console.log('[AdminRewards] Fetching all rewards...');
            const data = await AdminRewardsService.getRewards();
            console.log('[AdminRewards] Got rewards:', data.length);
            setRewards(data);
            setLastUpdated(new Date());
            setLoading(false);
        };

        // Listen to standard rewards
        const rewardsQuery = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'), limit(200));
        const unsubRewards = onSnapshot(rewardsQuery, () => {
            console.log('[AdminRewards] Rewards snapshot received');
            if (updateTimeout) clearTimeout(updateTimeout);
            updateTimeout = setTimeout(fetchRewards, 100);
        }, (error) => {
            console.error('[AdminRewards] Rewards snapshot error:', error);
        });

        // Listen to custom reward requests
        const customQuery = query(collection(db, 'customRewardRequests'), limit(100));
        const unsubCustom = onSnapshot(customQuery, () => {
            console.log('[AdminRewards] Custom rewards snapshot received');
            if (updateTimeout) clearTimeout(updateTimeout);
            updateTimeout = setTimeout(fetchRewards, 100);
        }, (error) => {
            console.error('[AdminRewards] Custom rewards snapshot error:', error);
        });

        // Initial fetch
        fetchRewards();

        return () => {
            unsubRewards();
            unsubCustom();
            if (updateTimeout) clearTimeout(updateTimeout);
        };
    }, []);

    // Stats
    const standardRewards = rewards.filter(r => r.type === 'standard');
    const customRewards = rewards.filter(r => r.type === 'custom');
    const totalClaimed = rewards.reduce((sum, r) => sum + r.redeemedCount, 0);
    const pendingCustom = customRewards.filter(r => r.status === 'pending').length;

    // Filter
    const filteredRewards = rewards.filter(r => {
        const matchesSearch = searchQuery === '' ||
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.childName && r.childName.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = typeFilter === 'all' || r.type === typeFilter;

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

        const headers = ['ID', 'Title', 'Cost', 'Family', 'Parent', 'Created By', 'Type', 'Status', 'Claimed Count', 'Created Date'];
        const rows = rewards.map(r => [
            escapeCSV(r.id),
            escapeCSV(r.title),
            escapeCSV(r.cost),
            escapeCSV(r.family),
            escapeCSV(r.parentName),
            escapeCSV(r.childName || r.parentName),
            escapeCSV(r.type),
            escapeCSV(r.status),
            escapeCSV(r.redeemedCount),
            escapeCSV(r.createdAt)
        ]);

        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pinmbo_rewards_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reward Tracking</h1>
                    <p className="text-gray-500">
                        {rewards.length} rewards • Updated {lastUpdated.toLocaleTimeString()}
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
            <div className="grid grid-cols-3 gap-4">
                <button
                    onClick={() => setTypeFilter(typeFilter === 'standard' ? 'all' : 'standard')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'standard' ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                            <Gift size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{standardRewards.length}</p>
                            <p className="text-xs text-gray-500">Parent Rewards</p>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setTypeFilter(typeFilter === 'custom' ? 'all' : 'custom')}
                    className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${typeFilter === 'custom' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-900">{customRewards.length}</p>
                            <p className="text-xs text-gray-500">Child Requests</p>
                        </div>
                    </div>
                </button>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <Star size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalClaimed}</p>
                            <p className="text-xs text-gray-500">Total Claimed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search rewards..."
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
                            {typeFilter === 'standard' ? 'Parent Rewards' : 'Child Requests'}
                            <X size={14} />
                        </button>
                    )}
                    <span className="text-sm text-gray-500">
                        {filteredRewards.length} of {rewards.length} rewards
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Reward</th>
                                <th className="px-6 py-4">Family</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Cost</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Claimed</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRewards.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No rewards found
                                    </td>
                                </tr>
                            ) : (
                                filteredRewards.map((reward) => (
                                    <tr key={reward.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${reward.type === 'custom' ? 'bg-purple-100 text-purple-500' : 'bg-pink-100 text-pink-500'}`}>
                                                    <Gift size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{reward.title}</p>
                                                    <p className="text-xs text-gray-400">{reward.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{reward.family}</td>
                                        <td className="px-6 py-4 text-sm">
                                            {reward.type === 'custom' ? (
                                                <span className="text-purple-600">{reward.childName} (Child)</span>
                                            ) : (
                                                <span className="text-gray-600">{reward.parentName}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                                <Star size={14} className="fill-amber-400" />
                                                {reward.cost}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {reward.type === 'custom' ? (
                                                <Badge variant="info">Custom Request</Badge>
                                            ) : (
                                                <Badge variant="success">Standard</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-medium ${reward.redeemedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                {reward.redeemedCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{reward.createdAt}</td>
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
