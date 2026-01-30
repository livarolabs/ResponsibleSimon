'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { joinHousehold, getHousehold, Household } from '@/lib/user-service';

export default function JoinHouseholdPage() {
    const params = useParams();
    const code = params.code as string;
    const router = useRouter();
    const { user, loading, needsOnboarding, refreshProfile } = useAuth();

    const [household, setHousehold] = useState<Household | null>(null);
    const [checkingCode, setCheckingCode] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkInviteCode();
    }, [code]);

    const checkInviteCode = async () => {
        if (!code) {
            setError('Invalid invite link');
            setCheckingCode(false);
            return;
        }

        try {
            // We need to find the household by code - use the joinHousehold logic
            // For now, we'll just validate on join
            setCheckingCode(false);
        } catch (err) {
            console.error('Error checking code:', err);
            setError('Invalid invite code');
            setCheckingCode(false);
        }
    };

    const handleJoin = async () => {
        if (!user || !code) return;

        setJoining(true);
        setError('');

        try {
            const result = await joinHousehold(user.uid, code);
            if (result) {
                await refreshProfile();
                router.push('/dashboard');
            } else {
                setError('Invalid invite code. Please check the link and try again.');
            }
        } catch (err) {
            console.error('Error joining household:', err);
            setError('Failed to join household. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    // Not logged in - redirect to signup with return URL
    useEffect(() => {
        if (!loading && !user) {
            // Store the invite code for after signup
            sessionStorage.setItem('pendingInviteCode', code);
            router.push('/signup');
        }
    }, [user, loading, code, router]);

    // User needs to complete onboarding first
    useEffect(() => {
        if (!loading && user && needsOnboarding) {
            // Store the invite code for after onboarding
            sessionStorage.setItem('pendingInviteCode', code);
            router.push('/onboarding');
        }
    }, [user, loading, needsOnboarding, code, router]);

    if (loading || checkingCode) {
        return (
            <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1 className="page-title">🏠 Join Household</h1>
                <p className="page-subtitle">You&apos;ve been invited!</p>
            </div>

            {error && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', marginBottom: 'var(--space-md)' }}>
                    {error}
                </div>
            )}

            <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                    Invite Code
                </p>
                <div style={{ fontSize: '32px', letterSpacing: '4px', fontWeight: 'bold' }}>
                    {code?.toUpperCase()}
                </div>
            </div>

            <button
                onClick={handleJoin}
                className="btn btn-primary btn-full"
                disabled={joining}
            >
                {joining ? 'Joining...' : 'Join Household'}
            </button>

            <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-secondary btn-full"
                style={{ marginTop: 'var(--space-sm)' }}
            >
                Cancel
            </button>
        </div>
    );
}
