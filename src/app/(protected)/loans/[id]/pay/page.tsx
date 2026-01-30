'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getLoans, createLoanPayment, Loan } from '@/lib/loans-service';
import { formatAmount } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';
import { use } from 'react';

export default function LoanPayPage({ params }: { params: { id: string } }) {
    const id = params.id;
    const { household } = useAuth();
    const router = useRouter();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!household) return;
        loadLoan();
    }, [household, id]);

    const loadLoan = async () => {
        try {
            if (!household) return;
            // In a real app we'd have getLoanById, but for now filtering is fine
            const loans = await getLoans(household.id);
            const found = loans.find(l => l.id === id);

            if (found) {
                setLoan(found);
                // Default to monthly installment or remaining amount
                if (found.monthlyInstallment && found.monthlyInstallment > 0) {
                    setAmount(found.monthlyInstallment.toString());
                } else {
                    setAmount(found.remainingAmount.toString());
                }
            } else {
                setError('Loan not found');
            }
        } catch (err) {
            console.error('Error loading loan:', err);
            setError('Failed to load loan details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loan || !household) return;

        setSubmitting(true);
        setError('');

        try {
            await createLoanPayment(
                loan.id,
                household.id,
                parseFloat(amount),
                loan.currency,
                note
            );
            router.push('/loans');
        } catch (err) {
            console.error('Error recording payment:', err);
            setError('Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page"><div className="skeleton" style={{ height: 200 }}></div></div>;
    if (!loan) return <div className="page"><div className="card">Loan not found</div></div>;

    return (
        <div className="page">
            <div className="page-header">
                <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '8px 16px', marginBottom: 'var(--space-sm)' }}>
                    ← Back
                </button>
                <h1 className="page-title">Make Payment</h1>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'var(--gradient-card)' }}>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>For: {loan.name}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatAmount(loan.remainingAmount, loan.currency)}</div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>Remaining Balance</div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Payment Amount</label>
                    <FormattedNumberInput
                        value={amount}
                        onChange={setAmount}
                        placeholder="0.00"
                        required
                    />
                    {loan.monthlyInstallment && loan.monthlyInstallment > 0 && (
                        <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-text-muted)' }}>
                            Monthly Installment: {formatAmount(loan.monthlyInstallment, loan.currency)}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Note (Optional)</label>
                    <input
                        type="text"
                        className="input"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g., January Payment"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={submitting}
                    style={{ marginTop: 'var(--space-lg)' }}
                >
                    {submitting ? 'Recording...' : 'Record Payment'}
                </button>
            </form>
        </div>
    );
}
