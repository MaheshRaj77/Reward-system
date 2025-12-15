'use client';

import { Badge } from '@/components/ui';
import { Star } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalances: { growth: number };
    streaks: { currentStreak: number };
    ageGroup: string;
}

interface ChildCardProps {
    child: ChildData;
    onViewProfile: (id: string) => void;
    onDelete: (child: ChildData) => void;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const AGE_GROUP_LABELS: Record<string, string> = {
    '4-6': 'Little Explorer',
    '7-10': 'Rising Star',
    '11-14': 'Teen Achiever',
    '15+': 'Young Adult',
};

export function ChildCard({ child, onViewProfile, onDelete }: ChildCardProps) {
    const totalStars = child.starBalances?.growth || 0;

    return (
        <div className="group relative bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 shadow-md shadow-slate-200/50">
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3 ring-4 ring-white"
                    style={{ backgroundColor: child.avatar.backgroundColor }}
                >
                    {AVATAR_EMOJIS[child.avatar.presetId] || '⭐'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg truncate">{child.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            {AGE_GROUP_LABELS[child.ageGroup] || child.ageGroup}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Stats - Stars & Streak */}
            <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Star size={14} className="text-amber-500" fill="currentColor" />
                    </div>
                    <div className="text-xl font-bold text-amber-600">{child.starBalances?.growth || 0}</div>
                    <div className="text-[10px] text-amber-600/70 font-bold uppercase">Stars</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                    <div className="text-xl font-bold text-orange-600">{child.streaks?.currentStreak || 0}</div>
                    <div className="text-[10px] text-orange-600/70 font-bold uppercase">Streak 🔥</div>
                </div>
            </div>

            {/* Hover Overlay Actions */}
            <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 translate-y-2 group-hover:translate-y-0 bg-white/90 backdrop-blur-sm rounded-b-2xl">
                <button
                    onClick={() => onViewProfile(child.id)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 transition-colors"
                >
                    Profile
                </button>
                <button
                    onClick={() => onDelete(child)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-semibold border border-red-200 transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
