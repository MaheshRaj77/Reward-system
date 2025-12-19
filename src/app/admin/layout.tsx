import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Portal | Pinmbo World',
    description: 'Administrative access for Pinmbo World',
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
