'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui';
import { PWAInstallPopup } from '@/components/pwa/PWAInstallPopup';
import { LogOut, Flame, Star, Zap, Sword, Shield, Trophy, Home, MessageSquare, Gift, User } from 'lucide-react';
import {
  ChildAuthProvider,
  useChildAuth,
  AVATAR_EMOJIS
} from '@/modules/children';

// RPG Level system
const LEVELS = [
  { name: 'Novice', minStars: 0, color: 'from-slate-400 to-slate-500', glow: 'shadow-slate-500/50', icon: '🌱', tier: 'bronze' },
  { name: 'Scout', minStars: 50, color: 'from-emerald-400 to-green-500', glow: 'shadow-emerald-500/50', icon: '🧭', tier: 'bronze' },
  { name: 'Warrior', minStars: 150, color: 'from-blue-400 to-cyan-500', glow: 'shadow-blue-500/50', icon: '⚔️', tier: 'silver' },
  { name: 'Knight', minStars: 300, color: 'from-purple-400 to-violet-500', glow: 'shadow-purple-500/50', icon: '🛡️', tier: 'silver' },
  { name: 'Champion', minStars: 500, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/50', icon: '🏆', tier: 'gold' },
  { name: 'Legend', minStars: 1000, color: 'from-rose-400 to-pink-500', glow: 'shadow-rose-500/50', icon: '👑', tier: 'legendary' },
];

const TIER_BORDERS: Record<string, string> = {
  bronze: 'ring-2 ring-amber-700/50',
  silver: 'ring-2 ring-slate-300',
  gold: 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900',
  legendary: 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 animate-pulse',
};

const getLevel = (stars: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (stars >= LEVELS[i].minStars) return { ...LEVELS[i], level: i + 1 };
  }
  return { ...LEVELS[0], level: 1 };
};

const getProgress = (stars: number) => {
  const current = getLevel(stars);
  const nextLevel = LEVELS[current.level] || LEVELS[LEVELS.length - 1];
  const prevStars = LEVELS[current.level - 1]?.minStars || 0;
  const range = nextLevel.minStars - prevStars;
  return range > 0 ? ((stars - prevStars) / range) * 100 : 100;
};

const getNextLevelStars = (stars: number) => {
  const current = getLevel(stars);
  const nextLevel = LEVELS[current.level] || LEVELS[LEVELS.length - 1];
  return nextLevel.minStars - stars;
};

function ChildLayoutContent({ children }: { children: React.ReactNode }) {
  const { child, loading, logout } = useChildAuth();
  const pathname = usePathname();
  const params = useParams();
  const childId = params.id as string;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Spinner size="lg" />
            <div className="absolute inset-0 animate-ping opacity-20">
              <Spinner size="lg" />
            </div>
          </div>
          <p className="mt-4 text-purple-300 font-bold animate-pulse">⚔️ Loading Quest...</p>
        </div>
      </div>
    );
  }

  if (!child) return null;

  const navItems = [
    { href: `/child/${childId}/home`, icon: '🏰', label: 'Base', activeGradient: 'from-indigo-500 to-purple-600' },
    { href: `/child/${childId}/tasks`, icon: '⚔️', label: 'Quests', activeGradient: 'from-orange-500 to-red-600' },
    { href: `/child/${childId}/chat`, icon: '💬', label: 'Guild', activeGradient: 'from-blue-500 to-cyan-600' },
    { href: `/child/${childId}/rewards`, icon: '🏪', label: 'Shop', activeGradient: 'from-pink-500 to-rose-600' },
    { href: `/child/${childId}/profile`, icon: '👤', label: 'Stats', activeGradient: 'from-amber-500 to-yellow-600' },
  ];

  const isActive = (href: string) => pathname === href;
  const totalStars = child.starBalances?.growth || 0;
  const level = getLevel(totalStars);
  const progress = getProgress(totalStars);
  const starsToNext = getNextLevelStars(totalStars);
  const currentStreak = child.streaks?.currentStreak || 0;

  const avatarEmoji = child.avatar?.presetId ? AVATAR_EMOJIS[child.avatar.presetId] : '😊';
  const hasProfileImage = child.profileImageBase64;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans text-white pb-24 md:pb-0">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Mobile Top Header - Gaming HUD */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/20 md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Player Avatar & Level */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg overflow-hidden ${TIER_BORDERS[level.tier]}`}
                  style={{ backgroundColor: child.avatar?.backgroundColor || '#4338ca' }}
                >
                  {hasProfileImage ? (
                    <Image src={child.profileImageBase64!} alt={child.name} fill className="object-cover" />
                  ) : (
                    <span className="drop-shadow-lg">{child.name?.charAt(0).toUpperCase() || avatarEmoji}</span>
                  )}
                </div>
                {/* Level Badge */}
                <div className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-gradient-to-r ${level.color} flex items-center justify-center text-xs border-2 border-slate-900 shadow-lg ${level.glow}`}>
                  <span className="font-black text-white drop-shadow">{level.level}</span>
                </div>
              </div>
              <div>
                <div className="font-black text-white leading-tight text-lg">{child.name}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold bg-gradient-to-r ${level.color} bg-clip-text text-transparent`}>
                    {level.icon} {level.name}
                  </span>
                  {currentStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-orange-400 font-bold animate-pulse">
                      <Flame size={12} fill="currentColor" className="drop-shadow-lg" /> {currentStreak}🔥
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Gold/Star Counter */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-900/80 to-yellow-900/80 px-4 py-2 rounded-xl border border-amber-500/30 shadow-lg shadow-amber-500/20">
              <Star size={20} className="text-yellow-400 drop-shadow-lg" fill="currentColor" />
              <span className="font-black text-yellow-300 text-lg">{totalStars}</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="font-bold">LVL {level.level}</span>
              <span>{starsToNext > 0 ? `${starsToNext} XP to next level` : 'MAX LEVEL ⭐'}</span>
            </div>
            <div className="h-2 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600/50">
              <div
                className={`h-full bg-gradient-to-r ${level.color} transition-all duration-1000 ease-out relative`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-28 md:pt-8 md:pl-24 relative z-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Game Controller Style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-xl border-t border-purple-500/30 pb-safe md:hidden">
        <div className="flex justify-around items-center h-20 px-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300
                  ${active
                    ? `bg-gradient-to-br ${item.activeGradient} shadow-lg shadow-purple-500/30 transform -translate-y-3 scale-110`
                    : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className={`text-xl transition-transform duration-300 ${active ? 'drop-shadow-lg' : ''}`}>
                  {item.icon}
                </div>
                <span className={`text-[9px] font-bold mt-0.5 ${active ? 'text-white' : ''}`}>
                  {item.label}
                </span>
                {active && (
                  <>
                    <div className="absolute -bottom-2 w-8 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
                    <div className="absolute inset-0 rounded-2xl animate-pulse bg-white/10" />
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar - Gaming Menu */}
      <nav className="hidden md:flex fixed top-0 left-0 bottom-0 w-20 flex-col bg-slate-900/95 backdrop-blur-xl border-r border-purple-500/20 z-50 items-center py-6">
        {/* Player Avatar */}
        <div className="relative mb-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-lg overflow-hidden cursor-pointer hover:scale-110 transition-transform ${TIER_BORDERS[level.tier]}`}
            style={{ backgroundColor: child.avatar?.backgroundColor || '#4338ca' }}
          >
            {hasProfileImage ? (
              <Image src={child.profileImageBase64!} alt={child.name} fill className="object-cover" />
            ) : (
              <span className="drop-shadow-lg">{child.name?.charAt(0).toUpperCase() || avatarEmoji}</span>
            )}
          </div>
          <div className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-gradient-to-r ${level.color} flex items-center justify-center text-xs border-2 border-slate-900 shadow-lg ${level.glow}`}>
            <span className="font-black text-white">{level.level}</span>
          </div>
        </div>

        {/* Gold Display */}
        <div className="flex items-center gap-1 bg-amber-900/50 px-2 py-1.5 rounded-lg border border-amber-500/30 mb-4">
          <Star size={14} className="text-yellow-400" fill="currentColor" />
          <span className="font-black text-yellow-300 text-sm">{totalStars}</span>
        </div>

        {/* XP Mini Bar */}
        <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden mb-6">
          <div className={`h-full bg-gradient-to-r ${level.color}`} style={{ width: `${progress}%` }} />
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-2 w-full px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200
                  ${active
                    ? `bg-gradient-to-br ${item.activeGradient} shadow-lg`
                    : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                title={item.label}
              >
                <div className="text-xl mb-0.5">{item.icon}</div>
                <span className={`text-[9px] font-bold ${active ? 'text-white' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Streak Indicator */}
        {currentStreak > 0 && (
          <div className="mb-4 flex flex-col items-center">
            <div className="text-xl animate-bounce">🔥</div>
            <span className="text-xs font-bold text-orange-400">{currentStreak}</span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-10 h-10 rounded-xl bg-red-900/50 hover:bg-red-800 flex items-center justify-center text-red-400 hover:text-red-300 transition-all hover:scale-110 border border-red-500/30"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </nav>

      <PWAInstallPopup />

      {/* Global styles for shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
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
