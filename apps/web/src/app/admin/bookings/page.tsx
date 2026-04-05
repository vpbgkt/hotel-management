'use client';

/**
 * Admin Bookings Management - Hotel Manager
 * List, filter, and manage hotel bookings
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  GET_ADMIN_BOOKINGS,
  UPDATE_BOOKING_STATUS,
  GET_ADMIN_DASHBOARD_STATS,
} from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
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

const statusTransitions: Record<string, { label: string; nextStatus: string; icon: React.ElementType }[]> = {
  PENDING: [
    { label: 'Confirm', nextStatus: 'CONFIRMED', icon: CheckCircle },
    { label: 'Cancel', nextStatus: 'CANCELLED', icon: XCircle },
  ],
  CONFIRMED: [
    { label: 'Check In', nextStatus: 'CHECKED_IN', icon: UserCheck },
    { label: 'No Show', nextStatus: 'NO_SHOW', icon: UserX },
    { label: 'Cancel', nextStatus: 'CANCELLED', icon: XCircle },
  ],
  CHECKED_IN: [
    { label: 'Check Out', nextStatus: 'CHECKED_OUT', icon: UserX },
  ],
};

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error, refetch } = useQuery<any>(GET_ADMIN_BOOKINGS, {
    variables: {
      filters: {
        hotelId,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      },
      pagination: { page, limit },
    },
    skip: !hotelId,
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_BOOKING_STATUS, {
    onCompleted: () => {
      refetch();
    },
  });

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await updateStatus({
        variables: {
          input: { bookingId, status: newStatus },
        },
        refetchQueries: [
          { query: GET_ADMIN_DASHBOARD_STATS, variables: { hotelId } },
        ],
      });
    } catch (err) {
      console.error('Failed to update booking status:', err);
    }
  };

  const bookings = data?.bookings?.bookings || [];
  const total = data?.bookings?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage all hotel bookings</p>
        </div>
        <Button asChild>
          <a href="/admin/walk-in">
            <UserCheck size={16} className="mr-2" />
            New Walk-in
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or booking #..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              {error.message}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Booking #</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Guest</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Room</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Dates</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((booking: Record<string, unknown>) => {
                      const transitions = statusTransitions[booking.status as string] || [];
                      return (
                        <tr key={booking.id as string} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs font-medium">{booking.bookingNumber as string}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {booking.source as string} · {booking.bookingType as string}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{booking.guestName as string}</div>
                            <div className="text-xs text-gray-500">{booking.guestPhone as string}</div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="text-gray-700">
                              {(booking.roomType as Record<string, string>)?.name || '—'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {booking.numRooms as number} room{(booking.numRooms as number) > 1 ? 's' : ''} · {booking.numGuests as number} guest{(booking.numGuests as number) > 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell text-gray-600">
                            <div>
                              {booking.checkInDate
                                ? format(new Date(booking.checkInDate as string), 'MMM d')
                                : '—'}
                              {booking.checkOutDate ? (
                                <span> &rarr; {format(new Date(booking.checkOutDate as string), 'MMM d')}</span>
                              ) : null}
                            </div>
                            {booking.bookingType === 'HOURLY' && (
                              <div className="text-xs text-gray-400">
                                {booking.checkInTime as string} ({booking.numHours as number}h)
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              ₹{((booking.totalAmount as number) || 0).toLocaleString('en-IN')}
                            </div>
                            <div className={`text-xs ${booking.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {(booking.paymentStatus as string)?.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status as string] || 'bg-gray-100 text-gray-800'}`}>
                              {(booking.status as string)?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {transitions.map((t) => {
                                const Icon = t.icon;
                                return (
                                  <button
                                    key={t.nextStatus}
                                    onClick={() => handleStatusChange(booking.id as string, t.nextStatus)}
                                    disabled={updating}
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                    title={t.label}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          No bookings found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
