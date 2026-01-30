'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, regenerateInviteCode } from '@/lib/user-service';
import { AVATAR_OPTIONS } from '@/lib/types';

export default function SettingsPage() {
    const { user, userProfile, household, householdMembers, signOut, refreshProfile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [avatarEmoji, setAvatarEmoji] = useState(userProfile?.avatarEmoji || '👨');
    const [copied, setCopied] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await updateUserProfile(user.uid, { displayName, avatarEmoji });
            await refreshProfile();
            setEditMode(false);
        } catch (err) {
            console.error('Error updating profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (household?.inviteCode) {
            navigator.clipboard.writeText(household.inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegenerateCode = async () => {
        if (!household) return;
        if (!confirm('Generate a new invite code? The old code will stop working.')) return;
        setLoading(true);
        try {
            await regenerateInviteCode(household.id);
            await refreshProfile();
        } catch (err) {
            console.error('Error regenerating code:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (err) {
            console.error('Error signing out:', err);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">⚙️ Settings</h1>
                <p className="page-subtitle">Manage your profile and household</p>
            </div>

            {/* Profile Section */}
            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Your Profile</h3>

                {editMode ? (
                    <>
                        <div className="form-group">
                            <label className="form-label">Display Name</label>
                            <input
                                type="text"
                                className="input"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Avatar</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: 'var(--space-xs)'
                            }}>
                                {AVATAR_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setAvatarEmoji(emoji)}
                                        style={{
                                            fontSize: '24px',
                                            padding: 'var(--space-xs)',
                                            borderRadius: 'var(--radius-md)',
                                            border: avatarEmoji === emoji ? '3px solid var(--color-primary)' : '2px solid var(--color-border)',
                                            background: avatarEmoji === emoji ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-surface)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setEditMode(false)} className="btn btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span style={{ fontSize: '48px' }}>{userProfile?.avatarEmoji}</span>
                            <div>
                                <div className="font-semibold">{userProfile?.displayName}</div>
                                <div className="text-muted text-sm">{user?.email}</div>
                            </div>
                        </div>
                        <button onClick={() => setEditMode(true)} className="btn btn-secondary">
                            Edit
                        </button>
                    </div>
                )}
            </div>

            {/* Household Section */}
            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Household</h3>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="text-muted text-sm">Household Name</div>
                    <div className="font-semibold">{household?.name}</div>
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="text-muted text-sm">Members</div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
                        {householdMembers.map(member => (
                            <div key={member.id} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '32px' }}>{member.avatarEmoji}</div>
                                <div className="text-sm">{member.displayName}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="text-muted text-sm">Invite Code</div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginTop: 'var(--space-xs)'
                    }}>
                        <code style={{
                            fontSize: '24px',
                            letterSpacing: '4px',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            {household?.inviteCode}
                        </code>
                        <button onClick={handleCopyCode} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                            {copied ? '✓ Copied' : '📋 Copy'}
                        </button>
                    </div>
                    <p className="text-muted text-sm" style={{ marginTop: 'var(--space-xs)' }}>
                        Share this code to invite others to your household
                    </p>
                    <button
                        onClick={handleRegenerateCode}
                        className="text-muted text-sm"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 'var(--space-sm)' }}
                        disabled={loading}
                    >
                        Generate new code
                    </button>
                </div>
            </div>

            {/* Sign Out */}
            <button
                onClick={handleLogout}
                className="btn btn-full"
                style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    border: '1px solid var(--color-error)'
                }}
            >
                Sign Out
            </button>
        </div>
    );
}
