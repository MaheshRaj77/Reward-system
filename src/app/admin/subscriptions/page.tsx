'use client';

import { useEffect, useState } from 'react';
import { AdminSubscriptionsService, AdminSubscription } from '@/modules/admin/subscriptions.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, CreditCard, Users, Crown, Clock, Search, X } from 'lucide-react';

export default function AdminSubscriptionsPage() {
    const [subs, setSubs] = useState<AdminSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await AdminSubscriptionsService.getSubscriptions();
                setSubs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Stats calculations
    const totalUsers = subs.length;
    const premiumUsers = subs.filter(s => s.plan === 'premium').length;
    const activeUsers = subs.filter(s => s.status === 'active').length;
    const trialUsers = subs.filter(s => s.plan === 'trial').length;

    // Filtered subscriptions
    const filteredSubs = subs.filter(sub => {
        const matchesSearch = !searchQuery ||
            sub.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = filterPlan === 'all' || sub.plan === filterPlan;
        const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
        return matchesSearch && matchesPlan && matchesStatus;
    });

    const handleExport = () => {
        const headers = ['ID', 'Email', 'Plan', 'Status', 'Amount', 'Billing Date'];
        const escapeCSV = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
        const rows = subs.map(s => [
            escapeCSV(s.id),
            escapeCSV(s.userEmail),
            escapeCSV(s.plan),
            escapeCSV(s.status),
            escapeCSV(s.amount),
            escapeCSV(s.nextBillingDate)
        ]);

        const BOM = '\uFEFF';
        let csvContent = BOM + headers.map(h => escapeCSV(h)).join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "pinmbo_subscriptions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" className="text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
                    <p className="text-gray-500">Manage user plans and billing</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Users</p>
                        <p className="text-2xl font-bold">{totalUsers}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Crown size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Premium</p>
                        <p className="text-2xl font-bold">{premiumUsers}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg shadow-green-500/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Active</p>
                        <p className="text-2xl font-bold">{activeUsers}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Trial</p>
                        <p className="text-2xl font-bold">{trialUsers}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Plans</option>
                    <option value="premium">Premium</option>
                    <option value="trial">Trial</option>
                    <option value="free">Free</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="past_due">Past Due</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Next Billing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSubs.length > 0 ? (
                                filteredSubs.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{sub.userEmail}</p>
                                                <p className="text-xs text-gray-400">{sub.id.slice(0, 8)}...</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                variant={sub.plan === 'premium' ? 'warning' : sub.plan === 'trial' ? 'info' : 'default'}
                                                className="uppercase"
                                            >
                                                {sub.plan === 'premium' && '👑 '}{sub.plan}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {sub.amount > 0 ? `$${sub.amount.toFixed(2)}` : 'Free'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                sub.status === 'active' ? 'success' :
                                                    sub.status === 'past_due' ? 'danger' :
                                                        sub.status === 'cancelled' ? 'warning' :
                                                            'default'
                                            }>
                                                {sub.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{sub.nextBillingDate}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
                                        <p className="text-gray-500 font-medium">No subscriptions found</p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            {searchQuery || filterPlan !== 'all' || filterStatus !== 'all'
                                                ? 'Try adjusting your filters'
                                                : 'Subscriptions will appear here when users sign up'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results count */}
            {filteredSubs.length > 0 && (
                <p className="text-sm text-gray-500 text-center">
                    Showing {filteredSubs.length} of {subs.length} subscriptions
                </p>
            )}
        </div>
    );
}
