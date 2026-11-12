import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/AuthenticatedShell';

// Signed-in pages are private, so keep them out of search results.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
