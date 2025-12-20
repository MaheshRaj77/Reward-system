'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Home, Target, Gift, Star, Settings, Users, Bell, HelpCircle } from 'lucide-react';
import { useParentAuth } from '@/modules/parent';
import { ParentNotificationService } from '@/modules/parent/notification.service';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    keywords: string[];
}

const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, keywords: ['home', 'overview', 'main', 'dashboard'] },
    { name: 'Tasks', href: '/tasks', icon: Target, keywords: ['tasks', 'chores', 'activities', 'todo', 'assignment'] },
    { name: 'Create Task', href: '/tasks/create', icon: Target, keywords: ['create task', 'new task', 'add task'] },
    { name: 'Rewards', href: '/rewards', icon: Gift, keywords: ['rewards', 'prizes', 'gifts', 'redeem'] },
    { name: 'Approvals', href: '/approvals', icon: Star, keywords: ['approvals', 'pending', 'review', 'approve'] },
    { name: 'Children', href: '/children', icon: Users, keywords: ['children', 'kids', 'child', 'manage children'] },
    { name: 'Add Child', href: '/children/add', icon: Users, keywords: ['add child', 'new child', 'create child'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, keywords: ['notifications', 'alerts', 'messages'] },
    { name: 'Profile', href: '/profile', icon: Settings, keywords: ['profile', 'settings', 'account', 'preferences'] },
    { name: 'Help & Support', href: '/support', icon: HelpCircle, keywords: ['help', 'support', 'contact', 'faq'] },
];

export function DashboardHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { parent } = useParentAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filteredItems, setFilteredItems] = useState<NavItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Subscribe to unread notification count
    useEffect(() => {
        if (!parent?.id) return;

        const unsubscribe = ParentNotificationService.subscribeToUnreadCount(
            parent.id,
            (count) => setUnreadCount(count)
        );

        return () => unsubscribe();
    }, [parent?.id]);

    // Filter nav items based on search query
    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = navItems.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.keywords.some(keyword => keyword.includes(query))
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems([]);
        }
    }, [searchQuery]);

    // Handle click outside to close search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleNavigate = (href: string) => {
        router.push(href);
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    const getPageTitle = () => {
        const item = navItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/'));
        return item?.name || 'Dashboard';
    };

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Page Title */}
                <h1 className="text-xl font-bold text-gray-900 hidden md:block">
                    {getPageTitle()}
                </h1>

                {/* Search Bar */}
                <div ref={searchRef} className="relative flex-1 max-w-xl mx-4">
                    <div
                        className={`flex items-center bg-gray-50 border rounded-xl transition-all ${isSearchOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Search className="ml-3 text-gray-400" size={18} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchOpen(true)}
                            placeholder="Search pages... (⌘K)"
                            className="w-full px-3 py-2.5 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mr-3 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {isSearchOpen && (searchQuery || filteredItems.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                            {filteredItems.length > 0 ? (
                                <div className="py-2">
                                    {filteredItems.map((item) => (
                                        <button
                                            key={item.href}
                                            onClick={() => handleNavigate(item.href)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${pathname === item.href
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <item.icon size={18} className={pathname === item.href ? 'text-indigo-500' : 'text-gray-400'} />
                                            <span className="font-medium">{item.name}</span>
                                            {pathname === item.href && (
                                                <span className="ml-auto text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Current</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery ? (
                                <div className="py-8 text-center">
                                    <p className="text-gray-400 text-sm">No pages found for "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Quick Navigation</p>
                                    {navItems.slice(0, 5).map((item) => (
                                        <button
                                            key={item.href}
                                            onClick={() => handleNavigate(item.href)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 text-gray-700"
                                        >
                                            <item.icon size={18} className="text-gray-400" />
                                            <span className="text-sm">{item.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side - Quick Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/notifications')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors relative"
                    >
                        <Bell size={20} className="text-gray-500" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => router.push('/profile')}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <Settings size={20} className="text-gray-500" />
                    </button>
                </div>
            </div>
        </header>
    );
}
