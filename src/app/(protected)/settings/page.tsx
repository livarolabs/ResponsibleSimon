'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your account</p>
            </div>

            {/* Profile Card */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'white'
                    }}>
                        {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h3 className="font-semibold">{user?.displayName || 'User'}</h3>
                        <p className="text-sm text-muted">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* App Info */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>About</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                    <span className="text-secondary">Version</span>
                    <span>1.0.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Build</span>
                    <span className="text-muted">PWA</span>
                </div>
            </div>

            {/* Features Info */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Features</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <span>📋</span>
                        <span className="text-secondary">Recurring Bills Tracker</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <span>💳</span>
                        <span className="text-secondary">Loan Management</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span>🏦</span>
                        <span className="text-secondary">Savings Payback Tracking</span>
                    </li>
                </ul>
            </div>

            {/* Sign Out */}
            <button
                onClick={handleSignOut}
                className="btn btn-secondary btn-full"
                disabled={loading}
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
                {loading ? 'Signing out...' : 'Sign Out'}
            </button>

            {/* Footer */}
            <p style={{
                textAlign: 'center',
                marginTop: 'var(--space-xl)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)'
            }}>
                Made with 💜 for responsible finances
            </p>
        </div>
    );
}
