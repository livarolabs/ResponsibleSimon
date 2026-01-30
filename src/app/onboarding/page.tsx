'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    createUserProfile,
    createHousehold,
    joinHousehold
} from '@/lib/user-service';
import { AVATAR_OPTIONS } from '@/lib/types';

type Step = 'profile' | 'household';

export default function OnboardingPage() {
    const { user, loading, needsOnboarding, refreshProfile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>('profile');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Profile state
    const [displayName, setDisplayName] = useState('');
    const [avatarEmoji, setAvatarEmoji] = useState('👨');

    // Household state
    const [householdChoice, setHouseholdChoice] = useState<'create' | 'join'>('create');
    const [householdName, setHouseholdName] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    // Redirect if not logged in or already onboarded
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else if (!needsOnboarding) {
                router.replace('/dashboard');
            }
        }
    }, [user, loading, needsOnboarding, router]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        setError('');

        try {
            await createUserProfile(user.uid, displayName, avatarEmoji);
            setStep('household');
        } catch (err) {
            console.error('Error creating profile:', err);
            setError('Failed to create profile. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleHouseholdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        setError('');

        try {
            if (householdChoice === 'create') {
                await createHousehold(user.uid, householdName || `${displayName}'s Household`);
            } else {
                const household = await joinHousehold(user.uid, inviteCode);
                if (!household) {
                    setError('Invalid invite code. Please check and try again.');
                    setSubmitting(false);
                    return;
                }
            }
            // Refresh profile data in context
            await refreshProfile();
            router.push('/dashboard');
        } catch (err) {
            console.error('Error with household:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Show loading while checking auth
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg)'
            }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            </div>
        );
    }

    // Don't render if redirecting
    if (!user || !needsOnboarding) {
        return null;
    }

    return (
        <div className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {step === 'profile' && (
                <>
                    <div className="page-header" style={{ textAlign: 'center' }}>
                        <h1 className="page-title">Welcome! 👋</h1>
                        <p className="page-subtitle">Let&apos;s set up your profile</p>
                    </div>

                    {error && (
                        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', marginBottom: 'var(--space-md)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <label className="form-label">What should we call you?</label>
                            <input
                                type="text"
                                className="input"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Choose your avatar</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: 'var(--space-sm)',
                                marginTop: 'var(--space-sm)'
                            }}>
                                {AVATAR_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setAvatarEmoji(emoji)}
                                        style={{
                                            fontSize: '28px',
                                            padding: 'var(--space-sm)',
                                            borderRadius: 'var(--radius-md)',
                                            border: avatarEmoji === emoji ? '3px solid var(--color-primary)' : '2px solid var(--color-border)',
                                            background: avatarEmoji === emoji ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-surface)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={submitting || !displayName}
                            style={{ marginTop: 'var(--space-lg)' }}
                        >
                            {submitting ? 'Saving...' : 'Continue →'}
                        </button>
                    </form>
                </>
            )}

            {step === 'household' && (
                <>
                    <div className="page-header" style={{ textAlign: 'center' }}>
                        <h1 className="page-title">Set Up Your Household</h1>
                        <p className="page-subtitle">Track finances together</p>
                    </div>

                    {error && (
                        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', marginBottom: 'var(--space-md)' }}>
                            {error}
                        </div>
                    )}

                    {/* Choice Tabs */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                        <button
                            type="button"
                            onClick={() => setHouseholdChoice('create')}
                            className={`btn ${householdChoice === 'create' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            🏠 Create New
                        </button>
                        <button
                            type="button"
                            onClick={() => setHouseholdChoice('join')}
                            className={`btn ${householdChoice === 'join' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                        >
                            🔗 Join Existing
                        </button>
                    </div>

                    <form onSubmit={handleHouseholdSubmit}>
                        {householdChoice === 'create' ? (
                            <div className="form-group">
                                <label className="form-label">Household Name (optional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={householdName}
                                    onChange={e => setHouseholdName(e.target.value)}
                                    placeholder={`${displayName}'s Household`}
                                />
                                <p className="text-muted text-sm" style={{ marginTop: 'var(--space-xs)' }}>
                                    You&apos;ll get a code to invite your partner
                                </p>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Enter Invite Code</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                    placeholder="ABC123"
                                    maxLength={6}
                                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px' }}
                                    required={householdChoice === 'join'}
                                />
                                <p className="text-muted text-sm" style={{ marginTop: 'var(--space-xs)' }}>
                                    Ask your partner for their household code
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={submitting || (householdChoice === 'join' && !inviteCode)}
                            style={{ marginTop: 'var(--space-lg)' }}
                        >
                            {submitting ? 'Setting up...' : householdChoice === 'create' ? 'Create Household' : 'Join Household'}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
