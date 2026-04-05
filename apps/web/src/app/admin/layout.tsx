'use client';

/**
 * Hotel Admin Layout - Hotel Manager
 * Protected layout for hotel admin pages with sidebar navigation
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import {
  LayoutDashboard,
  BedDouble,
  CalendarDays,
  Settings,
  Hotel,
  BarChart3,
  Menu,
  X,
  LogOut,
  Loader2,
  IndianRupee,
  CreditCard,
  Search,
  MessageCircle,
  Palette,
  ImageIcon,
  UserPlus,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AGGREGATOR_HOSTS = new Set(['hotel.local', 'www.hotel.local']);

const adminLinks = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Bookings',
    href: '/admin/bookings',
    icon: CalendarDays,
  },
  {
    label: 'Walk-in',
    href: '/admin/walk-in',
    icon: UserPlus,
  },
  {
    label: 'Rooms',
    href: '/admin/rooms',
    icon: BedDouble,
  },
  {
    label: 'Pricing',
    href: '/admin/pricing',
    icon: IndianRupee,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    label: 'Reviews',
    href: '/admin/reviews',
    icon: MessageCircle,
  },
  {
    label: 'Blog',
    href: '/admin/blog',
    icon: BookOpen,
  },
  {
    label: 'Gallery',
    href: '/admin/gallery',
    icon: ImageIcon,
  },
  {
    label: 'SEO',
    href: '/admin/seo',
    icon: Search,
  },
  {
    label: 'Payments',
    href: '/admin/payments',
    icon: CreditCard,
  },
  {
    label: 'Branding',
    href: '/admin/branding',
    icon: Palette,
  },
  {
    label: 'Hotel Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

const GET_MY_HOTEL = gql`
  query GetMyHotel($hotelId: ID!) {
    hotel(id: $hotelId) {
      id
      name
      slug
    }
  }
`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hostname, setHostname] = useState('');

  const isAggregatorHost = hostname ? AGGREGATOR_HOSTS.has(hostname) : false;
  const isHotelUser = user?.role === 'HOTEL_ADMIN' || user?.role === 'HOTEL_STAFF';
  const visibleLinks = isAggregatorHost && isHotelUser
    ? adminLinks.filter((link) => link.href === '/admin/rooms')
    : adminLinks;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hotelData } = useQuery<any>(GET_MY_HOTEL, {
    variables: { hotelId: user?.hotelId },
    skip: !user?.hotelId,
  });
  const hotelName = hotelData?.hotel?.name;
  const hotelSlug = hotelData?.hotel?.slug;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/admin');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'HOTEL_ADMIN' && user?.role !== 'HOTEL_STAFF') {
      router.push('/dashboard');
    }
    if (!isLoading && isAuthenticated && isAggregatorHost && isHotelUser) {
      if (pathname !== '/admin/rooms') {
        router.push('/admin/rooms');
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, isAggregatorHost, isHotelUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'HOTEL_ADMIN' && user?.role !== 'HOTEL_STAFF')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transition-transform lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <Hotel className="w-6 h-6 text-brand-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-gray-900 text-sm block truncate">{hotelName || 'Hotel Admin'}</span>
              {hotelName && <span className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</span>}
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 p-4 border-t border-gray-200">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-brand-700 rounded-lg hover:bg-brand-50 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View My Website
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 w-full mt-1"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.role === 'HOTEL_STAFF' ? 'Hotel Staff' : 'Hotel Admin'}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
