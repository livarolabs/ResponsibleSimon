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
import { Currency, Owner } from './types';

// Types
export interface RecurringBill {
    id: string;
    userId: string;
    name: string;
    amount: number;
    currency: Currency;
    owner: Owner;
    category: string;
    dayOfMonth: number;
    isActive: boolean;
    createdAt: Timestamp;
}

export interface BillPayment {
    id: string;
    billId: string;
    userId: string;
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
    userId: string,
    bill: Omit<RecurringBill, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, 'recurringBills'), {
        ...bill,
        userId,
        createdAt: Timestamp.now()
    });

    // Auto-create payment record for current month
    const monthYear = getCurrentMonthYear();
    await createBillPayment(docRef.id, userId, bill.amount, bill.currency, monthYear);

    return docRef.id;
}

export async function getBills(userId: string): Promise<RecurringBill[]> {
    try {
        const q = query(
            collection(db, 'recurringBills'),
            where('userId', '==', userId),
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
            where('userId', '==', userId)
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
    userId: string,
    amount: number,
    currency: Currency,
    monthYear: string
): Promise<void> {
    const paymentId = `${billId}_${monthYear}`;
    await setDoc(doc(db, 'billPayments', paymentId), {
        billId,
        userId,
        amount,
        currency,
        monthYear,
        isPaid: false,
        paidAt: null
    });
}

export async function getBillPaymentsForMonth(userId: string, monthYear: string): Promise<BillPayment[]> {
    const q = query(
        collection(db, 'billPayments'),
        where('userId', '==', userId),
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
export async function ensureMonthlyPayments(userId: string): Promise<void> {
    const monthYear = getCurrentMonthYear();
    const bills = await getBills(userId);
    const existingPayments = await getBillPaymentsForMonth(userId, monthYear);
    const existingBillIds = new Set(existingPayments.map(p => p.billId));

    for (const bill of bills) {
        if (!existingBillIds.has(bill.id)) {
            await createBillPayment(bill.id, userId, bill.amount, bill.currency, monthYear);
        }
    }
}

// Get bills with payment status for current month
export interface BillWithStatus extends RecurringBill {
    paymentId: string;
    isPaid: boolean;
    paidAt: Timestamp | null;
}

export async function getBillsWithStatus(userId: string, monthYear: string): Promise<BillWithStatus[]> {
    await ensureMonthlyPayments(userId);

    const bills = await getBills(userId);
    const payments = await getBillPaymentsForMonth(userId, monthYear);
    const paymentMap = new Map(payments.map(p => [p.billId, p]));

    return bills.map(bill => {
        const payment = paymentMap.get(bill.id);
        return {
            ...bill,
            paymentId: payment?.id || `${bill.id}_${monthYear}`,
            isPaid: payment?.isPaid || false,
            paidAt: payment?.paidAt || null
        };
    });
}
