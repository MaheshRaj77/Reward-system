'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';

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

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB for base64)
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

                setFamilyId(parent.familyId);
                setLoading(false);
            } catch (err) {
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
        } catch (err) {
            setError('Failed to create reward. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <header className="bg-white/40 backdrop-blur-md border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/rewards" className="text-gray-600 hover:text-gray-800 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">🎁 New Reward</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8">
                <div className="bg-white/60 backdrop-blur-sm border border-rose-100 rounded-2xl p-6 space-y-6 shadow-sm">
                    {/* Preview */}
                    <div className="text-center p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200">
                        {imagePreview ? (
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-xl overflow-hidden border-2 border-rose-200">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" onError={() => setImagePreview('')} />
                            </div>
                        ) : (
                            <div className="text-5xl mb-3">{formData.icon}</div>
                        )}
                        <h3 className="font-bold text-gray-800 text-lg">{formData.name || 'Reward Name'}</h3>
                        {formData.description && <p className="text-sm text-gray-600 mt-1">{formData.description}</p>}
                        <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-white/60 rounded-full text-sm border border-rose-200">
                            <span>⭐</span>
                            <span className="text-gray-800 font-medium">{formData.starCost}</span>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">Reward Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="e.g., 30 min screen time"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">Description (optional)</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Add more details..."
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-3">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {REWARD_ICONS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`w-12 h-12 rounded-xl text-2xl transition-all ${formData.icon === icon
                                        ? 'ring-2 ring-indigo-500 bg-indigo-50'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reward Image */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-3">Reward Image (optional)</label>
                        <div className="space-y-4">
                            {/* Image Source Tabs */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImageSource('upload')}
                                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${imageSource === 'upload' || imageSource === 'none'
                                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    📤 Upload Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageSource('url')}
                                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${imageSource === 'url'
                                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    🔗 Image URL
                                </button>
                            </div>

                            {/* Upload Section */}
                            {imageSource !== 'url' && (
                                <div className="relative">
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
                                            <div className="w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-indigo-300 bg-indigo-50">
                                                <img src={imagePreview} alt="Uploaded" className="w-full h-full object-contain" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearImage}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <label
                                            htmlFor="image-upload"
                                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="text-3xl mb-2">📷</div>
                                            <p className="text-sm text-gray-600">Click to upload image</p>
                                            <p className="text-xs text-gray-400 mt-1">Max 2MB • JPG, PNG, GIF</p>
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
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    {imagePreview && (
                                        <div className="relative">
                                            <div className="w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-indigo-300 bg-indigo-50">
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
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Star Cost */}
                    <div>
                        <label className="block text-sm text-gray-700 font-medium mb-2">Star Cost: {formData.starCost}</label>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            value={formData.starCost}
                            onChange={e => setFormData({ ...formData, starCost: parseInt(e.target.value) })}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>5 (Easy)</span>
                            <span>50</span>
                            <span>100 (Big)</span>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                            <input
                                type="checkbox"
                                checked={formData.requiresApproval}
                                onChange={e => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                className="w-5 h-5 rounded accent-indigo-500"
                            />
                            <div>
                                <p className="text-gray-800 font-medium">Requires Approval</p>
                                <p className="text-xs text-gray-600">You&apos;ll need to approve before the child receives it</p>
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <Button onClick={handleSubmit} isLoading={submitting} className="w-full" size="lg">
                        Create Reward
                    </Button>
                </div>
            </main>
        </div>
    );
}
