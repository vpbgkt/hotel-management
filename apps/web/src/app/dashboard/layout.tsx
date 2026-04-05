'use client';

/**
 * Dashboard Layout - Hotel Manager
 * Protected layout for authenticated user pages
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  LayoutDashboard, 
  CalendarDays, 
  User, 
  Heart,
  Settings,
  CreditCard,
  Star,
  Bell,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'My Bookings',
    href: '/dashboard/bookings',
    icon: CalendarDays,
  },
  {
    label: 'My Reviews',
    href: '/dashboard/reviews',
    icon: Star,
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    label: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <>
      {/* Simple top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="font-semibold text-gray-900">
            ← Back to Hotel
          </Link>
          <span className="text-sm text-gray-500">My Account</span>
        </div>
      </header>
      <main className="min-h-[calc(100vh-56px)] bg-gray-50">
        <div className="container-app py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900">My Account</h2>
                </div>
                <div className="border-t border-gray-100">
                  {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon size={18} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
