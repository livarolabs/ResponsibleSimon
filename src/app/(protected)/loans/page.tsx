'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getLoans, deleteLoan, Loan } from '@/lib/loans-service';
import { formatAmount } from '@/lib/types';

export default function LoansPage() {
    const { household, householdMembers } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<string | 'all'>('all');

    useEffect(() => {
        loadLoans();
    }, [household]);

    const loadLoans = async () => {
        if (!household) return;
        try {
            const data = await getLoans(household.id);
            setLoans(data);
        } catch (err) {
            console.error('Error loading loans:', err);
            setError('Failed to load loans');
        } finally {
            setLoading(false);
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

    // Get member info
    const getMember = (ownerId: string) => {
        return householdMembers.find(m => m.id === ownerId);
    };

    // Filter by owner
    const filteredLoans = ownerFilter === 'all'
        ? loans
        : loans.filter(l => l.ownerId === ownerFilter);

    const totalOutstanding = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

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
                <div className="text-muted">Total Outstanding {ownerFilter !== 'all' && `(${getMember(ownerFilter)?.displayName})`}</div>
                <div className="amount-large">{filteredLoans.length > 0 ? formatAmount(totalOutstanding, filteredLoans[0]?.currency || 'EUR') : '€0.00'}</div>
                <div className="text-secondary">{filteredLoans.length} active loan{filteredLoans.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Loans List */}
            {filteredLoans.map(loan => {
                const progress = Math.round(((loan.originalAmount - loan.remainingAmount) / loan.originalAmount) * 100);
                const member = getMember(loan.ownerId);
                return (
                    <div key={loan.id} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span className="font-semibold">{loan.name}</span>
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
                                <div className="text-muted text-sm">{loan.lender}</div>

                                {/* Installment & Payoff Info */}
                                {loan.monthlyInstallment && loan.monthlyInstallment > 0 && loan.remainingAmount > 0 && (
                                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                            Monthly: <span style={{ color: 'var(--color-text)' }}>{formatAmount(loan.monthlyInstallment, loan.currency)}</span>
                                        </div>
                                        {(() => {
                                            const monthsLeft = Math.ceil(loan.remainingAmount / loan.monthlyInstallment);
                                            const payoffDate = new Date();
                                            payoffDate.setMonth(payoffDate.getMonth() + monthsLeft);
                                            return (
                                                <div style={{ fontSize: '12px', color: 'var(--color-success)', marginTop: '2px' }}>
                                                    Payoff estimate: {payoffDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                    <span style={{ opacity: 0.7 }}> ({monthsLeft} months)</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="font-semibold">{formatAmount(loan.remainingAmount, loan.currency)}</div>
                                <div className="text-muted text-sm">of {formatAmount(loan.originalAmount, loan.currency)}</div>
                            </div>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
                            <span className="text-muted text-sm">{progress}% paid off</span>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <Link href={`/loans/${loan.id}/pay`} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}>
                                    Make Payment
                                </Link>
                                <button onClick={() => handleDelete(loan.id)} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Empty State */}
            {filteredLoans.length === 0 && (
                <div className="empty-state">
                    <p style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>💳</p>
                    <h3>No active loans {ownerFilter !== 'all' ? `for ${getMember(ownerFilter)?.displayName}` : ''}</h3>
                    <p className="text-muted">Add a loan to start tracking your debt</p>
                </div>
            )}

            {/* Add Button */}
            <Link href="/loans/add" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-lg)' }}>
                + Add Loan
            </Link>
        </div>
    );
}
