'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    getBillsWithStatus,
    markBillPaid,
    deleteBill,
    getCurrentMonthYear,
    getMonthName,
    BillWithStatus
} from '@/lib/bills-service';
import { formatAmount } from '@/lib/types';

export default function BillsPage() {
    const { household, householdMembers } = useAuth();
    const [bills, setBills] = useState<BillWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<string | 'all'>('all');

    const monthYear = getCurrentMonthYear();

    useEffect(() => {
        loadBills();
    }, [household]);

    const loadBills = async () => {
        if (!household) return;
        try {
            const data = await getBillsWithStatus(household.id, monthYear);
            setBills(data);
        } catch (err) {
            console.error('Error loading bills:', err);
            setError('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePaid = async (bill: BillWithStatus) => {
        try {
            await markBillPaid(bill.paymentId, !bill.isPaid);
            await loadBills();
        } catch (err) {
            console.error('Error updating payment:', err);
        }
    };

    const handleDelete = async (billId: string) => {
        if (!confirm('Delete this recurring bill?')) return;
        try {
            await deleteBill(billId);
            await loadBills();
        } catch (err) {
            console.error('Error deleting bill:', err);
        }
    };

    // Get member info
    const getMember = (ownerId: string) => {
        return householdMembers.find(m => m.id === ownerId);
    };

    // Filter by owner
    const filteredBills = ownerFilter === 'all'
        ? bills
        : bills.filter(b => b.ownerId === ownerFilter);

    const unpaidBills = filteredBills.filter(b => !b.isPaid);
    const paidBills = filteredBills.filter(b => b.isPaid);
    const totalDue = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

    if (loading) {
        return <div className="page"><div className="skeleton" style={{ height: 200 }}></div></div>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">📋 Bills</h1>
                <p className="page-subtitle">{getMonthName(monthYear)}</p>
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
                <div className="text-muted">Remaining to Pay {ownerFilter !== 'all' && `(${getMember(ownerFilter)?.displayName})`}</div>
                <div className="amount-large">{unpaidBills.length > 0 ? formatAmount(totalDue, unpaidBills[0]?.currency || 'EUR') : '€0.00'}</div>
                <div className="text-secondary">{unpaidBills.length} of {filteredBills.length} bills unpaid</div>
            </div>

            {/* Unpaid Bills */}
            {unpaidBills.length > 0 && (
                <>
                    <h3 className="font-semibold" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-error)' }}>
                        Unpaid ({unpaidBills.length})
                    </h3>
                    {unpaidBills.map(bill => {
                        const member = getMember(bill.ownerId);
                        return (
                            <div key={bill.id} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <input
                                        type="checkbox"
                                        checked={bill.isPaid}
                                        onChange={() => handleTogglePaid(bill)}
                                        style={{ width: 24, height: 24, cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span className="font-semibold">{bill.name}</span>
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
                                        <div className="text-muted text-sm">Due day {bill.dayOfMonth} · {bill.category}</div>
                                    </div>
                                    <div className="font-semibold">{formatAmount(bill.amount, bill.currency)}</div>
                                    <button onClick={() => handleDelete(bill.id)} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Paid Bills */}
            {paidBills.length > 0 && (
                <>
                    <h3 className="font-semibold" style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-sm)', color: 'var(--color-success)' }}>
                        ✓ Paid ({paidBills.length})
                    </h3>
                    {paidBills.map(bill => {
                        const member = getMember(bill.ownerId);
                        return (
                            <div key={bill.id} className="card" style={{ marginBottom: 'var(--space-sm)', opacity: 0.7 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <input
                                        type="checkbox"
                                        checked={bill.isPaid}
                                        onChange={() => handleTogglePaid(bill)}
                                        style={{ width: 24, height: 24, cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span className="font-semibold" style={{ textDecoration: 'line-through' }}>{bill.name}</span>
                                            {member && (
                                                <span style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    padding: '2px 6px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: 'var(--color-primary)',
                                                    opacity: 0.7
                                                }}>
                                                    {member.avatarEmoji}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-muted text-sm">{bill.category}</div>
                                    </div>
                                    <div className="text-muted" style={{ textDecoration: 'line-through' }}>{formatAmount(bill.amount, bill.currency)}</div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Empty State */}
            {filteredBills.length === 0 && (
                <div className="empty-state">
                    <p style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>📋</p>
                    <h3>No bills {ownerFilter !== 'all' ? `for ${getMember(ownerFilter)?.displayName}` : 'yet'}</h3>
                    <p className="text-muted">{ownerFilter === 'all' ? 'Add your first recurring bill to get started' : `No bills assigned`}</p>
                </div>
            )}

            {/* Add Button */}
            <Link href="/bills/add" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-lg)' }}>
                + Add Recurring Bill
            </Link>
        </div>
    );
}
