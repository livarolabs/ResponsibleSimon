import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
    id: string;
    email?: string;
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

export interface HouseholdInvite {
    id: string;
    householdId: string;
    householdName: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar: string;
    toUserId: string;
    status: 'pending' | 'accepted' | 'declined';
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
    avatarEmoji: string,
    email?: string
): Promise<UserProfile> {
    const profile: UserProfile = {
        id: userId,
        email: email || undefined,
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
    updates: Partial<Pick<UserProfile, 'displayName' | 'avatarEmoji' | 'email'>>
): Promise<void> {
    await updateDoc(doc(db, 'userProfiles', userId), updates);
}

// Search for a user by exact email match
export async function searchUserByEmail(email: string): Promise<UserProfile | null> {
    const q = query(
        collection(db, 'userProfiles'),
        where('email', '==', email.toLowerCase().trim())
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserProfile;
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

// Send a household invite to another user
export async function sendHouseholdInvite(
    fromUser: UserProfile,
    household: Household,
    toUserId: string
): Promise<HouseholdInvite> {
    const inviteRef = doc(collection(db, 'householdInvites'));

    const invite: HouseholdInvite = {
        id: inviteRef.id,
        householdId: household.id,
        householdName: household.name,
        fromUserId: fromUser.id,
        fromUserName: fromUser.displayName,
        fromUserAvatar: fromUser.avatarEmoji,
        toUserId,
        status: 'pending',
        createdAt: Timestamp.now()
    };

    await setDoc(inviteRef, invite);
    return invite;
}

// Get pending invites for a user
export async function getPendingInvites(userId: string): Promise<HouseholdInvite[]> {
    const q = query(
        collection(db, 'householdInvites'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HouseholdInvite);
}

// Accept a household invite
export async function acceptInvite(invite: HouseholdInvite): Promise<void> {
    // Update invite status
    await updateDoc(doc(db, 'householdInvites', invite.id), {
        status: 'accepted'
    });

    // Get the household
    const household = await getHousehold(invite.householdId);
    if (!household) throw new Error('Household not found');

    // Add user to household members
    if (!household.members.includes(invite.toUserId)) {
        await updateDoc(doc(db, 'households', household.id), {
            members: [...household.members, invite.toUserId]
        });
    }

    // Update user profile with household ID
    await updateDoc(doc(db, 'userProfiles', invite.toUserId), {
        householdId: household.id
    });
}

// Decline a household invite
export async function declineInvite(inviteId: string): Promise<void> {
    await updateDoc(doc(db, 'householdInvites', inviteId), {
        status: 'declined'
    });
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

// Generate invite link
export function getInviteLink(inviteCode: string): string {
    // Use window.location.origin if available, otherwise a placeholder
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://yourapp.com';
    return `${baseUrl}/join/${inviteCode}`;
}
