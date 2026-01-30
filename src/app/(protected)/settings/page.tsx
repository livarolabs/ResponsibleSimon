'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    updateUserProfile,
    regenerateInviteCode,
    searchUsersByEmailPrefix,
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

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [inviteSent, setInviteSent] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingInvites, setPendingInvites] = useState<HouseholdInvite[]>([]);

    useEffect(() => {
        if (user) loadPendingInvites();
    }, [user]);

    const loadPendingInvites = async () => {
        if (!user) return;
        const invites = await getPendingInvites(user.uid);
        setPendingInvites(invites);
    };

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (searchEmail.length < 2) { setSuggestions([]); return; }

        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchUsersByEmailPrefix(searchEmail);
                const filtered = results.filter(u => u.id !== user?.uid && !household?.members.includes(u.id));
                setSuggestions(filtered);
            } catch (err) { console.error('Error searching:', err); }
            finally { setSearching(false); }
        }, 300);

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchEmail, user?.uid, household?.members]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await updateUserProfile(user.uid, { displayName, avatarEmoji });
            await refreshProfile();
            setEditMode(false);
        } catch (err) { console.error('Error updating profile:', err); }
        finally { setLoading(false); }
    };

    const handleCopyLink = () => {
        if (household?.inviteCode) {
            navigator.clipboard.writeText(getInviteLink(household.inviteCode));
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const handleSelectUser = (profile: UserProfile) => {
        setSelectedUser(profile);
        setSearchEmail(profile.email || '');
        setSuggestions([]);
    };

    const handleSendInvite = async () => {
        if (!selectedUser || !userProfile || !household) return;
        setLoading(true);
        setSearchError('');
        try {
            await sendHouseholdInvite(userProfile, household, selectedUser.id);
            setInviteSent(true);
            setSelectedUser(null);
            setSearchEmail('');
        } catch (err) { console.error('Error sending invite:', err); setSearchError('Failed to send invite'); }
        finally { setLoading(false); }
    };

    const handleAcceptInvite = async (invite: HouseholdInvite) => {
        setLoading(true);
        try { await acceptInvite(invite); await refreshProfile(); await loadPendingInvites(); }
        catch (err) { console.error('Error accepting invite:', err); }
        finally { setLoading(false); }
    };

    const handleDeclineInvite = async (inviteId: string) => {
        try { await declineInvite(inviteId); await loadPendingInvites(); }
        catch (err) { console.error('Error declining invite:', err); }
    };

    const handleRegenerateCode = async () => {
        if (!household || !confirm('Generate a new invite code? The old code will stop working.')) return;
        setLoading(true);
        try { await regenerateInviteCode(household.id); await refreshProfile(); }
        catch (err) { console.error('Error regenerating code:', err); }
        finally { setLoading(false); }
    };

    const handleLogout = async () => {
        try { await signOut(); router.push('/login'); }
        catch (err) { console.error('Error signing out:', err); }
    };

    const resetModal = () => {
        setShowInviteModal(false);
        setSearchEmail('');
        setSuggestions([]);
        setSelectedUser(null);
        setSearchError('');
        setInviteSent(false);
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
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0', gap: 'var(--space-sm)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: '20px' }}>{invite.fromUserAvatar}</span>
                                <span style={{ marginLeft: 'var(--space-xs)' }}><strong>{invite.fromUserName}</strong></span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
                                <button onClick={() => handleAcceptInvite(invite)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>Accept</button>
                                <button onClick={() => handleDeclineInvite(invite.id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>✕</button>
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
                            <input type="text" className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Avatar</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-xs)' }}>
                                {AVATAR_OPTIONS.map(emoji => (
                                    <button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)} style={{
                                        fontSize: '24px', padding: 'var(--space-xs)', borderRadius: 'var(--radius-md)',
                                        border: avatarEmoji === emoji ? '3px solid var(--color-primary)' : '2px solid var(--color-border)',
                                        background: avatarEmoji === emoji ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-surface)', cursor: 'pointer'
                                    }}>{emoji}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                            <button onClick={() => setEditMode(false)} className="btn btn-secondary">Cancel</button>
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
                        <button onClick={() => setEditMode(true)} className="btn btn-secondary">Edit</button>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                    <button onClick={() => setShowInviteModal(true)} className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '12px 8px', fontSize: '14px' }}>👤 Add</button>
                    <button onClick={handleCopyLink} className="btn btn-secondary" style={{ whiteSpace: 'nowrap', padding: '12px 8px', fontSize: '14px' }}>{linkCopied ? '✓ Copied!' : '🔗 Share'}</button>
                </div>
                <button onClick={handleRegenerateCode} className="text-muted text-sm" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 'var(--space-md)', display: 'block' }} disabled={loading}>Generate new invite code</button>
            </div>

            {/* Sign Out */}
            <button onClick={handleLogout} className="btn btn-full" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>Sign Out</button>

            {/* Add Member Modal */}
            {showInviteModal && (
                <div className="modal-overlay" onClick={resetModal} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{
                        width: '90%',
                        maxWidth: '400px',
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '80vh'
                    }}>

                        {/* Compact Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                            <h3 className="font-semibold" style={{ fontSize: '18px' }}>Add Member</h3>
                            <button onClick={resetModal} style={{ fontSize: '20px', color: 'var(--color-text-secondary)', padding: '4px' }}>✕</button>
                        </div>

                        {/* Success */}
                        {inviteSent && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
                                <span style={{ fontSize: '20px' }}>✅</span>
                                <p style={{ marginTop: '4px' }}>Invite sent successfully!</p>
                            </div>
                        )}

                        {/* Search */}
                        <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-primary)' }}>
                                <span style={{ padding: '0 0 0 var(--space-md)', fontSize: '18px', opacity: 0.5 }}>🔍</span>
                                <input
                                    type="email"
                                    value={searchEmail}
                                    onChange={e => { setSearchEmail(e.target.value); setSelectedUser(null); }}
                                    placeholder="Search by email..."
                                    autoFocus
                                    style={{ flex: 1, background: 'transparent', border: 'none', padding: 'var(--space-md)', color: 'var(--color-text)', fontSize: '16px', outline: 'none' }}
                                />
                                {searching && <span style={{ padding: 'var(--space-md)', opacity: 0.5 }}>⏳</span>}
                            </div>

                            {/* Autocomplete Suggestions */}
                            {suggestions.length > 0 && !selectedUser && (
                                <div style={{
                                    background: 'var(--color-bg-elevated)',
                                    border: '2px solid var(--color-border)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                                    marginTop: '-2px',
                                    overflowY: 'auto',
                                    maxHeight: '30vh', // Limit height to allow scrolling if list is long
                                    position: 'relative',
                                    zIndex: 10
                                }}>
                                    {suggestions.map((profile, index) => (
                                        <button
                                            key={profile.id}
                                            onClick={() => handleSelectUser(profile)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-md)',
                                                padding: 'var(--space-md)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                borderTop: index > 0 ? '1px solid var(--color-border)' : 'none',
                                                color: 'var(--color-text-primary)'
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '32px',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--color-bg-secondary)',
                                                borderRadius: '50%',
                                                flexShrink: 0
                                            }}>
                                                {profile.avatarEmoji}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="font-semibold" style={{ marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.displayName}</div>
                                                <div className="text-muted text-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchEmail.length >= 2 && suggestions.length === 0 && !searching && !selectedUser && (
                                <p className="text-muted text-sm" style={{ marginTop: 'var(--space-sm)', textAlign: 'center' }}>No users found</p>
                            )}
                        </div>

                        {searchError && <p style={{ color: 'var(--color-error)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>{searchError}</p>}

                        {/* Selected User Actions */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {selectedUser && (
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                        <span style={{ fontSize: '40px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', borderRadius: '50%', flexShrink: 0 }}>{selectedUser.avatarEmoji}</span>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="font-semibold" style={{ fontSize: '18px' }}>{selectedUser.displayName}</div>
                                            <div className="text-muted text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.email}</div>
                                        </div>
                                    </div>
                                    <button onClick={handleSendInvite} className="btn btn-primary btn-full" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Invite'}
                                    </button>
                                </div>
                            )}

                            {/* Share Link */}
                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'auto' }}>
                                <p className="text-muted text-xs" style={{ marginBottom: 'var(--space-sm)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Or share invite link</p>
                                <button onClick={handleCopyLink} className="btn btn-secondary btn-full" style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', padding: '10px' }}>
                                    {linkCopied ? '✓ Copied' : '🔗 Copy Link'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
