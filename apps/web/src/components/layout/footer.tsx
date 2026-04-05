'use client';

/**
 * Simple Footer for auth/utility pages
 */

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <Link href="/rooms" className="hover:text-gray-900 transition-colors">Rooms</Link>
          <Link href="/about#contact" className="hover:text-gray-900 transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
