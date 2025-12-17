'use client';

import { ParentAuthProvider } from '@/modules/parent';
import { DatabaseProvider } from '@/lib/db';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <DatabaseProvider>
            <ParentAuthProvider>
                {children}
            </ParentAuthProvider>
        </DatabaseProvider>
    );
}
