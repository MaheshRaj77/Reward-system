'use client';

// Child-friendly emoji avatars
export interface ChildAvatar {
    id: string;
    emoji: string;
    color: string;
    name: string;
}

// Only child-friendly emojis - animals, fun characters, nature
export const CHILD_AVATARS: ChildAvatar[] = [
    { id: 'lion', emoji: '�', color: '#fbbf24', name: 'Lion' },
    { id: 'panda', emoji: '🐼', color: '#374151', name: 'Panda' },
    { id: 'unicorn', emoji: '🦄', color: '#ec4899', name: 'Unicorn' },
    { id: 'fox', emoji: '🦊', color: '#f97316', name: 'Fox' },
    { id: 'owl', emoji: '🦉', color: '#8b5cf6', name: 'Owl' },
    { id: 'bunny', emoji: '🐰', color: '#f472b6', name: 'Bunny' },
    { id: 'bear', emoji: '🐻', color: '#92400e', name: 'Bear' },
    { id: 'star', emoji: '⭐', color: '#eab308', name: 'Star' },
    { id: 'rocket', emoji: '🚀', color: '#3b82f6', name: 'Rocket' },
    { id: 'rainbow', emoji: '🌈', color: '#8b5cf6', name: 'Rainbow' },
    { id: 'sun', emoji: '🌞', color: '#fbbf24', name: 'Sun' },
    { id: 'butterfly', emoji: '🦋', color: '#06b6d4', name: 'Butterfly' },
];

interface AvatarProps {
    emoji: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    backgroundColor?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-20 h-20 text-4xl',
};

export function Avatar({
    emoji,
    size = 'md',
    backgroundColor = '#6366f1',
    className = ''
}: AvatarProps) {
    return (
        <div
            className={`rounded-full flex items-center justify-center ${sizeClasses[size]} ${className}`}
            style={{ backgroundColor }}
        >
            {emoji}
        </div>
    );
}

// Avatar selector for forms
interface AvatarSelectorProps {
    selected: string;
    onSelect: (avatar: ChildAvatar) => void;
}

export function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
    return (
        <div className="grid grid-cols-4 gap-3">
            {CHILD_AVATARS.map((avatar) => (
                <button
                    key={avatar.id}
                    type="button"
                    onClick={() => onSelect(avatar)}
                    className={`relative p-2 rounded-xl transition-all ${selected === avatar.id
                            ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50 scale-105'
                            : 'hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <Avatar emoji={avatar.emoji} size="md" backgroundColor={avatar.color} />
                    <span className="block text-xs text-gray-600 mt-1 font-medium">{avatar.name}</span>
                    {selected === avatar.id && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">
                            ✓
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// Helper to get avatar by ID
export function getAvatarById(id: string): ChildAvatar {
    return CHILD_AVATARS.find(a => a.id === id) || CHILD_AVATARS[0];
}

// Helper to get avatar by emoji (for backwards compatibility)
export function getAvatarByEmoji(emoji: string): ChildAvatar | undefined {
    return CHILD_AVATARS.find(a => a.emoji === emoji);
}
