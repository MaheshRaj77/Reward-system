'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { Gift, Star, Upload, Link as LinkIcon, X } from 'lucide-react';

export default function CreateRewardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [familyId, setFamilyId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        starCost: 20,
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
                description: '', // Removed from UI
                icon: '🎁', // Default icon
                category: 'treats',
                starCost: formData.starCost,
                limitPerWeek: null,
                requiresApproval: true, // Enforced default
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
                <div className="max-w-4xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Create Reward</h1>
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

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                        {/* Left Column: Details */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                                    <Gift className="text-rose-500" size={20} />
                                    Reward Details
                                </h2>

                                <div className="space-y-6">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Reward Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-medium text-lg placeholder:font-normal placeholder:text-gray-400"
                                            placeholder="e.g. 30 min screen time"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Star Cost */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">Star Cost</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-32">
                                                <input
                                                    type="number"
                                                    value={formData.starCost}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setFormData({ ...formData, starCost: Math.max(0, val) });
                                                    }}
                                                    min="0"
                                                    className="w-full px-2 py-2 text-center text-xl font-bold text-amber-600 bg-amber-50 border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm">⭐</span>
                                            </div>

                                            <span className="text-gray-500 text-sm font-medium">stars</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Image */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                                <Upload className="text-purple-500" size={20} />
                                Reward Image <span className="text-sm font-normal text-gray-400">(Optional)</span>
                            </h2>

                            <div className="space-y-4">
                                {/* Image Source Tabs */}
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, imageUrl: '', imageBase64: '' });
                                            setImagePreview('');
                                            setImageSource('upload');
                                        }}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${imageSource !== 'url'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <Upload size={16} /> Upload
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, imageUrl: '', imageBase64: '' });
                                            setImagePreview('');
                                            setImageSource('url');
                                        }}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${imageSource === 'url'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <LinkIcon size={16} /> URL
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
                                            <div className="relative group">
                                                <div className="w-full h-56 rounded-2xl overflow-hidden border-2 border-purple-200 bg-purple-50">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imagePreview} alt="Uploaded" className="w-full h-full object-cover" />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label
                                                htmlFor="image-upload"
                                                className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-purple-400 transition-all group"
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <Upload className="text-purple-500" size={28} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">Click to upload</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
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
                                            <div className="relative group">
                                                <div className="w-full h-56 rounded-2xl overflow-hidden border-2 border-purple-200 bg-purple-50">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={imagePreview}
                                                        alt="URL Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={() => setImagePreview('')}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-8 mt-8 border-t border-gray-100 flex flex-col-reverse md:flex-row justify-end gap-3">
                        <Link
                            href="/rewards"
                            className="px-6 py-3.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors text-center"
                        >
                            Cancel
                        </Link>
                        <Button
                            size="lg"
                            className="px-8 py-3.5 text-base h-auto bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200 rounded-xl"
                            onClick={handleSubmit}
                            isLoading={submitting}
                        >
                            Create Reward
                        </Button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2 animate-shake">
                            <X size={16} /> {error}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
