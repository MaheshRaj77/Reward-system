import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { Send, X, User, ExternalLink, ChevronDown, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderType: 'parent' | 'child';
    senderName?: string;
    createdAt: Timestamp | null;
    read?: boolean;
    imageBase64?: string;
}

interface ChatOverlayProps {
    taskId: string;
    familyId: string;
    childIds: string[]; // List of assigned children
    childrenData?: Record<string, { name: string }>; // Map of childId to name
    currentUserId: string; // The parent's ID
    currentUserType?: 'parent' | 'child';
    currentUserName?: string;
    onClose?: () => void;
}

export function ChatOverlay({ taskId, familyId, childIds, childrenData = {}, currentUserId, currentUserType = 'parent', currentUserName = 'Parent', onClose }: ChatOverlayProps) {
    const [selectedChildId, setSelectedChildId] = useState<string>(childIds[0] || '');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update selected child if props change
    useEffect(() => {
        if (childIds.length > 0 && !childIds.includes(selectedChildId)) {
            setSelectedChildId(childIds[0]);
        }
    }, [childIds, selectedChildId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Listen for messages & Mark as read
    useEffect(() => {
        if (!familyId || !selectedChildId) return;

        const q = query(
            collection(db, 'messages'),
            where('familyId', '==', familyId),
            where('taskId', '==', taskId),
            where('childId', '==', selectedChildId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const msgs: Message[] = [];
            const unreadIds: string[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data() as Omit<Message, 'id'>;
                msgs.push({ id: doc.id, ...data });

                // Collect unread messages from OTHER party
                // If I am parent, I want messages from CHILD that are unread
                // If I am child, I want messages from PARENT that are unread
                const otherParty = currentUserType === 'parent' ? 'child' : 'parent';
                if (data.senderType === otherParty && !data.read) {
                    unreadIds.push(doc.id);
                }
            });

            setMessages(msgs);
            setLoading(false);

            // Mark messages as read
            if (unreadIds.length > 0) {
                const batch = writeBatch(db);
                unreadIds.forEach(id => {
                    batch.update(doc(db, 'messages', id), { read: true });
                });
                try {
                    await batch.commit();
                } catch (err) {
                    console.error("Failed to mark messages as read:", err);
                }
            }
        });

        return () => unsubscribe();
    }, [taskId, familyId, selectedChildId, currentUserType]);

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

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() && !previewImage) return;

        setSending(true);
        try {
            await addDoc(collection(db, 'messages'), {
                text: newMessage.trim(),
                familyId,
                taskId,
                childId: selectedChildId,
                senderId: currentUserId,
                senderType: currentUserType,
                senderName: currentUserName,
                read: false,
                imageBase64: previewImage,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
            setPreviewImage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Send Push Notification to Recipient
            try {
                if (currentUserType === 'child') {
                    // Child sending to Parent
                    // Get all parents in the family
                    const parentsQuery = query(collection(db, 'parents'), where('familyId', '==', familyId));
                    const parentsSnap = await getDocs(parentsQuery);

                    parentsSnap.forEach(async (parentDoc) => {
                        const parentData = parentDoc.data();
                        if (parentData?.notifications?.push && parentData?.fcmToken) {
                            await fetch('/api/notifications/send-notification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    token: parentData.fcmToken,
                                    title: `New Message from ${currentUserName || 'Child'} 💬`,
                                    body: newMessage.trim() || 'Sent a photo',
                                    url: `/chat?taskId=${taskId}&childId=${currentUserId}`,
                                })
                            });
                        }
                    });
                } else {
                    // Parent sending to Child
                    // Note: Child push notifications require PWA install on child device
                    // We can implement child token storage later if needed.
                    // For now, this part is ready for when child has token.

                    // const childDoc = await getDoc(doc(db, 'children', selectedChildId));
                    // const childData = childDoc.data();
                    // if (childData?.fcmToken) { ... }
                }
            } catch (err) {
                console.error('Failed to notify recipient:', err);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
            // Re-focus input after sending
            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
            input?.focus();
        }
    };

    const fullChatHref = currentUserType === 'parent'
        ? `/chat?taskId=${taskId}&childId=${selectedChildId}`
        : `/child/${currentUserId}/chat?taskId=${taskId}`;

    // Helper to get child name
    const getChildName = (id: string) => childrenData[id]?.name || `Child ${id.slice(0, 4)}...`;

    return (
        <div className="bg-white rounded-b-2xl border-x border-b border-indigo-100 p-4 shadow-sm -mt-2 animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <span className="bg-indigo-100 p-1 rounded-md text-indigo-600">
                            <User size={14} />
                        </span>
                        Chat
                    </h4>

                    {/* Child Selector if multiple */}
                    {childIds.length > 1 && (
                        <div className="relative">
                            <select
                                value={selectedChildId}
                                onChange={(e) => setSelectedChildId(e.target.value)}
                                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium py-1 pl-2 pr-6 rounded-lg cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                {childIds.map(id => (
                                    <option key={id} value={id}>{getChildName(id)}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Link
                        href={fullChatHref}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors"
                        title="Open Full Chat"
                    >
                        <ExternalLink size={14} />
                    </Link>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors"
                            title="Close Chat"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="bg-gray-50 rounded-xl p-3 h-64 overflow-y-auto mb-3 space-y-3 custom-scrollbar"
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Spinner size="sm" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-gray-400 text-sm">
                        <span className="text-2xl mb-1">💭</span>
                        <p>No messages yet.</p>
                        <p className="text-xs opacity-70">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderType === 'parent';
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMe
                                        ? 'bg-indigo-500 text-white rounded-tr-none'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
                                        }`}
                                >
                                    {msg.imageBase64 && (
                                        <div className="mb-2 -mx-1 -mt-1">
                                            <Image src={msg.imageBase64} alt="Shared" width={200} height={150} className="w-full h-auto rounded-lg" />
                                        </div>
                                    )}
                                    {msg.text && <p>{msg.text}</p>}
                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        <span className="text-[10px]">
                                            {msg.createdAt?.seconds
                                                ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : 'Sending...'}
                                        </span>
                                        {isMe && msg.read && (
                                            <span className="text-[10px] font-bold">✓✓</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                {previewImage && (
                    <div className="relative inline-block w-20 h-20 rounded-xl overflow-hidden border border-indigo-100 shadow-sm mx-2">
                        <Image src={previewImage} alt="Preview" width={80} height={80} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={handleRemovePreview}
                            className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                        title="Add Image"
                    >
                        <ImagePlus size={20} />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                        disabled={sending}
                    />
                    <Button
                        type="submit"
                        disabled={(!newMessage.trim() && !previewImage) || sending}
                        className="w-12 h-[42px] !p-0 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 shrink-0"
                    >
                        {sending ? <Spinner size="sm" /> : <Send size={18} />}
                    </Button>
                </div>
            </form>
        </div>
    );
}
