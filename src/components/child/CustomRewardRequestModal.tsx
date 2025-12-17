'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui';

interface CustomRewardRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: {
        name: string;
        link: string;
        image: string | null;
    }) => Promise<void>;
    isLoading?: boolean;
}

export function CustomRewardRequestModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
}: CustomRewardRequestModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        link: '',
        image: null as string | null,
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setFormData(prev => ({ ...prev, image: base64 }));
            setImagePreview(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Please enter a reward name');
            return;
        }

        try {
            await onSubmit(formData);
            setFormData({ name: '', link: '', image: null });
            setImagePreview(null);
            onClose();
        } catch (error) {
            console.error('Error submitting request:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Plus size={24} />
                        Request Custom Reward
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="hover:bg-white/20 p-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Reward Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Reward Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Gaming Console, Bicycle"
                            disabled={isLoading}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 transition-colors"
                        />
                    </div>

                    {/* Link/URL */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Link or Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.link}
                            onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                            placeholder="e.g., https://amazon.com/... or Amazon link"
                            disabled={isLoading}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none disabled:bg-gray-100 transition-colors"
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Reward Image (Optional)
                        </label>
                        <div className="space-y-3">
                        {imagePreview && (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-purple-200 bg-gray-50">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, image: null }));
                                            setImagePreview(null);
                                        }}
                                        disabled={isLoading}
                                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
                                }`}>
                                <Upload size={20} className="text-purple-500" />
                                <span className="text-sm font-medium text-gray-700">
                                    {imagePreview ? 'Change image' : 'Click to upload image'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isLoading}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            variant="ghost"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                            {isLoading ? 'Sending...' : 'Send Request'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
