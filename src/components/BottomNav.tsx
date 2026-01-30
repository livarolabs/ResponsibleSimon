'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    { href: '/bills', icon: '📋', label: 'Bills' },
    { href: '/loans', icon: '💳', label: 'Loans' },
    { href: '/savings', icon: '🔄', label: 'Payback' },
    { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span className="nav-item-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
