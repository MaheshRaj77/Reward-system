'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui';
import { PWAInstallPopup } from '@/components/pwa/PWAInstallPopup';
import { LogOut, Star, Home, MessageSquare, Gift, User, ListTodo } from 'lucide-react';
import {
  ChildAuthProvider,
  useChildAuth,
  AVATAR_EMOJIS
} from '@/modules/children';

function ChildLayoutContent({ children }: { children: React.ReactNode }) {
  const { child, loading, logout } = useChildAuth();
  const pathname = usePathname();
  const params = useParams();
  const childId = params.id as string;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-emerald-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const navItems = [
    { href: `/child/${childId}/home`, icon: Home, label: 'Home' },
    { href: `/child/${childId}/tasks`, icon: ListTodo, label: 'Tasks' },
    { href: `/child/${childId}/chat`, icon: MessageSquare, label: 'Chat' },
    { href: `/child/${childId}/rewards`, icon: Gift, label: 'Rewards' },
    { href: `/child/${childId}/profile`, icon: User, label: 'Profile' },
  ];

  const isActive = (href: string) => pathname === href;
  const totalStars = child.starBalances?.growth || 0;

  const avatarEmoji = child.avatar?.presetId ? AVATAR_EMOJIS[child.avatar.presetId] : '😊';
  const hasProfileImage = child.profileImageBase64;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 pb-20 md:pb-0">
      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Player Avatar & Name */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl overflow-hidden border-2 border-emerald-200"
                style={{ backgroundColor: child.avatar?.backgroundColor || '#e0f2fe' }}
              >
                {hasProfileImage ? (
                  <Image src={child.profileImageBase64!} alt={child.name} fill className="object-cover" />
                ) : (
                  <span>{child.name?.charAt(0).toUpperCase() || avatarEmoji}</span>
                )}
              </div>
              <div>
                <div className="font-bold text-gray-800">{child.name}</div>
              </div>
            </div>

            {/* Star Balance */}
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Star size={16} className="text-amber-500" fill="currentColor" />
              <span className="font-bold text-amber-600">{totalStars}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-20 md:pt-8 md:pl-24">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe md:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all
                  ${active
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed top-0 left-0 bottom-0 w-[72px] flex-col bg-gradient-to-b from-white to-gray-50 border-r border-gray-100 z-50 items-center py-5">
        {/* App Logo / Branding */}
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-emerald-200">
            ⭐
          </div>
        </div>

        {/* Player Avatar with tooltip */}
        <div className="mb-5 group relative">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg overflow-hidden border-2 border-emerald-200 shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
            style={{ backgroundColor: child.avatar?.backgroundColor || '#e0f2fe' }}
          >
            {hasProfileImage ? (
              <Image src={child.profileImageBase64!} alt={child.name} fill className="object-cover" />
            ) : (
              <span className="font-semibold">{child.name?.charAt(0).toUpperCase() || avatarEmoji}</span>
            )}
          </div>
          {/* Name tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg">
            {child.name}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col gap-2 mb-5">
          {/* Stars */}
          <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-amber-50 to-yellow-50 px-2.5 py-1.5 rounded-lg border border-amber-100 shadow-sm">
            <Star size={12} className="text-amber-500" fill="currentColor" />
            <span className="font-bold text-amber-600 text-xs">{totalStars}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-gray-200 mb-4" />

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-1.5 w-full px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200
                  ${active
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title={item.label}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[9px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>

                {/* Active indicator */}
                {active && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-gray-200 my-3" />

        {/* Logout */}
        <button
          onClick={logout}
          className="group w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all duration-200 hover:scale-105"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </nav>

      <PWAInstallPopup />
    </div>
  );
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const childId = params.id as string;

  return (
    <ChildAuthProvider childId={childId}>
      <ChildLayoutContent>{children}</ChildLayoutContent>
    </ChildAuthProvider>
  );
}
