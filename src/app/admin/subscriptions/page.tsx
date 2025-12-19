'use client';

import { useEffect, useState } from 'react';
import { AdminSubscriptionsService, AdminSubscription } from '@/modules/admin/subscriptions.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, CreditCard, RefreshCw } from 'lucide-react';

export default function AdminSubscriptionsPage() {
    const [subs, setSubs] = useState<AdminSubscription[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleExport = () => {
        const headers = ['ID', 'Email', 'Plan', 'Status', 'Amount', 'Billing Date'];
        const rows = subs.map(s => [s.id, s.userEmail, s.plan, s.status, s.amount, s.nextBillingDate]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "pinmbo_subscriptions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Control</h1>
                    <p className="text-gray-500">Manage billing and plan statuses</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

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
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {subs.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{sub.userEmail}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant="default" className="uppercase">{sub.plan}</Badge>
                                    </td>
                                    <td className="px-6 py-4 font-medium">${sub.amount}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'past_due' ? 'danger' : 'default'}>
                                            {sub.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{sub.nextBillingDate}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 justify-end w-full">
                                            <RefreshCw size={14} /> Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
