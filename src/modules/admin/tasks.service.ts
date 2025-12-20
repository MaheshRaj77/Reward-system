import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, orderBy, doc, getDoc } from 'firebase/firestore';

export interface AdminTask {
    id: string;
    title: string;
    category: string;
    assignedBy: string; // Parent Name
    assignedTo: string; // Child Name
    status: 'pending' | 'completed' | 'approved' | 'active' | 'verified' | 'bucket-list';
    stars: number;
    taskType: 'one-time' | 'recurring' | 'bucket-list';
    frequency: string | null; // daily, weekly, monthly
    deadline: string | null;
    createdAt: string;
    location: string | null;
}

export const AdminTasksService = {
    getTasks: async (): Promise<AdminTask[]> => {
        try {
            console.log('[AdminTasks] Fetching tasks...');
            // Fetch recent 200 tasks
            const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(200));
            const tasksSnap = await getDocs(tasksQuery);

            console.log('[AdminTasks] Found tasks:', tasksSnap.docs.length);

            if (tasksSnap.empty) return [];

            // Collect IDs to fetch names
            const parentIds = new Set<string>();
            // Tasks have 'assignedChildIds' array. For "Assigned To", we might join names or pick first.
            // Complexity: mapping child IDs to names.
            // We will perform a bulk fetch of all parents and children IF the list is small, 
            // OR we fetch lazily. Since this is admin view, let's try to map what we can.

            // Strategy: Fetch all known parents and children involved in these tasks.
            const childIds = new Set<string>();

            tasksSnap.docs.forEach(d => {
                const data = d.data();
                if (data.familyId) parentIds.add(data.familyId);
                if (data.assignedChildIds && Array.isArray(data.assignedChildIds)) {
                    data.assignedChildIds.forEach((cid: string) => childIds.add(cid));
                }
            });

            // Fetch names - simplified: Parallel fetch of all docs? No, use 'in' query if < 10.
            // If > 10, maybe just fetch all children/parents again? Or simple placeholder.
            // For robustness: Fetch ALL parents and children (assuming cached/small). 
            // If scalability is concern, use placeholders.

            // Let's toggle to placeholders with a "resolve" step if we had more time.
            // For now, I'll return the IDs if I can't easily get names without N+1. 
            // Actually, let's try to get at least the Parent Name since we have families.familyId map available in theory?
            // No, let's just fetch all parents/children once. It's an admin dashboard.

            const parentsSnap = await getDocs(collection(db, 'parents'));
            const childrenSnap = await getDocs(collection(db, 'children'));

            const parentMap: Record<string, string> = {};
            parentsSnap.forEach(d => parentMap[d.id] = d.data().displayName || d.data().name || 'Unknown');

            const childMap: Record<string, string> = {};
            childrenSnap.forEach(d => childMap[d.id] = d.data().name || 'Unknown');

            return tasksSnap.docs.map(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '';

                let childNames = 'None';
                if (data.assignedChildIds && Array.isArray(data.assignedChildIds)) {
                    childNames = data.assignedChildIds.map((id: string) => childMap[id] || 'Unknown').join(', ');
                }

                // Format frequency
                let frequencyStr: string | null = null;
                if (data.frequency) {
                    const freq = data.frequency;
                    if (freq.type === 'daily') frequencyStr = 'Daily';
                    else if (freq.type === 'weekly') {
                        const days = freq.daysOfWeek || [];
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        frequencyStr = `Weekly (${days.map((d: number) => dayNames[d]).join(', ')})`;
                    } else if (freq.type === 'monthly') {
                        const dates = freq.daysOfMonth || [];
                        frequencyStr = `Monthly (${dates.join(', ')})`;
                    }
                }

                // Format deadline
                const deadline = data.deadline?.toDate ? data.deadline.toDate().toISOString().split('T')[0] : null;

                return {
                    id: doc.id,
                    title: data.title || 'Untitled',
                    category: data.category || 'general',
                    assignedBy: parentMap[data.familyId] || 'Unknown Parent',
                    assignedTo: childNames,
                    status: data.status || 'active',
                    stars: data.starValue || data.stars || 0,
                    taskType: data.taskType || 'one-time',
                    frequency: frequencyStr,
                    deadline,
                    createdAt: date,
                    location: (() => {
                        if (!data.location) return null;
                        const city = data.location.city;
                        const country = data.location.country;
                        const lat = data.location.lat;
                        const lon = data.location.lon;

                        if (city && country) return `${city}, ${country}`;
                        if (country) return country;
                        if (city) return city;
                        if (lat && lon) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
                        return null;
                    })()
                };
            });

        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
