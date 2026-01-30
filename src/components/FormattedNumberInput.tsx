'use client';

import { useState, useEffect } from 'react';

interface FormattedNumberInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    min?: number;
    step?: string;
}

export default function FormattedNumberInput({
    value,
    onChange,
    placeholder = '0',
    className = 'input',
    required = false,
    min = 0,
}: FormattedNumberInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Format the display value when the actual value changes externally
        if (value) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                setDisplayValue(formatNumber(num));
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const formatNumber = (num: number): string => {
        // Format with commas, handling decimals
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;

        // Remove commas for processing
        const cleanedValue = input.replace(/,/g, '');

        // Allow empty, numbers, and single decimal point
        if (cleanedValue === '' || /^\d*\.?\d*$/.test(cleanedValue)) {
            // Update the actual numeric value (without commas)
            onChange(cleanedValue);

            // Format the display value with commas
            if (cleanedValue === '' || cleanedValue === '.') {
                setDisplayValue(cleanedValue);
            } else {
                const num = parseFloat(cleanedValue);
                if (!isNaN(num)) {
                    // Keep trailing decimal or zeros after decimal when typing
                    if (cleanedValue.includes('.')) {
                        const parts = cleanedValue.split('.');
                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        setDisplayValue(parts.join('.'));
                    } else {
                        setDisplayValue(formatNumber(num));
                    }
                } else {
                    setDisplayValue(cleanedValue);
                }
            }
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            className={className}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            min={min}
        />
    );
}
