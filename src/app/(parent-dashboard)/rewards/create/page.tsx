'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { Gift, Star, Upload, Link as LinkIcon, X, ShieldCheck } from 'lucide-react';

const REWARD_ICONS = ['🎮', '🍦', '🎬', '📱', '🎁', '🍕', '🎈', '🎯', '🏆', '💰', '🎪', '🛍️'];

export default function CreateRewardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '🎁',
        starCost: 20,
        limitPerWeek: null as number | null,
        requiresApproval: true,
        imageUrl: '',
        imageBase64: '',
    });

    const [imageSource, setImageSource] = useState<'none' | 'url' | 'upload'>('none');
    const [imagePreview, setImagePreview] = useState<string>('');

    // Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            setFormData({ ...formData, imageBase64: base64, imageUrl: '' });
            setImagePreview(base64);
            setImageSource('upload');
            setError('');
        } catch {
            setError('Failed to process image');
        }
    };

    // Handle URL input
    const handleUrlChange = (url: string) => {
        setFormData({ ...formData, imageUrl: url, imageBase64: '' });
        setImagePreview(url);
        if (url) {
            setImageSource('url');
        } else {
            setImageSource('none');
            setImagePreview('');
        }
    };

    // Clear image
    const clearImage = () => {
        setFormData({ ...formData, imageUrl: '', imageBase64: '' });
        setImagePreview('');
        setImageSource('none');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();

                if (!parent) {
                    router.push('/auth/login');
                    return;
                }

                setFamilyId(parent.id);
                setLoading(false);
            } catch {
                router.push('/auth/login');
            }
        };

        checkAuth();
    }, [router]);

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Please enter a reward name');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'rewards'), {
                familyId,
                name: formData.name.trim(),
                description: formData.description.trim(),
                icon: formData.icon,
                category: 'treats',
                starCost: formData.starCost,
                limitPerWeek: formData.limitPerWeek,
                requiresApproval: formData.requiresApproval,
                imageUrl: formData.imageUrl || null,
                imageBase64: formData.imageBase64 || null,
                isActive: true,
                createdAt: serverTimestamp(),
            });

            router.push('/rewards');
        } catch {
            setError('Failed to create reward. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Create New Reward</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Set up a reward for your children</p>
                        </div>
                        <Link
                            href="/rewards"
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

                {/* 1. Reward Details */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Gift className="text-rose-500" size={20} />
                        Reward Details
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Reward Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-medium text-lg placeholder:font-normal"
                            placeholder="e.g., 30 min screen time"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description (optional)</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                            placeholder="Add more details..."
                        />
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Icon</label>
                        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                            {REWARD_ICONS.map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`w-12 h-12 rounded-xl text-2xl transition-all border-2 ${formData.icon === icon
                                        ? 'border-rose-500 bg-rose-50'
                                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Star Cost */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Star Cost</label>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, starCost: Math.max(5, formData.starCost - 5) })}
                                    className="w-11 h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
                                >
                                    −
                                </button>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.starCost}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 5;
                                            setFormData({ ...formData, starCost: Math.max(5, Math.min(999, val)) });
                                        }}
                                        min="5"
                                        max="999"
                                        className="w-20 h-14 text-center text-2xl font-black text-amber-600 bg-white border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none shadow-sm"
                                    />
                                    <Star className="absolute -top-1.5 -right-1.5 text-amber-400 fill-amber-400" size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, starCost: Math.min(999, formData.starCost + 5) })}
                                    className="w-11 h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-lg hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
                                >
                                    +
                                </button>

                                <div className="border-l border-amber-200 h-10 mx-2"></div>

                                {/* Quick Select Buttons */}
                                <div className="flex gap-1.5">
                                    {[10, 20, 30, 50, 75, 100].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, starCost: val })}
                                            className={`w-10 h-9 rounded-lg text-xs font-bold transition-all ${formData.starCost === val ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 hover:bg-amber-100 border border-amber-200'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Reward Image */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Upload className="text-purple-500" size={20} />
                        Reward Image (Optional)
                    </div>

                    {/* Image Source Tabs */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setImageSource('upload'); clearImage(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${imageSource !== 'url'
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                }`}
                        >
                            <Upload size={16} /> Upload Image
                        </button>
                        <button
                            type="button"
                            onClick={() => { setImageSource('url'); clearImage(); }}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${imageSource === 'url'
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                }`}
                        >
                            <LinkIcon size={16} /> Image URL
                        </button>
                    </div>

                    {/* Upload Section */}
                    {imageSource !== 'url' && (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="image-upload"
                            />
                            {imagePreview && formData.imageBase64 ? (
                                <div className="relative">
                                    <div className="w-full h-48 rounded-2xl overflow-hidden border-2 border-purple-200 bg-purple-50">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imagePreview} alt="Uploaded" className="w-full h-full object-contain" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    htmlFor="image-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                                        <Upload className="text-purple-500" size={20} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">Click to upload image</p>
                                    <p className="text-xs text-slate-400 mt-1">Max 2MB • JPG, PNG</p>
                                </label>
                            )}
                        </div>
                    )}

                    {/* URL Input Section */}
                    {imageSource === 'url' && (
                        <div className="space-y-3">
                            <input
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                placeholder="https://example.com/image.jpg"
                            />
                            {imagePreview && (
                                <div className="relative">
                                    <div className="w-full h-48 rounded-2xl overflow-hidden border-2 border-purple-200 bg-purple-50">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imagePreview}
                                            alt="URL Preview"
                                            className="w-full h-full object-contain"
                                            onError={() => setImagePreview('')}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Settings */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <ShieldCheck className="text-green-500" size={20} />
                        Settings
                    </div>

                    <div
                        onClick={() => setFormData({ ...formData, requiresApproval: !formData.requiresApproval })}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <div>
                            <p className="font-bold text-gray-800">Requires Approval</p>
                            <p className="text-sm text-gray-500 mt-0.5">You&apos;ll need to approve before the child receives it</p>
                        </div>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.requiresApproval ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${formData.requiresApproval ? 'translate-x-5' : ''}`} />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                        <X size={16} /> {error}
                    </div>
                )}

                {/* Submit */}
                <div className="pt-4">
                    <Button
                        size="lg"
                        className="w-full text-lg h-14 bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200"
                        onClick={handleSubmit}
                        isLoading={submitting}
                    >
                        Create Reward
                    </Button>
                </div>
            </main>
        </div>
    );
}
