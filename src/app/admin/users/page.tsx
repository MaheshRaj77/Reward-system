'use client';

import { useEffect, useState } from 'react';
import { AdminUsersService, AdminUser, ChildData, UpdateUserData } from '@/modules/admin/users.service';
import { Spinner, Button, Badge } from '@/components/ui';
import { Download, Search, X, Edit2, Phone, Mail, Calendar, Users, Star, Save, User } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<UpdateUserData & { children: ChildData[] }>({ children: [] });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await AdminUsersService.getUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const escapeCSV = (value: string | number): string => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ['ID', 'Name', 'Email', 'Mobile Number', 'Subscription Plan', 'Joined Date', 'Children Count', 'Children Names'];
        const rows = users.map(u => [
            escapeCSV(u.id),
            escapeCSV(u.name),
            escapeCSV(u.email || 'N/A'),
            escapeCSV(u.mobileNumber || 'N/A'),
            escapeCSV(u.subscriptionPlan.toUpperCase()),
            escapeCSV(u.joinedAt),
            escapeCSV(u.childrenCount),
            escapeCSV(u.children.map(c => `${c.name} (${c.stars}⭐)`).join('; '))
        ]);

        const BOM = '\uFEFF';
        const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pinmbo_users_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleEdit = (user: AdminUser) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            subscriptionPlan: user.subscriptionPlan,
            children: [...user.children]
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);

        try {
            // Update parent
            const success = await AdminUsersService.updateUser(editingUser.id, {
                name: editForm.name,
                email: editForm.email,
                mobileNumber: editForm.mobileNumber,
                subscriptionPlan: editForm.subscriptionPlan
            });

            // Update children names if changed
            for (let i = 0; i < editForm.children.length; i++) {
                const original = editingUser.children[i];
                const updated = editForm.children[i];
                if (original && updated && original.name !== updated.name) {
                    await AdminUsersService.updateChild(updated.id, { name: updated.name });
                }
            }

            if (success) {
                setUsers(prev => prev.map(u =>
                    u.id === editingUser.id
                        ? { ...u, ...editForm, childrenCount: editForm.children.length }
                        : u
                ));
                setEditingUser(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const updateChildName = (index: number, name: string) => {
        setEditForm(prev => ({
            ...prev,
            children: prev.children.map((c, i) => i === index ? { ...c, name } : c)
        }));
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mobileNumber.includes(searchQuery)
    );

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage parents and their children</p>
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
                        <input
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Search by name, email, or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Parent</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Children</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{user.name}</p>
                                                <p className="text-xs text-gray-500">Joined {user.joinedAt}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                <Mail size={14} className="text-gray-400" />
                                                {user.email || 'No email'}
                                            </p>
                                            <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                <Phone size={14} className="text-gray-400" />
                                                {user.mobileNumber || 'No mobile'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.children.length > 0 ? user.children.map((child, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                                                    {child.name}
                                                    <span className="text-yellow-500">⭐{child.stars}</span>
                                                </span>
                                            )) : (
                                                <span className="text-gray-400 text-sm">No children</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={user.subscriptionPlan === 'premium' ? 'info' : user.subscriptionPlan === 'trial' ? 'warning' : 'default'}>
                                            {user.subscriptionPlan.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        >
                                            <Edit2 size={14} />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No users found.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
                                    {editingUser.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
                                    <p className="text-sm text-gray-500">ID: {editingUser.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Parent Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.mobileNumber || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
                                    <select
                                        value={editForm.subscriptionPlan}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, subscriptionPlan: e.target.value as 'free' | 'trial' | 'premium' }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="free">Free</option>
                                        <option value="trial">Trial</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </div>
                            </div>

                            {/* Children */}
                            {editForm.children.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                                    <div className="space-y-2">
                                        {editForm.children.map((child, index) => (
                                            <div key={child.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                                                    {child.name.charAt(0)}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={child.name}
                                                    onChange={(e) => updateChildName(index, e.target.value)}
                                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                                <span className="text-yellow-500 font-medium text-sm flex items-center gap-1">
                                                    <Star size={14} className="fill-current" />
                                                    {child.stars}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button onClick={handleSave} isLoading={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <Save size={16} />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
