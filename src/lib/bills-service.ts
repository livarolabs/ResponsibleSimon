import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Currency } from './types';

// Types
export interface RecurringBill {
    id: string;
    householdId: string;
    ownerId: string; // User ID of responsible person
    name: string;
    amount: number;
    currency: Currency;
    category: string;
    dayOfMonth: number;
    isActive: boolean;
    createdAt: Timestamp;
}

export interface BillPayment {
    id: string;
    billId: string;
    householdId: string;
    amount: number;
    currency: Currency;
    monthYear: string; // Format: "2024-01"
    isPaid: boolean;
    paidAt: Timestamp | null;
}

// Helper to get current month-year string
export function getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get month name from monthYear string
export function getMonthName(monthYear: string): string {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Bills CRUD Operations
export async function createBill(
    householdId: string,
    ownerId: string,
    bill: Omit<RecurringBill, 'id' | 'householdId' | 'ownerId' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, 'recurringBills'), {
        ...bill,
        householdId,
        ownerId,
        createdAt: Timestamp.now()
    });

    // Auto-create payment record for current month
    const monthYear = getCurrentMonthYear();
    await createBillPayment(docRef.id, householdId, bill.amount, bill.currency, monthYear);

    return docRef.id;
}

export async function getBills(householdId: string): Promise<RecurringBill[]> {
    try {
        const q = query(
            collection(db, 'recurringBills'),
            where('householdId', '==', householdId),
            where('isActive', '==', true),
            orderBy('dayOfMonth', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RecurringBill));
    } catch (error) {
        // Fallback: fetch all and filter client-side
        console.warn('Index not ready, using fallback query:', error);
        const q = query(
            collection(db, 'recurringBills'),
            where('householdId', '==', householdId)
        );
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RecurringBill));
        return all
            .filter(b => b.isActive)
            .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    }
}

export async function updateBill(billId: string, updates: Partial<RecurringBill>): Promise<void> {
    await updateDoc(doc(db, 'recurringBills', billId), updates);
}

export async function deleteBill(billId: string): Promise<void> {
    // Soft delete by setting isActive to false
    await updateDoc(doc(db, 'recurringBills', billId), { isActive: false });
}

// Bill Payments Operations
export async function createBillPayment(
    billId: string,
    householdId: string,
    amount: number,
    currency: Currency,
    monthYear: string
): Promise<void> {
    const paymentId = `${billId}_${monthYear}`;
    await setDoc(doc(db, 'billPayments', paymentId), {
        billId,
        householdId,
        amount,
        currency,
        monthYear,
        isPaid: false,
        paidAt: null
    });
}

export async function getBillPaymentsForMonth(householdId: string, monthYear: string): Promise<BillPayment[]> {
    const q = query(
        collection(db, 'billPayments'),
        where('householdId', '==', householdId),
        where('monthYear', '==', monthYear)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as BillPayment));
}

export async function markBillPaid(paymentId: string, isPaid: boolean): Promise<void> {
    await updateDoc(doc(db, 'billPayments', paymentId), {
        isPaid,
        paidAt: isPaid ? Timestamp.now() : null
    });
}

// Ensure payments exist for current month (call on dashboard load)
export async function ensureMonthlyPayments(householdId: string): Promise<void> {
    const monthYear = getCurrentMonthYear();
    const bills = await getBills(householdId);
    const existingPayments = await getBillPaymentsForMonth(householdId, monthYear);
    const existingBillIds = new Set(existingPayments.map(p => p.billId));

    for (const bill of bills) {
        if (!existingBillIds.has(bill.id)) {
            await createBillPayment(bill.id, householdId, bill.amount, bill.currency, monthYear);
        }
    }
}

import {
    getLoans,
    getLoanPaymentsForMonth,
    Loan
} from './loans-service';

// ... (existing helper functions)

// Get bills with payment status for current month
export interface BillWithStatus extends Omit<RecurringBill, 'createdAt'> {
    type: 'bill' | 'loan';
    paymentId: string;
    isPaid: boolean;
    paidAt: Timestamp | null;
    createdAt?: Timestamp; // Optional because merging loans
}

export async function getBillsWithStatus(householdId: string, monthYear: string): Promise<BillWithStatus[]> {
    await ensureMonthlyPayments(householdId);

    // 1. Fetch Recurring Bills
    const bills = await getBills(householdId);
    const billPayments = await getBillPaymentsForMonth(householdId, monthYear);
    const billPaymentMap = new Map(billPayments.map(p => [p.billId, p]));

    const mappedBills: BillWithStatus[] = bills.map(bill => {
        const payment = billPaymentMap.get(bill.id);
        return {
            ...bill,
            type: 'bill',
            paymentId: payment?.id || `${bill.id}_${monthYear}`,
            isPaid: payment?.isPaid || false,
            paidAt: payment?.paidAt || null
        };
    });

    // 2. Fetch Active Loans with Monthly Installments
    const loans = await getLoans(householdId);
    const loanPayments = await getLoanPaymentsForMonth(householdId, monthYear);
    const loanPaymentMap = new Map(loanPayments.map(p => [p.loanId, p]));

    const mappedLoans: BillWithStatus[] = loans
        .filter(l => (l.monthlyInstallment || 0) > 0)
        .map(loan => {
            const payment = loanPaymentMap.get(loan.id);
            return {
                id: loan.id,
                householdId: loan.householdId,
                ownerId: loan.ownerId,
                name: `${loan.name} (Installment)`,
                amount: loan.monthlyInstallment || 0,
                currency: loan.currency,
                category: 'Loan',
                dayOfMonth: loan.paymentDay || 1, // Default to 1st if not set
                isActive: true,
                type: 'loan',
                paymentId: payment?.id || `loan_${loan.id}_${monthYear}`, // Placeholder, real ID created on payment
                isPaid: !!payment,
                paidAt: payment?.paidAt || null
            };
        });

    // 3. Merge and Sort
    return [...mappedBills, ...mappedLoans]
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}
