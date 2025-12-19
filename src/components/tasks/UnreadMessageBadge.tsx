import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UnreadMessageBadgeProps {
    taskId: string;
    familyId: string; // Required for security/filtering
    childId?: string; // If provided, checking for messages FROM a specific child (Child Dashboard view or filtered view)
    // If childId is NOT provided, we are likely in Parent view checking for messages FROM ANY CHILD for this task
    perspective: 'parent' | 'child'; // 'parent' sees messages from 'child'; 'child' sees messages from 'parent'
}

export function UnreadMessageBadge({ taskId, familyId, childId, perspective }: UnreadMessageBadgeProps) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!taskId || !familyId) return;

        // Build query
        // If perspective is 'parent', we want messages where senderType is 'child'
        // If perspective is 'child', we want messages where senderType is 'parent'
        const targetSenderType = perspective === 'parent' ? 'child' : 'parent';

        const constraints = [
            where('familyId', '==', familyId),
            where('taskId', '==', taskId),
            where('senderType', '==', targetSenderType),
            where('read', '==', false)
        ];

        // If we are a child (perspective='child'), we strictly want messages sent TO us (childId match) 
        // OR generally for the task if the parent didn't specify a childId (though usually they should).
        // Actually, in the new schema, messages have `childId`.
        // If perspective is 'child' (viewing as child), we mostly care about messages for US (childId == our id).
        // If perspective is 'parent' (viewing as parent), we care about messages FROM any child assigned to this task. 
        //    (So we don't filter by childId unless we want to).

        if (perspective === 'child' && childId) {
            constraints.push(where('childId', '==', childId));
        }

        // Note: Firestore requires composite index for multiple equality clauses + inequality/sorts? 
        // Here we modify constraints. Ideally we need an index on [familyId, taskId, senderType, read].
        // This query should work without complex index if the dataset isn't huge, or Firestore will prompt for index creation.

        const q = query(collection(db, 'messages'), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        }, (error) => {
            console.error("Error listening to unread messages:", error);
        });

        return () => unsubscribe();
    }, [taskId, familyId, childId, perspective]);

    if (unreadCount === 0) return null;

    return (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    );
}
