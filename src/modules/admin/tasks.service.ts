import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, orderBy, doc, getDoc } from 'firebase/firestore';

export interface AdminTask {
    id: string;
    title: string;
    assignedBy: string; // Parent Name
    assignedTo: string; // Child Name
    status: 'pending' | 'completed' | 'approved' | 'active';
    createdAt: string;
    location: string | null;
}

export const AdminTasksService = {
    getTasks: async (): Promise<AdminTask[]> => {
        try {
            // Fetch recent 50 tasks
            const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(50));
            const tasksSnap = await getDocs(tasksQuery);

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

                return {
                    id: doc.id,
                    title: data.title || 'Untitled',
                    assignedBy: parentMap[data.familyId] || 'Unknown Parent',
                    assignedTo: childNames,
                    status: data.status || 'active',
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
