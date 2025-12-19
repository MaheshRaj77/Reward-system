'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { ChevronLeft, Send, MessageSquare, Camera, X, ImageIcon, RotateCcw } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    senderType: 'parent' | 'child';
    senderName: string;
    text: string;
    imageBase64?: string;
    taskId: string;
    createdAt: Timestamp;
}

interface TaskData {
    id: string;
    title: string;
    category: string;
    starValue?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
    study: '📚', health: '💪', behavior: '🌟', chores: '🧹', creativity: '🎨', social: '👋',
};

function ChildChatContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const childId = params.id as string;

    const taskId = searchParams.get('taskId');

    const [loading, setLoading] = useState(true);
    const [child, setChild] = useState<{ id: string; name: string; familyId: string } | null>(null);
    const [task, setTask] = useState<TaskData | null>(null);
    const [taskList, setTaskList] = useState<TaskData[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Load child and task data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Get child
                const childDoc = await getDoc(doc(db, 'children', childId));
                if (!childDoc.exists()) {
                    router.push('/child/login');
                    return;
                }
                const childData = childDoc.data();
                setChild({
                    id: childDoc.id,
                    name: childData.name,
                    familyId: childData.familyId,
                });

                // Get task if taskId provided, otherwise fetch all tasks for thread list
                if (taskId) {
                    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
                    if (taskDoc.exists()) {
                        const taskData = taskDoc.data();
                        setTask({
                            id: taskDoc.id,
                            title: taskData.title,
                            category: taskData.category,
                            starValue: taskData.starValue,
                        });
                    }
                } else {
                    // Fetch all tasks assigned to this child for thread list
                    const tasksQuery = query(
                        collection(db, 'tasks'),
                        where('assignedChildIds', 'array-contains', childId),
                        where('isActive', '==', true)
                    );
                    const tasksSnap = await getDocs(tasksQuery);
                    const tasks: TaskData[] = [];
                    tasksSnap.docs.forEach((doc) => {
                        const data = doc.data();
                        tasks.push({
                            id: doc.id,
                            title: data.title,
                            category: data.category,
                            starValue: data.starValue,
                        });
                    });
                    setTaskList(tasks);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error loading data:', error);
                router.push('/child/login');
            }
        };

        if (childId) loadData();
    }, [childId, taskId, router]);

    // Load messages for this task + child
    useEffect(() => {
        if (!child || !taskId) return;

        const q = query(
            collection(db, 'messages'),
            where('familyId', '==', child.familyId),
            where('taskId', '==', taskId),
            where('childId', '==', childId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [child, taskId, childId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Start camera
    const startCamera = useCallback(async () => {
        setShowCamera(true);
        setCameraError(null);
        setCameraReady(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraReady(true);
                };
            }
        } catch (error) {
            console.error('Camera error:', error);
            setCameraError('Could not access camera. Please allow camera permissions or use "Upload Photo" instead.');
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
        setCameraReady(false);
        setCameraError(null);
    }, []);

    // Capture photo from camera
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(imageData);
        stopCamera();
    }, [stopCamera]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Image is too large! Please choose an image under 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !imagePreview) || !child || !taskId) return;

        setSending(true);
        try {
            await addDoc(collection(db, 'messages'), {
                familyId: child.familyId,
                taskId,
                childId,
                senderId: childId,
                senderType: 'child',
                senderName: child.name,
                text: newMessage.trim(),
                imageBase64: imagePreview || null,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!taskId || !task) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
                {/* Header */}
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
                            💬
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">Guild Chat</h1>
                            <p className="text-sm text-blue-300">Message your parent about quests</p>
                        </div>
                    </div>

                    {taskList.length === 0 ? (
                        <div className="bg-slate-800/60 rounded-3xl p-8 text-center border border-slate-700/50">
                            <MessageSquare size={48} className="mx-auto mb-4 text-slate-600" />
                            <h2 className="text-lg font-bold text-white mb-2">No Quests Yet</h2>
                            <p className="text-slate-400 mb-4">You don't have any quests to chat about.</p>
                            <Link
                                href={`/child/${childId}/tasks`}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all inline-block shadow-lg shadow-blue-500/30"
                            >
                                Go to Quests
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {taskList.map((t) => (
                                <Link
                                    key={t.id}
                                    href={`/child/${childId}/chat?taskId=${t.id}`}
                                    className="block bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-900/60 to-cyan-900/60 border border-blue-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                            {CATEGORY_ICONS[t.category] || '📋'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{t.title}</h3>
                                            <p className="text-sm text-slate-400">Tap to chat with parent</p>
                                        </div>
                                        <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                                            →
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    {/* Camera Header */}
                    <div className="p-4 flex items-center justify-between bg-black/50">
                        <button
                            onClick={stopCamera}
                            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <span className="text-white font-semibold">Take a Photo</span>
                        <div className="w-10" />
                    </div>

                    {/* Camera View */}
                    <div className="flex-1 flex items-center justify-center relative">
                        {cameraError ? (
                            <div className="text-center p-6">
                                <Camera size={48} className="mx-auto mb-4 text-gray-400" />
                                <p className="text-white mb-4">{cameraError}</p>
                                <button
                                    onClick={() => {
                                        stopCamera();
                                        fileInputRef.current?.click();
                                    }}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold"
                                >
                                    Upload Photo Instead
                                </button>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {!cameraReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                                        <Spinner size="lg" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Capture Button */}
                    {!cameraError && (
                        <div className="p-6 bg-black/50 flex items-center justify-center gap-4">
                            <button
                                onClick={stopCamera}
                                className="p-4 bg-gray-600 text-white rounded-full"
                            >
                                <RotateCcw size={24} />
                            </button>
                            <button
                                onClick={capturePhoto}
                                disabled={!cameraReady}
                                className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
                            >
                                <div className="w-16 h-16 bg-white rounded-full border-2 border-gray-400" />
                            </button>
                            <div className="w-14" />
                        </div>
                    )}

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link
                        href={`/child/${childId}/tasks`}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{CATEGORY_ICONS[task.category] || '📋'}</span>
                            <h1 className="font-bold text-gray-900 truncate">{task.title}</h1>
                        </div>
                        <p className="text-xs text-gray-400">Chat with Parent • Send photos for help</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={40} className="text-blue-300" />
                        </div>
                        <p className="font-medium text-gray-600">Ask your parent a question!</p>
                        <p className="text-sm text-center mt-1 text-gray-400 max-w-xs">
                            Need help with &quot;{task.title}&quot;? Send a message or photo below.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.senderType === 'child' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.senderType === 'child'
                                        ? 'bg-blue-500 text-white rounded-br-md'
                                        : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md shadow-sm'
                                        }`}
                                >
                                    {msg.senderType === 'parent' && (
                                        <div className="text-xs text-blue-500 font-semibold mb-1">
                                            👨‍👩‍👧 Parent
                                        </div>
                                    )}
                                    {/* Image in message */}
                                    {msg.imageBase64 && (
                                        <div className="mb-2 rounded-lg overflow-hidden">
                                            <Image
                                                src={msg.imageBase64}
                                                alt="Shared photo"
                                                width={300}
                                                height={200}
                                                className="w-full h-auto max-h-48 object-cover rounded-lg"
                                            />
                                        </div>
                                    )}
                                    {msg.text && <p className="text-sm">{msg.text}</p>}
                                    <div className={`text-[10px] mt-1 ${msg.senderType === 'child' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Image Preview */}
            {imagePreview && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
                    <div className="max-w-2xl mx-auto">
                        <div className="relative inline-block">
                            <Image
                                src={imagePreview}
                                alt="Preview"
                                width={120}
                                height={80}
                                className="w-24 h-16 object-cover rounded-lg border-2 border-blue-300"
                            />
                            <button
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">📸 Photo ready to send</p>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0">
                <div className="max-w-2xl mx-auto flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />

                    {/* Camera Button */}
                    <button
                        onClick={startCamera}
                        className="p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors flex-shrink-0 shadow-lg shadow-purple-200"
                        title="Take a photo"
                    >
                        <Camera size={20} />
                    </button>

                    {/* Upload Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors flex-shrink-0"
                        title="Upload a photo"
                    >
                        <ImageIcon size={20} />
                    </button>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="Ask a question..."
                        className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />

                    {/* Send Button */}
                    <button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !imagePreview) || sending}
                        className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 flex-shrink-0"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChildChatPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-900"><Spinner size="lg" /></div>}>
            <ChildChatContent />
        </Suspense>
    );
}
