'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLoans, deleteLoan, Loan } from '@/lib/loans-service';
import { formatAmount } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Wallet, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoansPage() {
    const { household, householdMembers } = useAuth();
    const router = useRouter();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [ownerFilter, setOwnerFilter] = useState<string | 'all'>('all');

    const loadLoans = useCallback(async () => {
        if (!household) return;
        try {
            const data = await getLoans(household.id);
            setLoans(data);
        } catch (err) {
            console.error('Error loading loans:', err);
        } finally {
            setLoading(false);
        }
    }, [household]);

    useEffect(() => {
        loadLoans();
    }, [loadLoans]);

    const handleDelete = async (loanId: string) => {
        if (!confirm('Delete this loan?')) return;
        try {
            await deleteLoan(loanId);
            loadLoans();
        } catch (err) {
            console.error('Error deleting loan:', err);
        }
    };

    const filteredLoans = ownerFilter === 'all'
        ? loans
        : loans.filter(l => l.ownerId === ownerFilter);

    if (loading) {
        return (
            <div className="container max-w-md mx-auto p-6 space-y-6 flex flex-col items-center justify-center min-h-screen">
                <Skeleton className="w-full h-20 rounded-xl" />
                <Skeleton className="w-full h-40 rounded-xl" />
                <Skeleton className="w-full h-40 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="container max-w-md mx-auto p-6 pb-24 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Personal Loans</h1>
                    <p className="text-muted-foreground font-medium">Track your debt</p>
                </div>
                <Button
                    size="icon"
                    className="rounded-full h-10 w-10 shadow-lg"
                    onClick={() => router.push('/loans/add')}
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

            {/* Loans List */}
            <div className="space-y-4">
                {filteredLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-muted rounded-3xl bg-muted/10">
                        <Wallet className="h-10 w-10 mb-4 opacity-50" />
                        <p>No loans found.</p>
                    </div>
                ) : (
                    filteredLoans.map((loan) => {
                        const progress = ((loan.originalAmount - loan.remainingAmount) / loan.originalAmount) * 100;
                        return (
                            <Card key={loan.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-lg">{loan.name}</h3>
                                            <p className="text-sm text-muted-foreground">{loan.lender}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-xl tracking-tight">
                                                {formatAmount(loan.remainingAmount, loan.currency)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                of {formatAmount(loan.originalAmount, loan.currency)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">{Math.round(progress)}% Paid off</span>
                                            <span className="text-muted-foreground">{loan.monthlyInstallment ? formatAmount(loan.monthlyInstallment, loan.currency) + '/mo' : ''}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                        <div className="flex items-center gap-2">
                                            {loan.interestRate > 0 && (
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {loan.interestRate}% APR
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                            onClick={() => handleDelete(loan.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
