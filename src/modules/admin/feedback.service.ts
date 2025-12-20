import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

export interface AdminFeedback {
    id: string;
    type: 'feature' | 'problem' | 'feedback';
    subject: string | null;
    message: string;
    pagePath: string;
    pageTitle: string | null;
    userId: string | null;
    userName: string | null;
    userType: 'parent' | 'child' | 'admin' | 'guest';
    familyId: string | null;
    status: 'new' | 'reviewed' | 'resolved';
    createdAt: string;
    userAgent: string | null;
    screenWidth: number | null;
    screenHeight: number | null;
}

export const AdminFeedbackService = {
    getFeedback: async (): Promise<AdminFeedback[]> => {
        try {
            console.log('[AdminFeedback] Fetching feedback...');
            const feedbackQuery = query(
                collection(db, 'feedback'),
                orderBy('createdAt', 'desc'),
                limit(200)
            );
            const feedbackSnap = await getDocs(feedbackQuery);
            console.log('[AdminFeedback] Found:', feedbackSnap.docs.length);

            return feedbackSnap.docs.map(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate
                    ? data.createdAt.toDate().toISOString()
                    : '';

                return {
                    id: doc.id,
                    type: data.type || 'feedback',
                    subject: data.subject || null,
                    message: data.message || '',
                    pagePath: data.pagePath || '',
                    pageTitle: data.pageTitle || null,
                    userId: data.userId || null,
                    userName: data.userName || null,
                    userType: data.userType || 'guest',
                    familyId: data.familyId || null,
                    status: data.status || 'new',
                    createdAt: date,
                    userAgent: data.userAgent || null,
                    screenWidth: data.screenWidth || null,
                    screenHeight: data.screenHeight || null
                };
            });
        } catch (e) {
            console.error('[AdminFeedback] Error:', e);
            return [];
        }
    },

    updateStatus: async (feedbackId: string, status: 'new' | 'reviewed' | 'resolved'): Promise<void> => {
        try {
            await updateDoc(doc(db, 'feedback', feedbackId), { status });
            console.log('[AdminFeedback] Updated status:', feedbackId, status);
        } catch (e) {
            console.error('[AdminFeedback] Failed to update status:', e);
            throw e;
        }
    }
};
