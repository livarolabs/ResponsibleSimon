'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createWithdrawal } from '@/lib/savings-service';
import { Currency, Owner, CURRENCIES, OWNERS, getCurrencySymbol } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function AddWithdrawalPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [owner, setOwner] = useState<Owner>('Simon');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            await createWithdrawal(user.uid, {
                description,
                withdrawnAmount: parseFloat(amount),
                currency,
                owner
            });
            router.push('/savings');
        } catch (err) {
            console.error('Error creating withdrawal:', err);
            setError('Failed to add withdrawal. Please try again.');
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
                <h1 className="page-title">Add Withdrawal</h1>
            </div>

            <div className="card" style={{ background: 'rgba(99, 102, 241, 0.1)', marginBottom: 'var(--space-lg)' }}>
                <p className="text-secondary">💡 Track money you&apos;ve taken from your savings.</p>
                <p className="text-muted">You can pay yourself back in installments over time.</p>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">What was it for?</label>
                    <input
                        type="text"
                        className="input"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g., Emergency expense, Vacation"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Amount Withdrawn ({getCurrencySymbol(currency)})</label>
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
                    <label className="form-label">Who withdrew?</label>
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

                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading}
                    style={{ marginTop: 'var(--space-lg)' }}
                >
                    {loading ? 'Adding...' : 'Add Withdrawal'}
                </button>
            </form>
        </div>
    );
}
