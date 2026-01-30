'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getLoans, createLoanPayment, deleteLoan, Loan } from '@/lib/loans-service';
import { formatAmount, Currency, Owner, OWNERS } from '@/lib/types';

export default function LoansPage() {
    const { user } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<Owner | 'all'>('all');

    // Payment modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');

    useEffect(() => {
        loadLoans();
    }, [user]);

    const loadLoans = async () => {
        if (!user) return;
        try {
            const data = await getLoans(user.uid);
            setLoans(data);
        } catch (err) {
            console.error('Error loading loans:', err);
            setError('Failed to load loans');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedLoan || !user || !paymentAmount) return;
        try {
            await createLoanPayment(
                selectedLoan.id,
                user.uid,
                parseFloat(paymentAmount),
                selectedLoan.currency,
                paymentNote
            );
            setShowModal(false);
            setPaymentAmount('');
            setPaymentNote('');
            setSelectedLoan(null);
            await loadLoans();
        } catch (err) {
            console.error('Error making payment:', err);
        }
    };

    const handleDelete = async (loanId: string) => {
        if (!confirm('Delete this loan?')) return;
        try {
            await deleteLoan(loanId);
            await loadLoans();
        } catch (err) {
            console.error('Error deleting loan:', err);
        }
    };

    const openPaymentModal = (loan: Loan) => {
        setSelectedLoan(loan);
        setShowModal(true);
    };

    // Filter by owner
    const filteredLoans = ownerFilter === 'all'
        ? loans
        : loans.filter(l => l.owner === ownerFilter);

    // Calculate totals by currency (from filtered)
    const totals = filteredLoans.reduce((acc, l) => {
        acc[l.currency] = (acc[l.currency] || 0) + l.remainingAmount;
        return acc;
    }, {} as Record<Currency, number>);

    if (loading) {
        return <div className="page"><div className="skeleton" style={{ height: 200 }}></div></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">💳 Loans</h1>
                <p className="page-subtitle">Track what you owe</p>
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
                <div className="text-muted">Total Outstanding {ownerFilter !== 'all' && `(${ownerFilter})`}</div>
                {Object.entries(totals).map(([currency, amount]) => (
                    <div key={currency} className="amount-large">{formatAmount(amount, currency as Currency)}</div>
                ))}
                {Object.keys(totals).length === 0 && <div className="amount-large">€0.00</div>}
                <div className="text-secondary">{filteredLoans.length} active loan{filteredLoans.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Loans List */}
            {filteredLoans.map(loan => {
                const progress = Math.round(((loan.originalAmount - loan.remainingAmount) / loan.originalAmount) * 100);
                return (
                    <div key={loan.id} className="card" style={{ marginBottom: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span className="font-semibold">{loan.name}</span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-full)',
                                        background: loan.owner === 'Simon' ? 'var(--color-primary)' : 'var(--color-secondary)',
                                        color: 'white'
                                    }}>
                                        {loan.owner === 'Simon' ? '👨' : '👩'} {loan.owner}
                                    </span>
                                </div>
                                <div className="text-muted text-sm">{loan.lender}</div>
                            </div>
                            <button onClick={() => handleDelete(loan.id)} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                            <span className="text-muted">Remaining</span>
                            <span className="font-semibold">{formatAmount(loan.remainingAmount, loan.currency)}</span>
                        </div>

                        <div className="progress" style={{ marginBottom: 'var(--space-sm)' }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-sm text-muted">{progress}% paid ({formatAmount(loan.originalAmount - loan.remainingAmount, loan.currency)} of {formatAmount(loan.originalAmount, loan.currency)})</span>
                            <button onClick={() => openPaymentModal(loan)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}>
                                Make Payment
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Empty State */}
            {filteredLoans.length === 0 && (
                <div className="empty-state">
                    <p style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>💳</p>
                    <h3>No active loans {ownerFilter !== 'all' ? `for ${ownerFilter}` : ''}</h3>
                    <p className="text-muted">{ownerFilter === 'all' ? 'Add a loan to start tracking your payments' : `No loans assigned to ${ownerFilter}`}</p>
                </div>
            )}

            {/* Add Button */}
            <Link href="/loans/add" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-lg)' }}>
                + Add Loan
            </Link>

            {/* Payment Modal */}
            {showModal && selectedLoan && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Make Payment</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            {selectedLoan.name} · {formatAmount(selectedLoan.remainingAmount, selectedLoan.currency)} remaining
                        </p>

                        <div className="form-group">
                            <label className="form-label">Payment Amount</label>
                            <input
                                type="number"
                                className="input"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                max={selectedLoan.remainingAmount}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Note (optional)</label>
                            <input
                                type="text"
                                className="input"
                                value={paymentNote}
                                onChange={e => setPaymentNote(e.target.value)}
                                placeholder="e.g., Monthly payment"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handlePayment} className="btn btn-primary" style={{ flex: 1 }}>Confirm Payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
