'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBill } from '@/lib/bills-service';
import { Currency, CURRENCIES } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function AddBillPage() {
    const { user, household, householdMembers } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [ownerId, setOwnerId] = useState(user?.uid || '');
    const [category, setCategory] = useState('utilities');
    const [dayOfMonth, setDayOfMonth] = useState('1');

    const categories = [
        'utilities', 'internet', 'phone', 'insurance',
        'subscription', 'rent', 'other'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !household) return;

        setLoading(true);
        setError('');

        try {
            await createBill(household.id, ownerId || user.uid, {
                name,
                amount: parseFloat(amount),
                currency,
                category,
                dayOfMonth: parseInt(dayOfMonth),
                isActive: true
            });
            router.push('/bills');
        } catch (err) {
            console.error('Error creating bill:', err);
            setError('Failed to create bill. Please try again.');
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
                <h1 className="page-title">Add Bill</h1>
            </div>

            {error && <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', marginBottom: 'var(--space-md)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Bill Name</label>
                    <input
                        type="text"
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Electric Bill"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Amount</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                            className="input"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Due Day</label>
                        <input
                            type="number"
                            className="input"
                            value={dayOfMonth}
                            onChange={e => setDayOfMonth(e.target.value)}
                            min="1"
                            max="31"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loading}
                    style={{ marginTop: 'var(--space-lg)' }}
                >
                    {loading ? 'Adding...' : 'Add Bill'}
                </button>
            </form>
        </div>
    );
}
