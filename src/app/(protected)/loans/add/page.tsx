'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createLoan } from '@/lib/loans-service';
import { CURRENCIES, Currency } from '@/lib/types';
import FormattedNumberInput from '@/components/FormattedNumberInput';

export default function AddLoanPage() {
    const { user, household, householdMembers } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [lender, setLender] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [interestRate, setInterestRate] = useState('');
    const [monthlyInstallment, setMonthlyInstallment] = useState('');
    const [paymentDay, setPaymentDay] = useState('1');
    const [ownerId, setOwnerId] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !household) return;

        if (!name || !lender || !amount) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await createLoan(household.id, ownerId || user.uid, {
                name,
                lender,
                originalAmount: parseFloat(amount),
                remainingAmount: parseFloat(amount),
                currency,
                interestRate: interestRate ? parseFloat(interestRate) : 0,
                monthlyInstallment: monthlyInstallment ? parseFloat(monthlyInstallment) : 0,
                paymentDay: monthlyInstallment ? parseInt(paymentDay) : undefined
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
                <button
                    onClick={() => router.back()}
                    className="btn btn-secondary btn-sm mb-4"
                >
                    ← Back
                </button>
                <h1 className="page-title">Add Loan</h1>
                <p className="page-subtitle">Track a new debt</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Loan Name</label>
                        <input
                            type="text"
                            className="input w-full"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Car Loan"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Lender</label>
                        <input
                            type="text"
                            className="input w-full"
                            value={lender}
                            onChange={e => setLender(e.target.value)}
                            placeholder="e.g., Chase Bank"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Amount</label>
                            <FormattedNumberInput
                                value={amount}
                                onChange={setAmount}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Currency</label>
                            <select
                                className="input w-full"
                                value={currency}
                                onChange={e => setCurrency(e.target.value as Currency)}
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.symbol} {c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Interest Rate (%)</label>
                            <input
                                type="number"
                                className="input w-full"
                                value={interestRate}
                                onChange={e => setInterestRate(e.target.value)}
                                placeholder="0"
                                step="0.1"
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Monthly Payment</label>
                            <FormattedNumberInput
                                value={monthlyInstallment}
                                onChange={setMonthlyInstallment}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    {monthlyInstallment && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Payment Day (1-31)</label>
                            <input
                                type="number"
                                className="input w-full"
                                value={paymentDay}
                                onChange={e => setPaymentDay(e.target.value)}
                                min="1"
                                max="31"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider px-1">Responsible Person</label>
                    <div className="grid grid-cols-2 gap-3">
                        {householdMembers.map(member => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => setOwnerId(member.id)}
                                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${ownerId === member.id
                                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                        : 'bg-zinc-800 border-white/5 hover:bg-zinc-700'
                                    }`}
                            >
                                <span className="text-xl">{member.avatarEmoji}</span>
                                <span className="text-sm font-medium">{member.displayName.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-indigo-500/20 mt-8"
                    disabled={loading}
                >
                    {loading ? 'Creating Loan...' : 'Create Loan'}
                </button>

                <div className="h-24"></div>
            </form>
        </div>
    );
}
