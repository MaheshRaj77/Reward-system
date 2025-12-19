import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button, Spinner } from '@/components/ui';
import { Send, X, User, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderType: 'parent' | 'child';
    senderName?: string;
    createdAt: Timestamp | null;
    read?: boolean;
}

interface ChatOverlayProps {
    taskId: string;
    familyId: string;
    childIds: string[]; // List of assigned children
    currentUserId: string; // The parent's ID
    currentUserType?: 'parent' | 'child';
    currentUserName?: string;
    onClose?: () => void;
}

export function ChatOverlay({ taskId, familyId, childIds, currentUserId, currentUserType = 'parent', currentUserName = 'Parent', onClose }: ChatOverlayProps) {
    const [selectedChildId, setSelectedChildId] = useState<string>(childIds[0] || '');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Update selected child if props change
    useEffect(() => {
        if (childIds.length > 0 && !childIds.includes(selectedChildId)) {
            setSelectedChildId(childIds[0]);
        }
    }, [childIds, selectedChildId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

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
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const fullChatHref = currentUserType === 'parent'
        ? `/chat?taskId=${taskId}&childId=${selectedChildId}`
        : `/child/${currentUserId}/chat?taskId=${taskId}`;

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
                                    <option key={id} value={id}>Child {id.slice(0, 4)}...</option> // Ideally we'd map ID to Name here if available
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
            <div className="bg-gray-50 rounded-xl p-3 h-64 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
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
                                    <p>{msg.text}</p>
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
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
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
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-[42px] !p-0 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                >
                    {sending ? <Spinner size="sm" /> : <Send size={18} />}
                </Button>
            </form>
        </div>
    );
}
