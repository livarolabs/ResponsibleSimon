'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, profileLoading, needsOnboarding } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!loading && !profileLoading && user && needsOnboarding) {
            router.replace('/onboarding');
        }
    }, [user, loading, profileLoading, needsOnboarding, router]);

    if (loading || profileLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            </div>
        );
    }

    if (!user || needsOnboarding) {
        return null;
    }

    return (
        <>
            {children}
            <BottomNav />
        </>
    );
}
