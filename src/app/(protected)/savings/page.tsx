'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    getWithdrawals,
    createPayback,
    deleteWithdrawal,
    getPaybackProgress,
    SavingsWithdrawal
} from '@/lib/savings-service';
import { formatAmount, Currency, Owner, OWNERS } from '@/lib/types';

export default function SavingsPage() {
    const { user } = useAuth();
    const [withdrawals, setWithdrawals] = useState<SavingsWithdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<Owner | 'all'>('all');

    // Payback modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<SavingsWithdrawal | null>(null);
    const [paybackAmount, setPaybackAmount] = useState('');

    useEffect(() => {
        loadWithdrawals();
    }, [user]);

    const loadWithdrawals = async () => {
        if (!user) return;
        try {
            const data = await getWithdrawals(user.uid);
            setWithdrawals(data);
        } catch (err) {
            console.error('Error loading withdrawals:', err);
            setError('Failed to load withdrawals');
        } finally {
            setLoading(false);
        }
    };

    const handlePayback = async () => {
        if (!selectedWithdrawal || !user || !paybackAmount) return;
        try {
            await createPayback(
                selectedWithdrawal.id,
                user.uid,
                parseFloat(paybackAmount),
                selectedWithdrawal.currency
            );
            setShowModal(false);
            setPaybackAmount('');
            setSelectedWithdrawal(null);
            await loadWithdrawals();
        } catch (err) {
            console.error('Error making payback:', err);
        }
    };

    const handleDelete = async (withdrawalId: string) => {
        if (!confirm('Delete this withdrawal record?')) return;
        try {
            await deleteWithdrawal(withdrawalId);
            await loadWithdrawals();
        } catch (err) {
            console.error('Error deleting withdrawal:', err);
        }
    };

    const openPaybackModal = (withdrawal: SavingsWithdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setShowModal(true);
    };

    // Filter withdrawals by owner
    const filteredWithdrawals = ownerFilter === 'all'
        ? withdrawals
        : withdrawals.filter(w => w.owner === ownerFilter);

    // Calculate totals by currency (from filtered)
    const totals = filteredWithdrawals.reduce((acc, w) => {
        const owed = w.withdrawnAmount - w.paidBackAmount;
        acc[w.currency] = (acc[w.currency] || 0) + owed;
        return acc;
    }, {} as Record<Currency, number>);

    if (loading) {
        return <div className="page"><div className="skeleton" style={{ height: 200 }}></div></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">🔄 Payback</h1>
                <p className="page-subtitle">Pay yourself back</p>
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
                {OWNERS.map(o => (
                    <button
                        key={o.value}
                        onClick={() => setOwnerFilter(o.value)}
                        className={`btn ${ownerFilter === o.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    >
                        {o.emoji} {o.value}
                    </button>
                ))}
            </div>

            {/* Stats Card */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'var(--gradient-primary)' }}>
                <div className="text-muted">Owed to Yourself {ownerFilter !== 'all' && `(${ownerFilter})`}</div>
                {Object.entries(totals).map(([currency, amount]) => (
                    <div key={currency} className="amount-large">{formatAmount(amount, currency as Currency)}</div>
                ))}
                {Object.keys(totals).length === 0 && <div className="amount-large">€0.00</div>}
                <div className="text-secondary">{filteredWithdrawals.length} active withdrawal{filteredWithdrawals.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Withdrawals List */}
            {filteredWithdrawals.map(withdrawal => {
                const progress = getPaybackProgress(withdrawal);
                const remaining = withdrawal.withdrawnAmount - withdrawal.paidBackAmount;
                return (
                    <div key={withdrawal.id} className="card" style={{ marginBottom: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span className="font-semibold">{withdrawal.description}</span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-full)',
                                        background: withdrawal.owner === 'Simon' ? 'var(--color-primary)' : 'var(--color-secondary)',
                                        color: 'white'
                                    }}>
                                        {withdrawal.owner === 'Simon' ? '👨' : '👩'} {withdrawal.owner}
                                    </span>
                                </div>
                                <div className="text-muted text-sm">
                                    {withdrawal.withdrawnAt.toDate().toLocaleDateString()}
                                </div>
                            </div>
                            <button onClick={() => handleDelete(withdrawal.id)} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                            <span className="text-muted">Still owe yourself</span>
                            <span className="font-semibold">{formatAmount(remaining, withdrawal.currency)}</span>
                        </div>

                        <div className="progress" style={{ marginBottom: 'var(--space-sm)' }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-sm text-muted">{progress}% paid back ({formatAmount(withdrawal.paidBackAmount, withdrawal.currency)} of {formatAmount(withdrawal.withdrawnAmount, withdrawal.currency)})</span>
                            <button onClick={() => openPaybackModal(withdrawal)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}>
                                Pay Back
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Empty State */}
            {filteredWithdrawals.length === 0 && (
                <div className="empty-state">
                    <p style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🔄</p>
                    <h3>No withdrawals to pay back</h3>
                    <p className="text-muted">{ownerFilter !== 'all' ? `No withdrawals for ${ownerFilter}` : 'Record when you borrow from savings'}</p>
                </div>
            )}

            {/* Add Button */}
            <Link href="/savings/add" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-lg)' }}>
                + Record Withdrawal
            </Link>

            {/* Payback Modal */}
            {showModal && selectedWithdrawal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Pay Yourself Back</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            {selectedWithdrawal.description} · {formatAmount(selectedWithdrawal.withdrawnAmount - selectedWithdrawal.paidBackAmount, selectedWithdrawal.currency)} remaining
                        </p>

                        <div className="form-group">
                            <label className="form-label">Payback Amount</label>
                            <input
                                type="number"
                                className="input"
                                value={paybackAmount}
                                onChange={e => setPaybackAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                max={selectedWithdrawal.withdrawnAmount - selectedWithdrawal.paidBackAmount}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handlePayback} className="btn btn-primary" style={{ flex: 1 }}>Confirm Payback</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
