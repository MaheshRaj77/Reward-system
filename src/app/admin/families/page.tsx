'use client';

import { useEffect, useState } from 'react';
import { AdminFamiliesService, AdminFamily } from '@/modules/admin/families.service';
import { Spinner, Button } from '@/components/ui';
import { Download, Search, Users } from 'lucide-react';

export default function AdminFamiliesPage() {
    const [families, setFamilies] = useState<AdminFamily[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await AdminFamiliesService.getFamilies();
                setFamilies(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExport = () => {
        const headers = ['ID', 'Family Name', 'Parent Name', 'Children', 'Total Points'];
        const rows = families.map(f => [f.id, f.familyName, f.parentName, f.childrenCount, f.totalPoints]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "pinmbo_families.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" className="text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Family Management</h1>
                    <p className="text-gray-500">View family groups and point totals</p>
                </div>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={18} />
                    Export CSV
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Search families..." />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {families.map(family => (
                        <div key={family.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow bg-gray-50/50">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{family.familyName}</h3>
                                    <p className="text-sm text-gray-500">Managed by {family.parentName}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-t border-gray-100 mt-2">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Children</p>
                                    <p className="font-bold text-gray-900 text-lg">{family.childrenCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Stars</p>
                                    <p className="font-bold text-yellow-500 text-lg">⭐ {family.totalPoints}</p>
                                </div>
                            </div>
                            <button className="w-full mt-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
