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
import { Currency, Owner } from './types';

// Types
export interface SavingsWithdrawal {
    id: string;
    userId: string;
    description: string;
    withdrawnAmount: number;
    paidBackAmount: number;
    currency: Currency;
    owner: Owner;
    isFullyPaidBack: boolean;
    withdrawnAt: Timestamp;
}

export interface SavingsPayback {
    id: string;
    withdrawalId: string;
    userId: string;
    amount: number;
    currency: Currency;
    paidAt: Timestamp;
}

// Savings Withdrawals CRUD Operations
export async function createWithdrawal(
    userId: string,
    withdrawal: Omit<SavingsWithdrawal, 'id' | 'userId' | 'paidBackAmount' | 'isFullyPaidBack' | 'withdrawnAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, 'savingsWithdrawals'), {
        ...withdrawal,
        userId,
        paidBackAmount: 0,
        isFullyPaidBack: false,
        withdrawnAt: Timestamp.now()
    });
    return docRef.id;
}

export async function getWithdrawals(userId: string): Promise<SavingsWithdrawal[]> {
    try {
        // Try compound query (requires index)
        const q = query(
            collection(db, 'savingsWithdrawals'),
            where('userId', '==', userId),
            where('isFullyPaidBack', '==', false),
            orderBy('withdrawnAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SavingsWithdrawal));
    } catch (error) {
        // Fallback: fetch all and filter client-side (for when index is building)
        console.warn('Index not ready, using fallback query:', error);
        const q = query(
            collection(db, 'savingsWithdrawals'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SavingsWithdrawal));
        return all
            .filter(w => !w.isFullyPaidBack)
            .sort((a, b) => b.withdrawnAt.toMillis() - a.withdrawnAt.toMillis());
    }
}

export async function getAllWithdrawals(userId: string): Promise<SavingsWithdrawal[]> {
    const q = query(
        collection(db, 'savingsWithdrawals'),
        where('userId', '==', userId),
        orderBy('withdrawnAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as SavingsWithdrawal));
}

export async function updateWithdrawal(withdrawalId: string, updates: Partial<SavingsWithdrawal>): Promise<void> {
    await updateDoc(doc(db, 'savingsWithdrawals', withdrawalId), updates);
}

export async function deleteWithdrawal(withdrawalId: string): Promise<void> {
    await deleteDoc(doc(db, 'savingsWithdrawals', withdrawalId));
}

// Payback Operations
export async function createPayback(
    withdrawalId: string,
    userId: string,
    amount: number,
    currency: Currency
): Promise<string> {
    // Add payback record
    const docRef = await addDoc(collection(db, 'savingsPaybacks'), {
        withdrawalId,
        userId,
        amount,
        currency,
        paidAt: Timestamp.now()
    });

    // Update withdrawal paid back amount
    const withdrawals = await getAllWithdrawals(userId);
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    if (withdrawal) {
        const newPaidBack = withdrawal.paidBackAmount + amount;
        const isFullyPaidBack = newPaidBack >= withdrawal.withdrawnAmount;
        await updateWithdrawal(withdrawalId, {
            paidBackAmount: newPaidBack,
            isFullyPaidBack
        });
    }

    return docRef.id;
}

export async function getPaybacks(withdrawalId: string): Promise<SavingsPayback[]> {
    const q = query(
        collection(db, 'savingsPaybacks'),
        where('withdrawalId', '==', withdrawalId),
        orderBy('paidAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as SavingsPayback));
}

// Calculate total owed to self by currency
export async function getTotalOwedToSelf(userId: string): Promise<{ EUR: number; HUF: number }> {
    const withdrawals = await getWithdrawals(userId);
    return {
        EUR: withdrawals
            .filter(w => w.currency === 'EUR')
            .reduce((sum, w) => sum + (w.withdrawnAmount - w.paidBackAmount), 0),
        HUF: withdrawals
            .filter(w => w.currency === 'HUF')
            .reduce((sum, w) => sum + (w.withdrawnAmount - w.paidBackAmount), 0)
    };
}

// Get withdrawal progress percentage
export function getPaybackProgress(withdrawal: SavingsWithdrawal): number {
    if (withdrawal.withdrawnAmount === 0) return 100;
    return Math.round((withdrawal.paidBackAmount / withdrawal.withdrawnAmount) * 100);
}
