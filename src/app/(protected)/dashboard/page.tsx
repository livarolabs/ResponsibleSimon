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

    const formatTotals = (totals: Record<Currency, number>) => {
        const entries = Object.entries(totals).filter(([, v]) => v > 0);
        if (entries.length === 0) return '€0.00';
        return entries.map(([c, v]) => formatAmount(v, c as Currency)).join(' + ');
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
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">💰 {household?.name || 'Dashboard'}</h1>
                    <p className="page-subtitle">Welcome, {userProfile?.displayName || 'friend'}!</p>
                </div>
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '28px',
                        padding: 'var(--space-xs)'
                    }}
                    title="Sign Out"
                >
                    {userProfile?.avatarEmoji || '👋'}
                </button>
            </div>

            {/* Bills Summary */}
            <Link href="/bills">
                <div className="card" style={{ marginBottom: 'var(--space-md)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="text-muted">📋 Bills Due</div>
                            <div className="amount-large">{formatTotals(billTotals)}</div>
                            <div className="text-secondary">{unpaidBills.length} unpaid this month</div>
                        </div>
                        <span style={{ fontSize: '24px' }}>→</span>
                    </div>
                </div>
            </Link>

            {/* Loans Summary */}
            <Link href="/loans">
                <div className="card" style={{ marginBottom: 'var(--space-md)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="text-muted">💳 Loans Outstanding</div>
                            <div className="amount-large">{formatTotals(loanTotals)}</div>
                            <div className="text-secondary">{loans.length} active loan{loans.length !== 1 ? 's' : ''}</div>
                        </div>
                        <span style={{ fontSize: '24px' }}>→</span>
                    </div>
                </div>
            </Link>

            {/* Payback Summary */}
            <Link href="/savings">
                <div className="card" style={{ marginBottom: 'var(--space-lg)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="text-muted">🔄 Owe Yourself</div>
                            <div className="amount-large">{formatTotals(savingsTotals)}</div>
                            <div className="text-secondary">{withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''} to pay back</div>
                        </div>
                        <span style={{ fontSize: '24px' }}>→</span>
                    </div>
                </div>
            </Link>

            {/* Quick Actions */}
            <h3 className="font-semibold" style={{ marginBottom: 'var(--space-sm)' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                <Link href="/bills/add" className="btn btn-secondary" style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                    📋 Add Bill
                </Link>
                <Link href="/loans/add" className="btn btn-secondary" style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                    💳 Add Loan
                </Link>
                <Link href="/savings/add" className="btn btn-secondary" style={{ textAlign: 'center', padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                    🔄 Withdraw
                </Link>
            </div>

            {/* Household Members */}
            <div className="card" style={{ marginTop: 'var(--space-lg)', background: 'rgba(99, 102, 241, 0.1)' }}>
                <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>Household Members:</div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    {householdMembers.map(member => (
                        <span key={member.id}>{member.avatarEmoji} {member.displayName}</span>
                    ))}
                </div>
                {household && (
                    <div className="text-muted text-sm" style={{ marginTop: 'var(--space-sm)' }}>
                        Invite Code: <strong>{household.inviteCode}</strong>
                    </div>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold" style={{ marginBottom: 'var(--space-md)' }}>Sign Out?</h3>
                        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                            Are you sure you want to sign out?
                        </p>
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
