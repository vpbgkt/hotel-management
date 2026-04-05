'use client';

/**
 * Simple Header for auth/utility pages
 * Minimal branding with link back to hotel homepage
 */

import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link href="/" className="font-semibold text-gray-900 hover:text-brand-600 transition-colors">
          ← Back to Hotel
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/rooms" className="hover:text-gray-900 transition-colors">
            Rooms
          </Link>
          <Link href="/about#contact" className="hover:text-gray-900 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
