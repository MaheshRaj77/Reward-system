'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Target,
    Gift,
    CreditCard,
    BarChart3,
    LogOut,
    Home,
    Menu,
    X,
    UserCheck,
    MessageSquare
} from 'lucide-react';
import { useState } from 'react';
import { AdminAuthService } from '@/modules/admin/auth.service';

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: Users, label: 'Users', href: '/admin/users' },
        { icon: UserCheck, label: 'Families', href: '/admin/families' },
        { icon: Target, label: 'Tasks', href: '/admin/tasks' },
        { icon: Gift, label: 'Rewards', href: '/admin/rewards' },
        { icon: MessageSquare, label: 'Feedback', href: '/admin/feedback' },
        { icon: CreditCard, label: 'Subscriptions', href: '/admin/subscriptions' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    ];

    const handleLogout = () => {
        AdminAuthService.logout();
        router.push('/admin/login');
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={toggleSidebar}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-40
        w-64 bg-gray-900 text-gray-300
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">P</span>
                            Pinmbo Admin
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                            : 'hover:bg-gray-800 hover:text-white'
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer actions */}
                    <div className="p-4 border-t border-gray-800 space-y-2">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                        >
                            <Home size={20} />
                            <span className="font-medium">Public Site</span>
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
