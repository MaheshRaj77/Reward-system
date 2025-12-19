'use client';

import { useEffect, useState } from 'react';
import { AdminRewardsService, AdminReward } from '@/modules/admin/rewards.service';
import { Spinner, Button } from '@/components/ui';
import { Download, Gift } from 'lucide-react';

export default function AdminRewardsPage() {
    const [rewards, setRewards] = useState<AdminReward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await AdminRewardsService.getRewards();
                setRewards(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExport = () => {
        const headers = ['ID', 'Title', 'Cost', 'Family', 'Redeemed'];
        const rows = rewards.map(r => [r.id, r.title, r.cost, r.family, r.redeemedCount]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "pinmbo_rewards.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reward Tracking</h1>
                    <p className="text-gray-500">View popular rewards across families</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map(reward => (
                    <div key={reward.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center shrink-0">
                            <Gift size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{reward.title}</h3>
                            <p className="text-xs text-gray-500">{reward.family}</p>
                            <div className="flex justify-between mt-2 text-sm">
                                <span className="font-medium text-yellow-600">⭐ {reward.cost}</span>
                                <span className="text-gray-400">{reward.redeemedCount} claimed</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
