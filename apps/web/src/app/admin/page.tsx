'use client';

/**
 * Hotel Admin Dashboard - Hotel Manager
 * Overview with revenue cards, occupancy, check-ins/outs, recent bookings
 */

import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_ADMIN_DASHBOARD_STATS } from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  IndianRupee,
  TrendingUp,
  CalendarCheck,
  CalendarMinus,
  BedDouble,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error } = useQuery<any>(GET_ADMIN_DASHBOARD_STATS, {
    variables: { hotelId },
    skip: !hotelId,
  });

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hotel Assigned</h2>
        <p className="text-gray-500">Your account is not linked to any hotel. Contact the platform admin.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  const stats = data?.adminDashboardStats;

  const statCards = [
    {
      label: 'Monthly Revenue',
      value: `₹${(stats?.monthlyRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Monthly Bookings',
      value: stats?.monthlyBookings || 0,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: "Today's Check-ins",
      value: stats?.todayCheckIns || 0,
      icon: CalendarCheck,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: "Today's Check-outs",
      value: stats?.todayCheckOuts || 0,
      icon: CalendarMinus,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      label: 'Occupancy Rate',
      value: `${stats?.occupancyRate || 0}%`,
      icon: BedDouble,
      color: 'text-teal-600 bg-teal-100',
    },
    {
      label: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'text-emerald-600 bg-emerald-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your hotel overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-xl font-bold text-gray-900">{stats?.totalBookings || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Total Rooms</div>
          <div className="text-xl font-bold text-gray-900">{stats?.totalRooms || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Occupied</div>
          <div className="text-xl font-bold text-gray-900">{stats?.occupiedRooms || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Available</div>
          <div className="text-xl font-bold text-gray-900">{(stats?.totalRooms || 0) - (stats?.occupiedRooms || 0)}</div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Recent Bookings</CardTitle>
          <Link
            href="/admin/bookings"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Booking #</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Guest</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500 hidden md:table-cell">Room</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500 hidden lg:table-cell">Check-in</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.recentBookings?.map((booking: Record<string, unknown>) => (
                  <tr key={booking.id as string} className="hover:bg-gray-50">
                    <td className="py-3 px-2 font-mono text-xs">{booking.bookingNumber as string}</td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900">{booking.guestName as string}</div>
                      <div className="text-xs text-gray-500">{booking.guestPhone as string}</div>
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell text-gray-600">
                      {(booking.roomType as Record<string, string>)?.name || '—'}
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell text-gray-600">
                      {booking.checkInDate
                        ? format(new Date(booking.checkInDate as string), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="py-3 px-2 font-medium">
                      ₹{((booking.totalAmount as number) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status as string] || 'bg-gray-100 text-gray-800'}`}>
                        {(booking.status as string)?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentBookings || stats.recentBookings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No bookings yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
