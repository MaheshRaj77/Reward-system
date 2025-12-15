'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Child } from '@/types';
import { Spinner } from '@/components/ui';
import { PWAInstallPopup } from '@/components/pwa/PWAInstallPopup';
import { LogOut } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
  lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
  unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;

    const loadChild = async () => {
      try {
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (childDoc.exists()) {
          setChild(childDoc.data() as Child);
        } else {
          router.push('/child/login');
        }
      } catch (error) {
        console.error('Error loading child:', error);
        router.push('/child/login');
      } finally {
        setLoading(false);
      }
    };

    loadChild();
  }, [childId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center text-indigo-500">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!child) {
    return null;
  }

  const avatar = (child.avatar?.presetId && AVATAR_EMOJIS[child.avatar.presetId]) || '😊';
  const navItems = [
    { href: `/child/${childId}/home`, icon: '🏠', label: 'Home' },
    { href: `/child/${childId}/tasks`, icon: '✓', label: 'Tasks' },
    { href: `/child/${childId}/rewards`, icon: '🎁', label: 'Rewards' },
    { href: `/child/${childId}/progress`, icon: '📊', label: 'Progress' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-gray-900 pb-10">

      {/* Floating Pill Navbar */}
      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl shadow-indigo-500/10 rounded-full px-2 py-2 flex items-center gap-2 pointer-events-auto max-w-full overflow-x-auto no-scrollbar transition-all hover:scale-[1.01]">

          {/* Avatar / Profile */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner border border-indigo-100 mr-1"
            style={{ backgroundColor: child.avatar?.backgroundColor || '#e0e7ff' }}
          >
            {avatar}
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-1 bg-gray-100/50 rounded-full p-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap
                    ${active
                      ? 'bg-white text-indigo-600 shadow-md shadow-indigo-200/50 ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                    }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {/* Show label on larger screens or if active */}
                  <span className={`${active ? 'inline-block' : 'hidden sm:inline-block'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Star Stats (Condensed) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100 ml-1 flex-shrink-0">
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-bold text-amber-600">{child.starBalances?.growth || 0}</span>
              <span className="text-[8px] text-amber-500 font-bold uppercase">Stars</span>
            </div>
            <span className="text-lg">⭐</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => router.push('/child/login')}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-600 transition-colors border border-red-100 ml-1"
            title="Logout"
          >
            <LogOut size={16} />
          </button>

        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>

      {/* PWA Install Popup */}
      <PWAInstallPopup />

    </div>
  );
}
