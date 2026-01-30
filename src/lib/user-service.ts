import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
    id: string;
    displayName: string;
    avatarEmoji: string;
    householdId: string | null;
    createdAt: Timestamp;
}

export interface Household {
    id: string;
    name: string;
    members: string[];
    inviteCode: string;
    createdAt: Timestamp;
}

// Generate a random 6-character invite code
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Create a new user profile
export async function createUserProfile(
    userId: string,
    displayName: string,
    avatarEmoji: string
): Promise<UserProfile> {
    const profile: UserProfile = {
        id: userId,
        displayName,
        avatarEmoji,
        householdId: null,
        createdAt: Timestamp.now()
    };

    await setDoc(doc(db, 'userProfiles', userId), profile);
    return profile;
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const docSnap = await getDoc(doc(db, 'userProfiles', userId));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
}

// Update user profile
export async function updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'avatarEmoji'>>
): Promise<void> {
    await updateDoc(doc(db, 'userProfiles', userId), updates);
}

// Create a new household and add the user to it
export async function createHousehold(userId: string, householdName: string): Promise<Household> {
    const inviteCode = generateInviteCode();
    const householdRef = doc(collection(db, 'households'));

    const household: Household = {
        id: householdRef.id,
        name: householdName,
        members: [userId],
        inviteCode,
        createdAt: Timestamp.now()
    };

    await setDoc(householdRef, household);

    // Update user profile with household ID
    await updateDoc(doc(db, 'userProfiles', userId), {
        householdId: householdRef.id
    });

    return household;
}

// Join an existing household via invite code
export async function joinHousehold(userId: string, inviteCode: string): Promise<Household | null> {
    // Find household by invite code
    const q = query(
        collection(db, 'households'),
        where('inviteCode', '==', inviteCode.toUpperCase())
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null; // Invalid code
    }

    const householdDoc = snapshot.docs[0];
    const household = { id: householdDoc.id, ...householdDoc.data() } as Household;

    // Add user to household members
    if (!household.members.includes(userId)) {
        const updatedMembers = [...household.members, userId];
        await updateDoc(doc(db, 'households', household.id), {
            members: updatedMembers
        });
        household.members = updatedMembers;
    }

    // Update user profile with household ID
    await updateDoc(doc(db, 'userProfiles', userId), {
        householdId: household.id
    });

    return household;
}

// Get household by ID
export async function getHousehold(householdId: string): Promise<Household | null> {
    const docSnap = await getDoc(doc(db, 'households', householdId));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Household;
    }
    return null;
}

// Get all members of a household with their profiles
export async function getHouseholdMembers(householdId: string): Promise<UserProfile[]> {
    const household = await getHousehold(householdId);
    if (!household) return [];

    const members: UserProfile[] = [];
    for (const memberId of household.members) {
        const profile = await getUserProfile(memberId);
        if (profile) {
            members.push(profile);
        }
    }

    return members;
}

// Regenerate invite code for a household
export async function regenerateInviteCode(householdId: string): Promise<string> {
    const newCode = generateInviteCode();
    await updateDoc(doc(db, 'households', householdId), {
        inviteCode: newCode
    });
    return newCode;
}
