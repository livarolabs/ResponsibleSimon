'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getBillsWithStatus,
    markBillPaid,
    deleteBill,
    getCurrentMonthYear,
    getMonthName,
    BillWithStatus
} from '@/lib/bills-service';
import { createLoanPayment } from '@/lib/loans-service';
import { formatAmount } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Check, Trash2, Receipt, Calendar, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BillsPage() {
    const { household, householdMembers } = useAuth();
    const router = useRouter();
    const [bills, setBills] = useState<BillWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [ownerFilter, setOwnerFilter] = useState<string | 'all'>('all');

    const monthYear = getCurrentMonthYear();

    const loadBills = useCallback(async () => {
        if (!household) return;
        try {
            const data = await getBillsWithStatus(household.id, monthYear);
            setBills(data);
        } catch (err) {
            console.error('Error loading bills:', err);
        } finally {
            setLoading(false);
        }
    }, [household, monthYear]);

    useEffect(() => {
        loadBills();
    }, [loadBills]);

    const handleTogglePaid = async (bill: BillWithStatus) => {
        try {
            if (bill.type === 'loan') {
                if (bill.isPaid) {
                    alert('Loan payments cannot be undone from here yet.');
                    return;
                }
                const confirmPayment = confirm(`Mark this loan installment of ${formatAmount(bill.amount, bill.currency)} as paid?`);
                if (!confirmPayment) return;

                await createLoanPayment(bill.id, household!.id, bill.amount, bill.currency, 'Monthly Installment', monthYear);
            } else {
                await markBillPaid(bill.paymentId, !bill.isPaid);
            }
            loadBills();
        } catch (err) {
            console.error('Error updating payment:', err);
        }
    };

    const handleDelete = async (billId: string) => {
        if (!confirm('Delete this recurring bill?')) return;
        try {
            await deleteBill(billId);
            loadBills();
        } catch (err) {
            console.error('Error deleting bill:', err);
        }
    };

    // Filter
    const filteredBills = ownerFilter === 'all'
        ? bills
        : bills.filter(b => b.ownerId === ownerFilter);

    // Calculate Totals
    const totalDueByCurrency: Record<string, number> = {};
    const paidByCurrency: Record<string, number> = {};

    filteredBills.forEach(b => {
        if (!totalDueByCurrency[b.currency]) {
            totalDueByCurrency[b.currency] = 0;
            paidByCurrency[b.currency] = 0;
        }
        totalDueByCurrency[b.currency] += b.amount;
        if (b.isPaid) {
            paidByCurrency[b.currency] += b.amount;
        }
    });

    // Helper for rendering the main currency total (default EUR)
    const renderTotalCard = () => {
        const primaryCurrency = 'EUR';
        const total = totalDueByCurrency[primaryCurrency] || 0;
        const paid = paidByCurrency[primaryCurrency] || 0;
        const remaining = total - paid;
        const progress = total > 0 ? (paid / total) * 100 : 0;

        return (
            <Card className="mb-8 relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                {/* Decorative Elements */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>

                <CardContent className="relative z-10 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-indigo-100 text-xs font-semibold tracking-widest uppercase">Remaining to Pay</div>
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                            <Receipt className="h-5 w-5 text-white" />
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-bold tracking-tight">{formatAmount(remaining, primaryCurrency)}</span>
                        <span className="text-indigo-200 text-sm font-medium">/ {formatAmount(total, primaryCurrency)}</span>
                    </div>

                    <div className="space-y-2">
                        <Progress value={progress} className="h-2 bg-black/20" indicatorClassName="bg-white" />
                        <div className="flex justify-between text-xs text-indigo-100 font-medium">
                            <span>{Math.round(progress)}% Paid</span>
                            <span>{formatAmount(paid, primaryCurrency)} Paid</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="container max-w-md mx-auto p-6 space-y-6 flex flex-col items-center justify-center min-h-screen">
                <Skeleton className="w-full h-48 rounded-2xl" />
                <div className="space-y-4 w-full">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-md mx-auto p-6 pb-24 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
                    <p className="text-muted-foreground font-medium">{getMonthName(monthYear)}</p>
                </div>
                <Button
                    size="icon"
                    className="rounded-full h-10 w-10 shadow-lg"
                    onClick={() => router.push('/bills/add')}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </header>

            {/* Filter Pills */}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                    <Button
                        variant={ownerFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => setOwnerFilter('all')}
                    >
                        All
                    </Button>
                    {householdMembers.map(m => (
                        <Button
                            key={m.id}
                            variant={ownerFilter === m.id ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full px-4 flex items-center gap-1"
                            onClick={() => setOwnerFilter(m.id)}
                        >
                            <User className="h-3 w-3" />
                            {m.displayName.split(' ')[0]}
                        </Button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            {renderTotalCard()}

            {/* Bills List */}
            <div className="space-y-3">
                {filteredBills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-muted rounded-3xl bg-muted/10">
                        <Receipt className="h-10 w-10 mb-4 opacity-50" />
                        <p>No bills found for this month.</p>
                    </div>
                ) : (
                    filteredBills.map((bill) => (
                        <Card
                            key={bill.id + (bill.paymentId || '')}
                            className={cn(
                                "transition-all duration-200 border-border/50 shadow-sm hover:shadow-md",
                                bill.isPaid ? "opacity-60 bg-muted/30" : "bg-card hover:border-primary/50"
                            )}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                {/* Checkbox / Action */}
                                <button
                                    onClick={() => handleTogglePaid(bill)}
                                    className={cn(
                                        "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                        bill.isPaid
                                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                            : "bg-background border-muted-foreground/30 text-transparent hover:border-primary"
                                    )}
                                >
                                    <Check className={cn("h-6 w-6 transition-transform", bill.isPaid ? "scale-100" : "scale-0")} strokeWidth={3} />
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={cn("font-semibold text-lg truncate pr-2", bill.isPaid && "line-through text-muted-foreground")}>
                                            {bill.name}
                                        </h3>
                                        <span className={cn("font-bold whitespace-nowrap tracking-tight", bill.isPaid ? "text-muted-foreground" : "text-foreground")}>
                                            {formatAmount(bill.amount, bill.currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {bill.dayOfMonth && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium text-muted-foreground bg-muted">
                                                    Due {bill.dayOfMonth}
                                                </Badge>
                                            )}
                                            {bill.type === 'loan' && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-medium border-rose-500/30 text-rose-500 bg-rose-500/5">
                                                    Loan
                                                </Badge>
                                            )}
                                        </div>

                                        {!bill.isPaid && bill.type !== 'loan' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(bill.id); }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
