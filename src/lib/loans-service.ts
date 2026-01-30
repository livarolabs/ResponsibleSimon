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
    createdAt: Timestamp;
}

export interface LoanPayment {
    id: string;
    loanId: string;
    householdId: string;
    amount: number;
    currency: Currency;
    note: string;
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

// Loan Payments Operations
export async function createLoanPayment(
    loanId: string,
    householdId: string,
    amount: number,
    currency: Currency,
    note: string = ''
): Promise<string> {
    // Add payment record
    const docRef = await addDoc(collection(db, 'loanPayments'), {
        loanId,
        householdId,
        amount,
        currency,
        note,
        paidAt: Timestamp.now()
    });

    // Update loan remaining amount
    const loans = await getLoans(householdId);
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
        const newRemaining = Math.max(0, loan.remainingAmount - amount);
        await updateLoan(loanId, { remainingAmount: newRemaining });
    }

    return docRef.id;
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
export async function getTotalLoansOutstanding(householdId: string): Promise<{ EUR: number; HUF: number }> {
    const loans = await getLoans(householdId);
    return {
        EUR: loans.filter(l => l.currency === 'EUR').reduce((sum, l) => sum + l.remainingAmount, 0),
        HUF: loans.filter(l => l.currency === 'HUF').reduce((sum, l) => sum + l.remainingAmount, 0)
    };
}
