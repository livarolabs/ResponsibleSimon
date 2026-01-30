'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    getWithdrawals,
    deleteWithdrawal,
    SavingsWithdrawal,
    getPaybackProgress
} from '@/lib/savings-service';
import { formatAmount } from '@/lib/types';

export default function SavingsPage() {
    const { household, householdMembers } = useAuth();
    const [withdrawals, setWithdrawals] = useState<SavingsWithdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<string | 'all'>('all');

    useEffect(() => {
        loadWithdrawals();
    }, [household]);

    const loadWithdrawals = async () => {
        if (!household) return;
        try {
            const data = await getWithdrawals(household.id);
            setWithdrawals(data);
        } catch (err) {
            console.error('Error loading withdrawals:', err);
            setError('Failed to load withdrawals');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this withdrawal?')) return;
        try {
            await deleteWithdrawal(id);
            await loadWithdrawals();
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    // Get member info
    const getMember = (ownerId: string) => {
        return householdMembers.find(m => m.id === ownerId);
    };

    // Filter by owner
    const filteredWithdrawals = ownerFilter === 'all'
        ? withdrawals
        : withdrawals.filter(w => w.ownerId === ownerFilter);

    const totalOwed = filteredWithdrawals.reduce((sum, w) => sum + (w.withdrawnAmount - w.paidBackAmount), 0);

    if (loading) {
        return <div className="page"><div className="skeleton" style={{ height: 200 }}></div></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">🔄 Payback</h1>
                <p className="page-subtitle">Track what you owe yourself</p>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            {/* Owner Filter */}
            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setOwnerFilter('all')}
                    className={`btn ${ownerFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                >
                    All
                </button>
                {householdMembers.map(member => (
                    <button
                        key={member.id}
                        onClick={() => setOwnerFilter(member.id)}
                        className={`btn ${ownerFilter === member.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    >
                        {member.avatarEmoji} {member.displayName}
                    </button>
                ))}
            </div>

            {/* Stats Card */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'var(--gradient-primary)' }}>
                <div className="text-muted">Owed to Yourself {ownerFilter !== 'all' && `(${getMember(ownerFilter)?.displayName})`}</div>
                <div className="amount-large">{filteredWithdrawals.length > 0 ? formatAmount(totalOwed, filteredWithdrawals[0]?.currency || 'EUR') : '€0.00'}</div>
                <div className="text-secondary">{filteredWithdrawals.length} withdrawal{filteredWithdrawals.length !== 1 ? 's' : ''} to pay back</div>
            </div>

            {/* Withdrawals List */}
            {filteredWithdrawals.map(withdrawal => {
                const progress = getPaybackProgress(withdrawal);
                const remaining = withdrawal.withdrawnAmount - withdrawal.paidBackAmount;
                const member = getMember(withdrawal.ownerId);
                return (
                    <div key={withdrawal.id} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span className="font-semibold">{withdrawal.description}</span>
                                    {member && (
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-full)',
                                            background: 'var(--color-primary)',
                                            color: 'white'
                                        }}>
                                            {member.avatarEmoji} {member.displayName}
                                        </span>
                                    )}
                                </div>
                                <div className="text-muted text-sm">
                                    {withdrawal.withdrawnAt?.toDate?.()?.toLocaleDateString?.() || 'Unknown date'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="font-semibold">{formatAmount(remaining, withdrawal.currency)}</div>
                                <div className="text-muted text-sm">of {formatAmount(withdrawal.withdrawnAmount, withdrawal.currency)}</div>
                            </div>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
                            <span className="text-muted text-sm">{progress}% paid back</span>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <Link href={`/savings/${withdrawal.id}/pay`} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}>
                                    Pay Back
                                </Link>
                                <button onClick={() => handleDelete(withdrawal.id)} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Empty State */}
            {filteredWithdrawals.length === 0 && (
                <div className="empty-state">
                    <p style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🔄</p>
                    <h3>No withdrawals to pay back</h3>
                    <p className="text-muted">{ownerFilter !== 'all' ? `No withdrawals for ${getMember(ownerFilter)?.displayName}` : 'Record when you borrow from savings'}</p>
                </div>
            )}

            {/* Add Button */}
            <Link href="/savings/add" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-lg)' }}>
                + Record Withdrawal
            </Link>
        </div>
    );
}
