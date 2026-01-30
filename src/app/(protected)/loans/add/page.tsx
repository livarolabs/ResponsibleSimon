'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createLoan } from '@/lib/loans-service';
import { Currency, Owner, CURRENCIES, OWNERS } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function AddLoanPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [lender, setLender] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [owner, setOwner] = useState<Owner>('Simon');
    const [interestRate, setInterestRate] = useState('0');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            await createLoan(user.uid, {
                name,
                lender,
                originalAmount: parseFloat(amount),
                remainingAmount: parseFloat(amount),
                currency,
                owner,
                interestRate: parseFloat(interestRate)
            });
            router.push('/loans');
        } catch (err) {
            console.error('Error creating loan:', err);
            setError('Failed to create loan. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '8px 16px', marginBottom: 'var(--space-sm)' }}>
                    ← Back
                </button>
                <h1 className="page-title">Add Loan</h1>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Loan Name</label>
                    <input
                        type="text"
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Car Loan"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Lender</label>
                    <input
                        type="text"
                        className="input"
                        value={lender}
                        onChange={e => setLender(e.target.value)}
                        placeholder="e.g., Bank Name or Person"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Loan Amount</label>
                        <FormattedNumberInput
                            value={amount}
                            onChange={setAmount}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Currency</label>
                        <select
                            className="input"
                            value={currency}
                            onChange={e => setCurrency(e.target.value as Currency)}
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Responsible</label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        {OWNERS.map(o => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => setOwner(o.value)}
                                className={`btn ${owner === o.value ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1 }}
                            >
                                {o.emoji} {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Interest Rate (%)</label>
                    <input
                        type="number"
                        className="input"
                        value={interestRate}
                        onChange={e => setInterestRate(e.target.value)}
                        placeholder="0"
                        step="0.1"
                        min="0"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading}
                    style={{ marginTop: 'var(--space-lg)' }}
                >
                    {loading ? 'Adding...' : 'Add Loan'}
                </button>
            </form>
        </div>
    );
}
