'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getBillsWithStatus, BillWithStatus } from '@/lib/bills-service';
import { getLoans } from '@/lib/loans-service';
import { getSavings } from '@/lib/savings-service';
import { Loan } from '@/lib/loans-service';
import { formatAmount } from '@/lib/types';
import Link from 'next/link';
import { getCurrentMonthYear } from '@/lib/bills-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, PiggyBank, Settings, ArrowRight, Wallet } from 'lucide-react';

export default function DashboardPage() {
    const { user, household } = useAuth();
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState<BillWithStatus[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [savingsTotal, setSavingsTotal] = useState(0);

    useEffect(() => {
        async function loadData() {
            if (!household) return;
            try {
                // Bills
                const monthYear = getCurrentMonthYear();
                const billsData = await getBillsWithStatus(household.id, monthYear);
                setBills(billsData);

                // Loans
                const loansData = await getLoans(household.id);
                setLoans(loansData);

                // Savings
                const savingsData = await getSavings(household.id);
                const totalSaved = savingsData.reduce((acc, s) => acc + s.amount, 0);
                setSavingsTotal(totalSaved);

            } catch (err) {
                console.error("Error loading dashboard data", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [household]);

    const calculateNetWorth = () => {
        let billsDue = 0;
        bills.filter(b => !b.isPaid).forEach(b => {
            if (b.currency === 'EUR') billsDue += b.amount;
        });

        let loansRemaining = 0;
        loans.forEach(l => {
            if (l.currency === 'EUR') loansRemaining += l.remainingAmount;
        });

        return savingsTotal - (billsDue + loansRemaining);
    };

    const netWorth = calculateNetWorth();

    if (loading) {
        return (
            <div className="container max-w-md mx-auto p-6 space-y-8 flex flex-col items-center justify-center min-h-screen">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-4 w-full">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-md mx-auto p-6 pb-24 space-y-8">
            {/* Header */}
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Hi, {user?.displayName?.split(' ')[0] || 'User'}</h1>
                    <p className="text-muted-foreground text-sm">Welcome back</p>
                </div>
                <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback>
                        {user?.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                </Avatar>
            </header>

            {/* Net Worth Hero */}
            <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 border-none text-white shadow-xl">
                <CardContent className="flex flex-col items-center py-8">
                    <span className="text-indigo-100 text-xs font-semibold uppercase tracking-widest mb-2">Net Position (Est.)</span>
                    <span className={`text-4xl font-bold tracking-tighter ${netWorth >= 0 ? 'text-white' : 'text-white'}`}>
                        {formatAmount(netWorth, 'EUR')}
                    </span>
                    <div className="mt-4 flex gap-2">
                        <div className="bg-white/10 px-3 py-1 rounded-full text-xs backdrop-blur-md">
                            {formatAmount(savingsTotal, 'EUR')} Assets
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-full text-xs backdrop-blur-md">
                            {formatAmount(Math.abs(netWorth - savingsTotal), 'EUR')} Liab.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Quick Actions</h3>
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                    <div className="flex w-max space-x-4 p-1">
                        <Link href="/bills/add">
                            <Button variant="outline" className="flex flex-col h-24 w-24 gap-2 rounded-xl border-dashed border-2 hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-500">
                                <Receipt className="h-6 w-6" />
                                <span className="text-xs">Add Bill</span>
                            </Button>
                        </Link>
                        <Link href="/loans/add">
                            <Button variant="outline" className="flex flex-col h-24 w-24 gap-2 rounded-xl border-dashed border-2 hover:border-rose-500 hover:bg-rose-500/5 hover:text-rose-500">
                                <CreditCard className="h-6 w-6" />
                                <span className="text-xs">Add Loan</span>
                            </Button>
                        </Link>
                        <Link href="/savings/add">
                            <Button variant="outline" className="flex flex-col h-24 w-24 gap-2 rounded-xl border-dashed border-2 hover:border-emerald-500 hover:bg-emerald-500/5 hover:text-emerald-500">
                                <PiggyBank className="h-6 w-6" />
                                <span className="text-xs">Add Savings</span>
                            </Button>
                        </Link>
                        <Link href="/settings">
                            <Button variant="outline" className="flex flex-col h-24 w-24 gap-2 rounded-xl border-dashed border-2 hover:border-border hover:bg-muted">
                                <Settings className="h-6 w-6" />
                                <span className="text-xs">Settings</span>
                            </Button>
                        </Link>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Overview Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Overview</h3>

                <Link href="/bills">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold leading-none">Bills</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {bills.filter(b => !b.isPaid).length} unpaid
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">
                                    {formatAmount(bills.reduce((acc, b) => acc + (b.currency === 'EUR' ? b.amount : 0), 0), 'EUR')}
                                </span>
                                <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                                    View <ArrowRight className="h-3 w-3" />
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/loans">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold leading-none">Loans</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {loans.length} active
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block">
                                    {formatAmount(loans.reduce((acc, l) => acc + (l.currency === 'EUR' ? l.remainingAmount : 0), 0), 'EUR')}
                                </span>
                                <span className="text-xs text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                                    View <ArrowRight className="h-3 w-3" />
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <div className="cursor-default">
                    <Card>
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <PiggyBank className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold leading-none">Savings</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total Assets
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block text-emerald-500">
                                    {formatAmount(savingsTotal, 'EUR')}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
