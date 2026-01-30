// Shared types and constants for the app
import { UserProfile } from './user-service';

export type Currency = 'EUR' | 'HUF';

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' }
];

// Avatar options for user profiles
export const AVATAR_OPTIONS = [
    '👨', '👩', '🧑', '👦', '👧', '🧔', '👱', '👴', '👵',
    '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🦄'
];

export function getCurrencySymbol(currency: Currency): string {
    return CURRENCIES.find(c => c.value === currency)?.symbol || '€';
}

export function formatAmount(amount: number, currency: Currency): string {
    const symbol = getCurrencySymbol(currency);
    if (currency === 'HUF') {
        return `${amount.toLocaleString('hu-HU', { maximumFractionDigits: 0 })} ${symbol}`;
    }
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// Helper to get member display info
export function getMemberDisplay(member: UserProfile): { name: string; emoji: string } {
    return {
        name: member.displayName,
        emoji: member.avatarEmoji
    };
}
