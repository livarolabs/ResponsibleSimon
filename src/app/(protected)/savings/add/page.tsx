'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createWithdrawal } from '@/lib/savings-service';
import { Currency, CURRENCIES, getCurrencySymbol } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function AddWithdrawalPage() {
    const { user, household, householdMembers } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [ownerId, setOwnerId] = useState(user?.uid || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !household) return;

        setLoading(true);
        setError('');

        try {
            await createWithdrawal(household.id, ownerId || user.uid, {
                description,
                withdrawnAmount: parseFloat(amount),
                currency
            });
            router.push('/savings');
        } catch (err) {
            console.error('Error creating withdrawal:', err);
            setError('Failed to record withdrawal. Please try again.');
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
                <h1 className="page-title">Record Withdrawal</h1>
                <p className="page-subtitle">Track when you borrow from savings</p>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">What is this for?</label>
                    <input
                        type="text"
                        className="input"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g., Emergency car repair"
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
                        {householdMembers.map(member => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => setOwnerId(member.id)}
                                className={`btn ${ownerId === member.id ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1 }}
                            >
                                {member.avatarEmoji} {member.displayName}
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
                    {loading ? 'Recording...' : 'Record Withdrawal'}
                </button>
            </form>
        </div>
    );
}
