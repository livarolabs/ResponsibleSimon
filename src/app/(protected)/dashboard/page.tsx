'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBillsWithStatus, getCurrentMonthYear, BillWithStatus } from '@/lib/bills-service';
import { getLoans, Loan } from '@/lib/loans-service';
import { getWithdrawals, SavingsWithdrawal } from '@/lib/savings-service';
import { formatAmount, Currency } from '@/lib/types';

export default function DashboardPage() {
    const { user, userProfile, household, householdMembers, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState<BillWithStatus[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [withdrawals, setWithdrawals] = useState<SavingsWithdrawal[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        loadData();
    }, [household]);

    const loadData = async () => {
        if (!household) return;
        try {
            const [billsData, loansData, withdrawalsData] = await Promise.all([
                getBillsWithStatus(household.id, getCurrentMonthYear()),
                getLoans(household.id),
                getWithdrawals(household.id)
            ]);
            setBills(billsData);
            setLoans(loansData);
            setWithdrawals(withdrawalsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (err) {
            console.error('Error signing out:', err);
        }
    };

    // Helper to get member name by ID
    const getMemberName = (ownerId: string): string => {
        const member = householdMembers.find(m => m.id === ownerId);
        return member?.displayName || 'Unknown';
    };

    // Calculate stats
    const unpaidBills = bills.filter(b => !b.isPaid);
    const billTotals = unpaidBills.reduce((acc, b) => {
        acc[b.currency] = (acc[b.currency] || 0) + b.amount;
        return acc;
    }, {} as Record<Currency, number>);

    const loanTotals = loans.reduce((acc, l) => {
        acc[l.currency] = (acc[l.currency] || 0) + l.remainingAmount;
        return acc;
    }, {} as Record<Currency, number>);

    const savingsTotals = withdrawals.reduce((acc, w) => {
        const owed = w.withdrawnAmount - w.paidBackAmount;
        acc[w.currency] = (acc[w.currency] || 0) + owed;
        return acc;
    }, {} as Record<Currency, number>);

    const renderTotals = (totals: Record<Currency, number>) => {
        const order: Currency[] = ['EUR', 'HUF', 'PLN'];
        const entries = order
            .map(c => ({ currency: c, value: totals[c] || 0 }))
            .filter(e => e.value > 0);

        if (entries.length === 0) return '€0.00';

        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {entries.map(e => (
                    <div key={e.currency} style={{ lineHeight: '1.1' }}>
                        {formatAmount(e.value, e.currency)}
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="page">
                <div className="skeleton" style={{ height: 100, marginBottom: 'var(--space-md)' }}></div>
                <div className="skeleton" style={{ height: 100, marginBottom: 'var(--space-md)' }}></div>
                <div className="skeleton" style={{ height: 100 }}></div>
            </div>
        );
    }

    return (
        <div className="page" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', paddingBottom: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '24px' }}>💰</span>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>{household?.name || 'Dashboard'}</h1>
                        <p className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>Welcome, {userProfile?.displayName}!</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    style={{ fontSize: '24px', padding: '4px', cursor: 'pointer' }}
                >
                    {userProfile?.avatarEmoji || '👋'}
                </button>
            </div>

            {/* Main Content - Flex Grow to fill space */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minHeight: 0, paddingBottom: 'calc(72px + var(--space-lg) + var(--space-md))' }}>

                {/* Stats Cards - Share space equally */}
                <Link href="/bills" style={{ flex: 1, minHeight: 0 }}>
                    <div className="card" style={{ height: '100%', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
                            <div className="text-muted text-sm">Bills Due</div>
                            <span style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>➔</span>
                        </div>
                        <div className="font-bold" style={{ fontSize: '32px', marginBottom: '2px' }}>{renderTotals(billTotals)}</div>
                        <div className="text-secondary" style={{ fontSize: '14px' }}>{unpaidBills.length} unpaid</div>

                        {/* Inline Action */}
                        <object style={{ position: 'absolute', bottom: 'var(--space-md)', right: 'var(--space-md)' }}>
                            <Link href="/bills/add" className="btn btn-secondary" style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '18px' }}>+</Link>
                        </object>
                    </div>
                </Link>

                <Link href="/loans" style={{ flex: 1, minHeight: 0 }}>
                    <div className="card" style={{ height: '100%', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
                            <div className="text-muted text-sm">Loans Outstanding</div>
                            <span style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>➔</span>
                        </div>
                        <div className="font-bold" style={{ fontSize: '32px', marginBottom: '2px' }}>{renderTotals(loanTotals)}</div>
                        <div className="text-secondary" style={{ fontSize: '14px' }}>{loans.length} active</div>

                        <object style={{ position: 'absolute', bottom: 'var(--space-md)', right: 'var(--space-md)' }}>
                            <Link href="/loans/add" className="btn btn-secondary" style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '18px' }}>+</Link>
                        </object>
                    </div>
                </Link>

                <Link href="/savings" style={{ flex: 1, minHeight: 0 }}>
                    <div className="card" style={{ height: '100%', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
                            <div className="text-muted text-sm">Owe Yourself</div>
                            <span style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>➔</span>
                        </div>
                        <div className="font-bold" style={{ fontSize: '32px', marginBottom: '2px' }}>{renderTotals(savingsTotals)}</div>
                        <div className="text-secondary" style={{ fontSize: '14px' }}>{withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''}</div>

                        <object style={{ position: 'absolute', bottom: 'var(--space-md)', right: 'var(--space-md)' }}>
                            <Link href="/savings/add" className="btn btn-secondary" style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '18px' }}>+</Link>
                        </object>
                    </div>
                </Link>

                {/* Household - Compact & Bottom Aligned */}
                <div style={{ marginTop: 'auto', flexShrink: 0 }}>
                    <div className="card" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', padding: 'var(--space-sm) var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="text-muted text-sm">Household:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {householdMembers.map(member => (
                                    <span key={member.id} style={{ fontSize: '16px' }}>{member.avatarEmoji}</span>
                                ))}
                            </div>
                        </div>
                        <Link href="/settings" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>Manage</Link>
                    </div>
                </div>

            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px', padding: 'var(--space-lg)' }}>
                        <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Sign Out?</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button onClick={() => setShowLogoutConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleLogout} className="btn btn-primary" style={{ flex: 1, background: 'var(--color-error)' }}>Sign Out</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
