'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChildProfile } from '@/modules/children';
import { useChildAuth } from '@/modules/children';
import { Button, Card, Spinner } from '@/components/ui';
import {
    Trophy,
    Star,
    Flame,
    Calendar,
    Camera,
    User,
    Smile,
    ArrowLeft,
    Settings,
    Save,
    X
} from 'lucide-react';

const THEME_COLORS = [
    { name: 'Indigo', value: '#e0e7ff', border: 'border-indigo-200' },
    { name: 'Rose', value: '#ffe4e6', border: 'border-rose-200' },
    { name: 'Amber', value: '#fef3c7', border: 'border-amber-200' },
    { name: 'Emerald', value: '#d1fae5', border: 'border-emerald-200' },
    { name: 'Sky', value: '#e0f2fe', border: 'border-sky-200' },
    { name: 'Violet', value: '#ede9fe', border: 'border-violet-200' },
    { name: 'Fuchsia', value: '#fae8ff', border: 'border-fuchsia-200' },
    { name: 'Orange', value: '#ffedd5', border: 'border-orange-200' },
];

export default function ChildProfilePage() {
    const params = useParams();
    const router = useRouter();
    const childId = params.id as string;
    const { child: authChild, refreshChild } = useChildAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [child, setChild] = useState<ChildProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit states
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [dateOfBirth, setDateOfBirth] = useState<string>('');
    const [bio, setBio] = useState<string>('');

    useEffect(() => {
        if (authChild) {
            setChild(authChild);
            setSelectedColor(authChild.avatar?.backgroundColor || '#e0e7ff');
            setProfileImage(authChild.profileImageBase64 || null);
            setDateOfBirth(authChild.dateOfBirth || '');
            setBio(authChild.bio || '');
            setLoading(false);
        }

        // Subscribe to real-time updates for this specific child
        const unsubscribe = onSnapshot(doc(db, 'children', childId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = { id: docSnapshot.id, ...docSnapshot.data() } as ChildProfile;
                setChild(data);
                if (!saving) { // Only update local state if not currently saving
                    setSelectedColor(data.avatar?.backgroundColor || '#e0e7ff');
                    setProfileImage(data.profileImageBase64 || null);
                    setDateOfBirth(data.dateOfBirth || '');
                    setBio(data.bio || '');
                }
            }
        });

        return () => unsubscribe();
    }, [childId, authChild, saving]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Image is too large! Please choose an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!child) return;
        setSaving(true);
        try {
            const updateData: Record<string, unknown> = {
                'avatar.backgroundColor': selectedColor,
                'themeColor': selectedColor,
            };

            // Add optional fields if they have values
            if (profileImage !== null) {
                updateData['profileImageBase64'] = profileImage;
            }
            if (dateOfBirth) {
                updateData['dateOfBirth'] = dateOfBirth;
            }
            if (bio !== undefined) {
                updateData['bio'] = bio;
            }

            await updateDoc(doc(db, 'children', childId), updateData);
            await refreshChild();
            alert('Profile updated! 🌟');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    // Calculate age from date of birth
    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (loading || !child) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const age = calculateAge(dateOfBirth);

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-indigo-100">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-indigo-900">My Profile</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Profile Photo Section */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <Camera size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Profile Photo</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Photo Preview */}
                        <div className="relative group">
                            <div
                                className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center overflow-hidden shadow-xl transition-all duration-300 transform group-hover:scale-105 border-4 border-white"
                                style={{ backgroundColor: selectedColor }}
                            >
                                {profileImage ? (
                                    <Image
                                        src={profileImage}
                                        alt="Profile"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-5xl md:text-6xl font-bold text-indigo-600">{child.name?.charAt(0).toUpperCase() || 'C'}</span>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Camera size={18} />
                            </button>
                            {profileImage && (
                                <button
                                    onClick={() => setProfileImage(null)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{child.name}</h3>
                            {age !== null && (
                                <p className="text-gray-500 mb-3">{age} years old</p>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-100 transition-colors"
                            >
                                {profileImage ? 'Change Photo' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Personal Info Section */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                            <User size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Personal Details</h2>
                    </div>

                    <div className="space-y-5">
                        {/* Date of Birth */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                <Calendar size={16} />
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-900 font-medium"
                            />
                            {age !== null && (
                                <p className="text-sm text-gray-500 mt-1">Age: {age} years old</p>
                            )}
                        </div>

                        {/* Bio */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                <Smile size={16} />
                                About Me
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows={3}
                                maxLength={200}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-900 resize-none"
                            />
                            <p className="text-xs text-gray-400 text-right">{bio.length}/200</p>
                        </div>
                    </div>
                </div>

                {/* Stats Overview Cards */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <Card className="p-4 bg-gradient-to-br from-amber-100 to-orange-50 border-none shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center mb-2 text-amber-600">
                            <Star size={20} fill="currentColor" />
                        </div>
                        <div className="text-2xl font-black text-amber-700">{child.starBalances?.growth || 0}</div>
                        <div className="text-xs font-bold text-amber-600/80 uppercase tracking-wide">Stars</div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-rose-100 to-pink-50 border-none shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center mb-2 text-rose-600">
                            <Flame size={20} fill="currentColor" />
                        </div>
                        <div className="text-2xl font-black text-rose-700">{child.streaks?.currentStreak || 0}</div>
                        <div className="text-xs font-bold text-rose-600/80 uppercase tracking-wide">Streak</div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-emerald-100 to-teal-50 border-none shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center mb-2 text-emerald-600">
                            <Trophy size={20} />
                        </div>
                        <div className="text-2xl font-black text-emerald-700">{child.streaks?.longestStreak || 0}</div>
                        <div className="text-xs font-bold text-emerald-600/80 uppercase tracking-wide">Best</div>
                    </Card>
                </div>

                {/* Profile Color Customization */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <Settings size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Profile Color</h2>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Choose Your Color</label>
                        <div className="flex flex-wrap gap-3">
                            {THEME_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color.value
                                        ? 'border-gray-900 scale-110 ring-2 ring-gray-200 ring-offset-2'
                                        : `border-transparent hover:scale-105`
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="sticky bottom-20 md:bottom-4 z-10">
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-2xl shadow-indigo-300 flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        Save Profile
                    </Button>
                </div>

            </main>
        </div>
    );
}
