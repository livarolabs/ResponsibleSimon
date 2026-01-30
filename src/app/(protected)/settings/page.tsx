'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    updateUserProfile,
    regenerateInviteCode,
    searchUserByEmail,
    sendHouseholdInvite,
    getPendingInvites,
    acceptInvite,
    declineInvite,
    getInviteLink,
    UserProfile,
    HouseholdInvite
} from '@/lib/user-service';
import { AVATAR_OPTIONS } from '@/lib/types';

export default function SettingsPage() {
    const { user, userProfile, household, householdMembers, signOut, refreshProfile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [avatarEmoji, setAvatarEmoji] = useState(userProfile?.avatarEmoji || '👨');
    const [linkCopied, setLinkCopied] = useState(false);

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [inviteSent, setInviteSent] = useState(false);

    // Pending invites for current user
    const [pendingInvites, setPendingInvites] = useState<HouseholdInvite[]>([]);

    useEffect(() => {
        if (user) {
            loadPendingInvites();
        }
    }, [user]);

    const loadPendingInvites = async () => {
        if (!user) return;
        const invites = await getPendingInvites(user.uid);
        setPendingInvites(invites);
    };

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

    const handleCopyLink = () => {
        if (household?.inviteCode) {
            const link = getInviteLink(household.inviteCode);
            navigator.clipboard.writeText(link);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const handleSearchUser = async () => {
        if (!searchEmail.trim()) return;

        setSearching(true);
        setSearchError('');
        setSearchResult(null);
        setInviteSent(false);

        try {
            const result = await searchUserByEmail(searchEmail);
            if (result) {
                if (result.id === user?.uid) {
                    setSearchError("That's you!");
                } else if (household?.members.includes(result.id)) {
                    setSearchError("This person is already in your household");
                } else {
                    setSearchResult(result);
                }
            } else {
                setSearchError('No user found with this email');
            }
        } catch (err) {
            console.error('Error searching:', err);
            setSearchError('Error searching. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleSendInvite = async () => {
        if (!searchResult || !userProfile || !household) return;

        setLoading(true);
        try {
            await sendHouseholdInvite(userProfile, household, searchResult.id);
            setInviteSent(true);
            setSearchResult(null);
            setSearchEmail('');
        } catch (err) {
            console.error('Error sending invite:', err);
            setSearchError('Failed to send invite');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (invite: HouseholdInvite) => {
        setLoading(true);
        try {
            await acceptInvite(invite);
            await refreshProfile();
            await loadPendingInvites();
        } catch (err) {
            console.error('Error accepting invite:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeclineInvite = async (inviteId: string) => {
        try {
            await declineInvite(inviteId);
            await loadPendingInvites();
        } catch (err) {
            console.error('Error declining invite:', err);
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

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--color-primary)' }}>
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--space-sm)' }}>📨 Pending Invites</h3>
                    {pendingInvites.map(invite => (
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0' }}>
                            <div>
                                <span style={{ fontSize: '20px' }}>{invite.fromUserAvatar}</span>
                                <span style={{ marginLeft: 'var(--space-sm)' }}><strong>{invite.fromUserName}</strong> invited you to <strong>{invite.householdName}</strong></span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                <button onClick={() => handleAcceptInvite(invite)} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}>
                                    Accept
                                </button>
                                <button onClick={() => handleDeclineInvite(invite.id)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}>
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {householdMembers.map(member => (
                            <div key={member.id} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '32px' }}>{member.avatarEmoji}</div>
                                <div className="text-sm">{member.displayName}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invite Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        👤 Add Member
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                    >
                        {linkCopied ? '✓ Link Copied!' : '🔗 Share Link'}
                    </button>
                </div>

                <button
                    onClick={handleRegenerateCode}
                    className="text-muted text-sm"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 'var(--space-md)', display: 'block' }}
                    disabled={loading}
                >
                    Generate new invite code
                </button>
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

            {/* Add Member Modal */}
            {showInviteModal && (
                <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Add Member</h3>

                        {inviteSent && (
                            <div className="card" style={{ background: 'rgba(34, 197, 94, 0.1)', marginBottom: 'var(--space-md)' }}>
                                ✓ Invite sent! They&apos;ll see it in their Settings.
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Search by Email</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <input
                                    type="email"
                                    className="input"
                                    value={searchEmail}
                                    onChange={e => setSearchEmail(e.target.value)}
                                    placeholder="partner@email.com"
                                    onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    onClick={handleSearchUser}
                                    className="btn btn-primary"
                                    disabled={searching || !searchEmail.trim()}
                                >
                                    {searching ? '...' : 'Search'}
                                </button>
                            </div>
                        </div>

                        {searchError && (
                            <p className="text-muted text-sm" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-md)' }}>
                                {searchError}
                            </p>
                        )}

                        {searchResult && (
                            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '32px' }}>{searchResult.avatarEmoji}</span>
                                    <div>
                                        <div className="font-semibold">{searchResult.displayName}</div>
                                        <div className="text-muted text-sm">Found!</div>
                                    </div>
                                </div>
                                <button onClick={handleSendInvite} className="btn btn-primary" disabled={loading}>
                                    {loading ? '...' : 'Invite'}
                                </button>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-sm)' }}>
                                Or share this link in messenger:
                            </p>
                            <button onClick={handleCopyLink} className="btn btn-secondary btn-full">
                                {linkCopied ? '✓ Copied!' : '📋 Copy Invite Link'}
                            </button>
                        </div>

                        <button
                            onClick={() => setShowInviteModal(false)}
                            className="btn btn-secondary btn-full"
                            style={{ marginTop: 'var(--space-md)' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
