'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui';
import { ChevronLeft, Send, MessageSquare, Star, Search, Info, Calendar, RotateCcw, ImagePlus, X } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    senderType: 'parent' | 'child';
    senderName?: string;
    text: string;
    createdAt: any;
    read?: boolean;
    imageBase64?: string;
}

interface TaskThread {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
    childId: string;
    childName: string;
    childAvatar: { presetId: string; backgroundColor: string };
    category: string;
    starValue: number;
    frequency?: any;
    deadline?: Timestamp;
    childStarBalance?: number;
    childProfileImage?: string;
}

interface ChildData {
    id: string;
    name: string;
    avatar: { presetId: string; backgroundColor: string };
    starBalance: number;
    profileImageBase64?: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
    lion: '🦁', panda: '🐼', owl: '🦉', fox: '🦊',
    unicorn: '🦄', robot: '🤖', astronaut: '👨‍🚀', hero: '🦸',
};

const CATEGORY_ICONS: Record<string, string> = {
    study: '📚', health: '💪', behavior: '🌟', chores: '🧹', creativity: '🎨', social: '👋',
};

const CATEGORY_TAGS: Record<string, string> = {
    study: 'bg-blue-500/10 text-blue-400',
    health: 'bg-green-500/10 text-green-400',
    behavior: 'bg-purple-500/10 text-purple-400',
    chores: 'bg-amber-500/10 text-amber-400',
    creativity: 'bg-pink-500/10 text-pink-400',
    social: 'bg-cyan-500/10 text-cyan-400',
};

function ChatContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [parentId, setParentId] = useState<string | null>(null);
    const [parentName, setParentName] = useState('Parent');
    const [threads, setThreads] = useState<TaskThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<TaskThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDetails, setShowDetails] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadAuth = async () => {
            try {
                const { getCurrentParent } = await import('@/lib/auth/parent-auth');
                const parent = await getCurrentParent();
                if (!parent) {
                    router.push('/auth/login');
                    return;
                }
                setFamilyId(parent.id);
                setParentId(parent.id);
                setParentName(parent.name);
                setLoading(false);
            } catch {
                router.push('/auth/login');
            }
        };
        loadAuth();
    }, [router]);

    const searchParams = useSearchParams();
    const paramTaskId = searchParams.get('taskId');
    const paramChildId = searchParams.get('childId');

    // Load threads
    useEffect(() => {
        if (!familyId) return;

        const loadTaskThreads = async () => {
            try {
                // Get all children first
                const childrenQuery = query(collection(db, 'children'), where('familyId', '==', familyId));
                const childrenSnap = await getDocs(childrenQuery);
                const childrenMap: Record<string, ChildData> = {};
                childrenSnap.docs.forEach(doc => {
                    const data = doc.data();
                    childrenMap[doc.id] = {
                        id: doc.id,
                        name: data.name,
                        avatar: data.avatar,
                        starBalance: data.starBalances?.growth || 0,
                        profileImageBase64: data.profileImageBase64
                    };
                });

                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('familyId', '==', familyId),
                    where('isChatEnabled', '==', true),
                    where('isActive', '==', true)
                );

                const unsubscribeTasks = onSnapshot(tasksQuery, async (taskSnap) => {
                    const taskThreads: TaskThread[] = [];

                    for (const taskDoc of taskSnap.docs) {
                        const taskData = taskDoc.data();
                        const assignedChildIds = taskData.assignedChildIds || [];

                        const completionsQuery = query(
                            collection(db, 'taskCompletions'),
                            where('taskId', '==', taskDoc.id),
                            where('status', 'in', ['approved', 'auto-approved'])
                        );
                        const completionsSnap = await getDocs(completionsQuery);
                        const completedChildIds = new Set(completionsSnap.docs.map(d => d.data().childId));

                        for (const childId of assignedChildIds) {
                            if (completedChildIds.has(childId)) continue;
                            const child = childrenMap[childId];
                            if (!child) continue;

                            taskThreads.push({
                                taskId: taskDoc.id,
                                taskTitle: taskData.title,
                                taskDescription: taskData.description,
                                childId: childId,
                                childName: child.name,
                                childAvatar: child.avatar,
                                category: taskData.category || 'chores',
                                starValue: taskData.starValue || 0,
                                frequency: taskData.frequency,
                                deadline: taskData.deadline,
                                childStarBalance: child.starBalance,
                                childProfileImage: child.profileImageBase64,
                            });
                        }
                    }
                    setThreads(taskThreads);

                    // Auto-select thread logic
                    if (window.innerWidth >= 768 && taskThreads.length > 0 && !selectedThread) {
                        // Priority 1: Check URL params
                        if (paramTaskId && paramChildId) {
                            const found = taskThreads.find(t => t.taskId === paramTaskId && t.childId === paramChildId);
                            if (found) {
                                setSelectedThread(found);
                                return;
                            }
                        }
                        // Priority 2: Auto-select first
                        setSelectedThread(taskThreads[0]);
                    } else if (paramTaskId && paramChildId && taskThreads.length > 0) {
                        // Even if selectedThread exists or mobile view, if params exist, enforce it once?
                        // Actually, better to just enforce if not already selected matching params
                        // But for now, simple logic: if params matches a thread, select it
                        const found = taskThreads.find(t => t.taskId === paramTaskId && t.childId === paramChildId);
                        if (found) {
                            setSelectedThread(found);
                        }
                    }
                });
                return () => unsubscribeTasks();
            } catch (error) {
                console.error('Error:', error);
            }
        };
        loadTaskThreads();
    }, [familyId]); // Removed dependencies to prevent loop, relying on snap updates

    // Load messages
    useEffect(() => {
        if (!familyId || !selectedThread) return;

        const q = query(
            collection(db, 'messages'),
            where('familyId', '==', familyId),
            where('taskId', '==', selectedThread.taskId),
            where('childId', '==', selectedThread.childId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);

            // Mark unread messages from child as read
            const unreadIds = msgs
                .filter(m => m.senderType === 'child' && !m.read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                const batch = writeBatch(db);
                unreadIds.forEach(id => {
                    batch.update(doc(db, 'messages', id), { read: true });
                });
                batch.commit().catch(console.error);
            }
        });
        return () => unsubscribe();
    }, [familyId, selectedThread]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePreview = () => {
        setPreviewImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !previewImage) || !selectedThread || !familyId || !parentId) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'messages'), {
                familyId,
                taskId: selectedThread.taskId,
                childId: selectedThread.childId,
                senderId: parentId,
                senderType: 'parent',
                senderName: parentName,
                text: newMessage.trim(),
                imageBase64: previewImage,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
            setPreviewImage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) { console.error(err); }
        finally { setSending(false); }
    };

    const filteredThreads = threads.filter(t =>
        t.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Spinner size="lg" /></div>;

    return (
        <div className="h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar (Thread List) */}
            <div className={`w-full md:w-80 bg-slate-900 flex-col shadow-2xl z-20 ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-white font-bold text-lg tracking-tight">Messages</h1>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{threads.length} Active Tasks</p>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 pb-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-slate-200 rounded-xl border border-transparent focus:border-indigo-500 focus:bg-slate-800/50 transition-all text-sm placeholder:text-slate-600 outline-none"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                    {filteredThreads.map(thread => {
                        const isSelected = selectedThread?.taskId === thread.taskId && selectedThread?.childId === thread.childId;
                        const child = filteredThreads.find(t => t.childId === thread.childId); // Simplified lookup, ideally passed down
                        // Actually we need the child data from the map, but it's embedded in thread now?
                        // Wait, thread has childName/Avatar but not balance.
                        // I need to add balance to TaskThread or look it up.
                        // I'll update TaskThread interface first.
                        return (
                            <button
                                key={`${thread.taskId}-${thread.childId}`}
                                onClick={() => setSelectedThread(thread)}
                                className={`w-full p-3.5 rounded-2xl flex items-center gap-4 transition-all text-left group border ${isSelected
                                    ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50'
                                    : 'bg-slate-800/30 border-transparent hover:bg-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <div
                                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl shadow-sm border-2 border-white/10"
                                        style={{ backgroundColor: thread.childProfileImage ? 'transparent' : (thread.childAvatar?.backgroundColor || '#334') }}
                                    >
                                        {thread.childProfileImage ? (
                                            <Image src={thread.childProfileImage} alt={thread.childName} width={48} height={48} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-white uppercase">{thread.childName.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-900 flex items-center justify-center text-[8px] font-bold ${isSelected ? 'bg-amber-400 text-amber-900' : 'bg-slate-600 text-slate-200'}`}>
                                        {thread.childStarBalance}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>{thread.childName}</h4>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500'}`}>{thread.category}</span>
                                    </div>
                                    <p className={`text-xs truncate font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-400'}`}>{thread.taskTitle}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex-col bg-slate-50 relative z-10 ${selectedThread ? 'flex' : 'hidden md:flex'}`}>
                {selectedThread ? (
                    <>
                        {/* Header */}
                        <div className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shadow-sm z-30">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedThread(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex flex-col">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                                        {selectedThread.taskTitle}
                                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                            <Star size={10} fill="currentColor" /> {selectedThread.starValue}
                                        </span>
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1">
                                        with <span className="font-semibold">{selectedThread.childName}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                title="View Task & Child Details"
                                className={`hidden md:block p-2 rounded-xl transition-colors ${showDetails ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-400'}`}
                            >
                                <Info size={20} />
                            </button>
                        </div>

                        {/* Thread Info Bar (Mobile/Tablet) - Optional context */}
                        <div className="md:hidden px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>Star Balance: <b className="text-amber-600">{selectedThread.childStarBalance || 0} ⭐</b></span>
                            <span>Due: {selectedThread.deadline ? selectedThread.deadline.toDate().toLocaleDateString() : 'No deadline'}</span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 md:space-y-6">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-60">
                                    <MessageSquare size={48} className="text-indigo-200 mb-4" />
                                    <p className="text-slate-900 font-semibold">Start chatting</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isParent = msg.senderType === 'parent';
                                    const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                                    return (
                                        <div key={msg.id} className={`flex ${isParent ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                                            {!isParent && (
                                                <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                                                    style={{ backgroundColor: selectedThread.childProfileImage ? 'transparent' : selectedThread.childAvatar?.backgroundColor }}>
                                                    {selectedThread.childProfileImage ? (
                                                        <Image src={selectedThread.childProfileImage} alt={selectedThread.childName} width={32} height={32} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-white uppercase">{selectedThread.childName.charAt(0)}</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] space-y-1 flex flex-col ${isParent ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-2.5 md:px-5 md:py-3 shadow-sm relative ${isParent ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-900 rounded-2xl rounded-tl-sm border border-slate-100'}`}>
                                                    {msg.imageBase64 && (
                                                        <div className="mb-2 -mx-2 -mt-2">
                                                            <Image src={msg.imageBase64} alt="Shared" width={300} height={200} className="w-full h-auto rounded-xl" />
                                                        </div>
                                                    )}
                                                    {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                                </div>
                                                <span className="text-[10px] text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 md:p-4 bg-white border-t border-slate-100">
                            {previewImage && (
                                <div className="mb-3 relative inline-block">
                                    <div className="relative rounded-xl overflow-hidden border border-indigo-100 shadow-sm">
                                        <Image src={previewImage} alt="Preview" width={100} height={100} className="w-24 h-24 object-cover" />
                                        <button
                                            onClick={handleRemovePreview}
                                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="max-w-3xl mx-auto flex items-center gap-2 md:gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="Send image"
                                >
                                    <ImagePlus size={22} />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 bg-slate-50 rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!newMessage.trim() && !previewImage) || sending}
                                    className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 disabled:opacity-50 transition-transform active:scale-95"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <MessageSquare size={64} className="mb-6 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Welcome to Messages</h3>
                        <p className="max-w-sm">Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>

            {/* Details Panel (Desktop Only) */}
            {
                selectedThread && showDetails && (
                    <div className="w-80 bg-white border-l border-slate-100 hidden xl:flex flex-col shadow-xl z-20">
                        <div className="p-6 border-b border-slate-100 text-center">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner bg-slate-50">
                                {CATEGORY_ICONS[selectedThread.category]}
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">{selectedThread.taskTitle}</h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${CATEGORY_TAGS[selectedThread.category] || 'bg-slate-100 text-slate-500'}`}>
                                {selectedThread.category}
                            </span>
                        </div>
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Child Profile for Context */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                <div
                                    className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-3xl shadow-md border-4 border-white mb-3"
                                    style={{ backgroundColor: selectedThread.childProfileImage ? 'transparent' : (selectedThread.childAvatar?.backgroundColor || '#334') }}
                                >
                                    {selectedThread.childProfileImage ? (
                                        <Image src={selectedThread.childProfileImage} alt={selectedThread.childName} width={64} height={64} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-white uppercase">{selectedThread.childName.charAt(0)}</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">{selectedThread.childName}</h3>
                                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm mt-1 bg-white px-3 py-1 rounded-full border border-amber-100 shadow-sm">
                                    <Star size={14} fill="currentColor" /> {selectedThread.childStarBalance || 0} Stars
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100" />

                            {selectedThread.taskDescription && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedThread.taskDescription}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                                    <div className="text-amber-500 mb-1 flex justify-center"><Star size={18} fill="currentColor" /></div>
                                    <div className="text-lg font-bold text-amber-700">{selectedThread.starValue}</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                    <div className="text-blue-500 mb-1 flex justify-center"><RotateCcw size={18} /></div>
                                    <div className="text-sm font-bold text-blue-700 capitalize mt-1">{selectedThread.frequency?.type || 'One-time'}</div>
                                </div>
                            </div>
                            {selectedThread.deadline && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deadline</h4>
                                    <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <Calendar size={18} className="text-indigo-500" />
                                        {selectedThread.deadline?.toDate().toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-900"><Spinner size="lg" /></div>}>
            <ChatContent />
        </Suspense>
    );
}
