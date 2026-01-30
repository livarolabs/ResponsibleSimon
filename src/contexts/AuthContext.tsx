'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    signInWithPopup,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import {
    UserProfile,
    Household,
    getUserProfile,
    getHousehold,
    getHouseholdMembers
} from '@/lib/user-service';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    household: Household | null;
    householdMembers: UserProfile[];
    loading: boolean;
    profileLoading: boolean;
    needsOnboarding: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [household, setHousehold] = useState<Household | null>(null);
    const [householdMembers, setHouseholdMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    // Load user profile and household when auth changes
    const loadUserData = async (firebaseUser: User | null) => {
        if (!firebaseUser) {
            setUserProfile(null);
            setHousehold(null);
            setHouseholdMembers([]);
            setNeedsOnboarding(false);
            setProfileLoading(false);
            return;
        }

        setProfileLoading(true);

        try {
            const profile = await getUserProfile(firebaseUser.uid);
            setUserProfile(profile);

            if (!profile || !profile.householdId) {
                setNeedsOnboarding(true);
                setHousehold(null);
                setHouseholdMembers([]);
            } else {
                setNeedsOnboarding(false);
                const hh = await getHousehold(profile.householdId);
                setHousehold(hh);

                if (hh) {
                    const members = await getHouseholdMembers(hh.id);
                    setHouseholdMembers(members);
                }
            }
        } catch (err) {
            console.error('Error loading user data:', err);
            setNeedsOnboarding(true);
        } finally {
            setProfileLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await loadUserData(user);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            await loadUserData(firebaseUser);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, displayName: string) => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName });
    };

    const signInWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            household,
            householdMembers,
            loading,
            profileLoading,
            needsOnboarding,
            signIn,
            signUp,
            signInWithGoogle,
            signOut,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
