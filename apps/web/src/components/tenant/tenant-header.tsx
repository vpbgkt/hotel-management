'use client';

/**
 * Tenant Header Component
 * Hotel-specific branded header with navigation
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/lib/tenant/tenant-context';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/offers', label: 'Offers' },
  { href: '/blog', label: 'Blog' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/about', label: 'About' },
];

export function TenantHeader() {
  const { hotel, theme } = useTenant();
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  const isTransparent = theme.headerStyle === 'transparent' && !isScrolled;

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isTransparent
            ? 'bg-transparent'
            : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
        )}
      >
        {/* Top bar */}
        {hotel?.phone && (
          <div
            className={cn(
              'hidden lg:block border-b transition-colors duration-300',
              isTransparent ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50/80'
            )}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-9 text-sm">
                <div className="flex items-center gap-6">
                  {hotel.phone && (
                    <a
                      href={`tel:${hotel.phone}`}
                      className={cn(
                        'flex items-center gap-1.5 hover:opacity-80 transition-opacity',
                        isTransparent ? 'text-white/90' : 'text-gray-600'
                      )}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {hotel.phone}
                    </a>
                  )}
                  {hotel.email && (
                    <a
                      href={`mailto:${hotel.email}`}
                      className={cn(
                        'flex items-center gap-1.5 hover:opacity-80 transition-opacity',
                        isTransparent ? 'text-white/90' : 'text-gray-600'
                      )}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {hotel.email}
                    </a>
                  )}
                </div>
                <div className={cn(
                  'text-xs',
                  isTransparent ? 'text-white/70' : 'text-gray-400'
                )}>
                  Book Direct & Save
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              {hotel?.logoUrl ? (
                <Image
                  src={hotel.logoUrl}
                  alt={hotel.name || 'Hotel'}
                  width={40}
                  height={40}
                  className="rounded-lg object-contain"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  
                >
                  {hotel?.name?.charAt(0) || 'H'}
                </div>
              )}
              <span
                className={cn(
                  'text-lg font-bold hidden sm:block',
                  isTransparent ? 'text-white' : 'text-gray-900'
                )}
              >
                {hotel?.name || 'Hotel'}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === link.href
                      ? isTransparent
                        ? 'text-white bg-white/20'
                        : 'text-brand-600 bg-brand-50'
                      : isTransparent
                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link href="/rooms">
                <Button
                  size="sm"
                  className="hidden sm:inline-flex"
                  style={{
                    backgroundColor: theme.primaryColor || undefined,
                  }}
                >
                  Book Now
                </Button>
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className={cn(
                      'text-sm font-medium',
                      isTransparent ? 'text-white/90' : 'text-gray-600'
                    )}
                  >
                    My Bookings
                  </Link>
                  <button
                    onClick={() => logout()}
                    title="Logout"
                    className={cn(
                      'p-1.5 rounded-md hover:bg-black/10 transition-colors',
                      isTransparent ? 'text-white/90' : 'text-gray-500'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className={cn(
                    'text-sm font-medium',
                    isTransparent ? 'text-white/90' : 'text-gray-600'
                  )}
                >
                  Login
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className={cn('w-6 h-6', isTransparent ? 'text-white' : 'text-gray-900')} />
                ) : (
                  <Menu className={cn('w-6 h-6', isTransparent ? 'text-white' : 'text-gray-900')} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-72 h-full bg-white shadow-xl">
            <div className="pt-20 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-md text-base font-medium transition-colors mb-1',
                    pathname === link.href
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-4" />
              {isAuthenticated && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 mb-1"
                  >
                    My Bookings
                  </Link>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 mb-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                  <hr className="my-4" />
                </>
              )}
              <Link
                href="/rooms"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block"
              >
                <Button className="w-full">Book Now</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
