'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminAuthService } from '@/modules/admin/auth.service';
import { AdminSidebar } from './AdminSidebar';
import { Spinner } from '@/components/ui';

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const isLoginPage = pathname === '/admin/login';
            const authenticated = AdminAuthService.isAuthenticated();

            if (isLoginPage) {
                if (authenticated) {
                    router.replace('/admin/dashboard');
                } else {
                    setIsAuthorized(true);
                }
                setIsLoading(false);
                return;
            }

            if (!authenticated) {
                router.replace('/admin/login');
                return;
            }

            setIsAuthorized(true);
            setIsLoading(false);
        };

        checkAuth();
    }, [pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Spinner size="lg" className="text-indigo-500" />
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <main className="min-h-screen bg-gray-950">{children}</main>;
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            <main className="flex-1 lg:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
