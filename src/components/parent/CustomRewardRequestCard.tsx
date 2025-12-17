'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, X, Check, Clock } from 'lucide-react';
import { Spinner } from '@/components/ui';

interface CustomRewardRequest {
    id: string;
    childId: string;
    childName: string;
    rewardName: string;
    rewardLink: string;
    rewardImage: string | null;
    status: 'pending' | 'stars_set' | 'approved' | 'rejected';
    starsRequired: number | null;
    requestedAt: { seconds: number };
    childStarBalance: number;
}

interface CustomRewardRequestCardProps {
    request: CustomRewardRequest;
    childAvatar: { presetId: string; backgroundColor: string };
    onSetStars: (requestId: string, stars: number) => Promise<void>;
    onApprove: (requestId: string) => Promise<void>;
    onReject: (requestId: string) => Promise<void>;
    processing?: string | null;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

export function CustomRewardRequestCard({
    request,
    childAvatar,
    onSetStars,
    onApprove,
    onReject,
    processing,
}: CustomRewardRequestCardProps) {
    const [starsInput, setStarsInput] = useState(request.starsRequired?.toString() || '');
    const [showStarsForm, setShowStarsForm] = useState(!request.starsRequired);
    const avatarEmoji = AVATAR_EMOJIS[childAvatar.presetId] || '⭐';

    const handleSetStars = async () => {
        const stars = parseInt(starsInput);
        if (isNaN(stars) || stars < 1) {
            alert('Please enter a valid number of stars');
            return;
        }
        await onSetStars(request.id, stars);
        setShowStarsForm(false);
    };

    const getTimeAgo = (timestamp: { seconds: number }) => {
        const now = new Date().getTime();
        const seconds = Math.floor((now - timestamp.seconds * 1000) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div
            className={`group bg-white rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 hover:shadow-xl ${
                request.status === 'approved'
                    ? 'border-green-200 shadow-green-100/50'
                    : 'border-purple-200 shadow-purple-100/50 hover:border-purple-300'
            }`}
        >
            {/* Status Banner */}
            {request.status === 'approved' && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2 text-sm font-medium flex items-center gap-2">
                    <Check size={16} />
                    Approved!
                </div>
            )}
            {request.status === 'rejected' && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-5 py-2 text-sm font-medium flex items-center gap-2">
                    <X size={16} />
                    Rejected
                </div>
            )}

            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Child Avatar */}
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-md"
                        style={{ backgroundColor: childAvatar.backgroundColor }}
                    >
                        {avatarEmoji}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Child Name */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{request.childName}</span>
                            <span className="text-gray-400">requested</span>
                        </div>

                        {/* Reward Name */}
                        <h3 className="font-semibold text-gray-800 text-lg mt-1 line-clamp-2">
                            {request.rewardName}
                        </h3>

                        {/* Link */}
                        {request.rewardLink && (
                            <a
                                href={request.rewardLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-700 underline mt-1 truncate block"
                            >
                                {request.rewardLink}
                            </a>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                            <Clock size={12} />
                            {getTimeAgo(request.requestedAt)}
                        </div>
                    </div>
                </div>

                {/* Reward Image */}
                {request.rewardImage && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                            Reward Image
                        </p>
                        <div className="relative w-full max-w-sm">
                            <Image
                                src={request.rewardImage}
                                alt="Requested reward"
                                width={400}
                                height={300}
                                className="rounded-xl border-2 border-gray-100 object-cover w-full h-48 cursor-pointer hover:border-purple-300 transition-all"
                                onClick={() => window.open(request.rewardImage as string, '_blank')}
                            />
                        </div>
                    </div>
                )}

                {/* Stars Section */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                        {showStarsForm && !request.starsRequired ? (
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">
                                    How many stars for this reward?
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={starsInput}
                                        onChange={(e) => setStarsInput(e.target.value)}
                                        placeholder="Enter stars required"
                                        className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSetStars}
                                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold transition-colors"
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>
                        ) : request.starsRequired ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star size={16} className="text-amber-500" fill="currentColor" />
                                    <span className="font-bold text-lg text-gray-900">
                                        {request.starsRequired} stars
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowStarsForm(true)}
                                    className="text-purple-600 hover:text-purple-700 text-xs font-semibold"
                                >
                                    Edit
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {request.status !== 'rejected' && (
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={() => onReject(request.id)}
                        disabled={processing === request.id}
                        className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <X size={18} />
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(request.id)}
                        disabled={processing === request.id || !request.starsRequired || request.status === 'approved'}
                        className={`flex-[2] py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                            request.starsRequired && request.status !== 'approved'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200 hover:shadow-xl hover:from-green-600 hover:to-emerald-600'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {processing === request.id ? (
                            <Spinner size="sm" />
                        ) : (
                            <>
                                <Check size={18} />
                                Approve
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
