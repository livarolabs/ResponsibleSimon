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
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Currency } from './types';

// Types
export interface Loan {
    id: string;
    householdId: string;
    ownerId: string;
    name: string;
    lender: string;
    originalAmount: number;
    remainingAmount: number;
    currency: Currency;
    interestRate: number;
    monthlyInstallment?: number;
    paymentDay?: number; // Day of month when installment is due
    createdAt: Timestamp;
}

export interface LoanPayment {
    id: string;
    loanId: string;
    householdId: string;
    amount: number;
    currency: Currency;
    note: string;
    monthYear?: string; // Format: "2024-01" to track monthly installments
    paidAt: Timestamp;
}

// Loans CRUD Operations
export async function createLoan(
    householdId: string,
    ownerId: string,
    loan: Omit<Loan, 'id' | 'householdId' | 'ownerId' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, 'loans'), {
        ...loan,
        householdId,
        ownerId,
        createdAt: Timestamp.now()
    });
    return docRef.id;
}

export async function createLoanPayment(
    loanId: string,
    householdId: string,
    amount: number,
    currency: Currency,
    note: string = 'Monthly Installment',
    monthYear?: string
): Promise<void> {
    // 1. Create payment record
    await addDoc(collection(db, 'loanPayments'), {
        loanId,
        householdId,
        amount,
        currency,
        note,
        monthYear,
        paidAt: Timestamp.now()
    });

    // 2. Update loan remaining amount
    const loanRef = doc(db, 'loans', loanId);
    const loanDoc = await getDocs(query(collection(db, 'loans'), where('__name__', '==', loanId)));

    if (!loanDoc.empty) {
        const loanData = loanDoc.docs[0].data() as Loan;
        const newRemaining = Math.max(0, loanData.remainingAmount - amount);
        await updateDoc(loanRef, { remainingAmount: newRemaining });
    }
}

export async function getLoanPaymentsForMonth(householdId: string, monthYear: string): Promise<LoanPayment[]> {
    const q = query(
        collection(db, 'loanPayments'),
        where('householdId', '==', householdId),
        where('monthYear', '==', monthYear)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as LoanPayment));
}

export async function getLoans(householdId: string): Promise<Loan[]> {
    try {
        const q = query(
            collection(db, 'loans'),
            where('householdId', '==', householdId),
            where('remainingAmount', '>', 0),
            orderBy('remainingAmount', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Loan));
    } catch (error) {
        // Fallback: fetch all and filter client-side
        console.warn('Index not ready, using fallback query:', error);
        const q = query(
            collection(db, 'loans'),
            where('householdId', '==', householdId)
        );
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Loan));
        return all
            .filter(l => l.remainingAmount > 0)
            .sort((a, b) => b.remainingAmount - a.remainingAmount);
    }
}

export async function getAllLoans(householdId: string): Promise<Loan[]> {
    const q = query(
        collection(db, 'loans'),
        where('householdId', '==', householdId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Loan));
}

export async function updateLoan(loanId: string, updates: Partial<Loan>): Promise<void> {
    await updateDoc(doc(db, 'loans', loanId), updates);
}

export async function deleteLoan(loanId: string): Promise<void> {
    await deleteDoc(doc(db, 'loans', loanId));
}

export async function getLoanPayments(loanId: string): Promise<LoanPayment[]> {
    const q = query(
        collection(db, 'loanPayments'),
        where('loanId', '==', loanId),
        orderBy('paidAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as LoanPayment));
}

// Calculate total outstanding loans by currency
export async function getTotalLoansOutstanding(householdId: string): Promise<{ EUR: number; HUF: number; PLN: number }> {
    const loans = await getLoans(householdId);
    return {
        EUR: loans.filter(l => l.currency === 'EUR').reduce((sum, l) => sum + l.remainingAmount, 0),
        HUF: loans.filter(l => l.currency === 'HUF').reduce((sum, l) => sum + l.remainingAmount, 0),
        PLN: loans.filter(l => l.currency === 'PLN').reduce((sum, l) => sum + l.remainingAmount, 0)
    };
}
