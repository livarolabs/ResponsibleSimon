// Shared types and constants for the app

export type Currency = 'EUR' | 'HUF';
export type Owner = 'Simon' | 'Reni';

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' }
];

export const OWNERS: { value: Owner; label: string; emoji: string }[] = [
    { value: 'Simon', label: 'Simon', emoji: '👨' },
    { value: 'Reni', label: 'Reni', emoji: '👩' }
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
