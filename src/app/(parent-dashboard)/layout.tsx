'use client';

import { useParentAuth } from '@/modules/parent';
import { ProfileCompletionModal } from '@/components/auth/ProfileCompletionModal';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function ParentDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { parent, loading } = useParentAuth();

    // Show profile completion modal if profile is incomplete
    const showProfileCompletion = !loading && parent && !parent.isProfileComplete;

    return (
        <>
            {showProfileCompletion && <ProfileCompletionModal />}
            <div className={`min-h-screen ${showProfileCompletion ? 'pointer-events-none filter blur-sm select-none overflow-hidden' : ''}`}>
                <Sidebar
                    userName={parent?.name || 'User'}
                    userInitial={parent?.name?.[0] || 'U'}
                />
                <main className="lg:ml-64 min-h-screen">
                    {children}
                </main>
            </div>
        </>
    );
}
