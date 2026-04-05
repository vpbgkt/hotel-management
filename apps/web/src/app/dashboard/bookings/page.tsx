'use client';

/**
 * My Bookings Page - Hotel Manager
 * Lists all user bookings with filtering and cancel support
 * Wired to real GraphQL API
 */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import { MY_BOOKINGS, CANCEL_BOOKING } from '@/lib/graphql/queries/user';
import { MODIFY_BOOKING } from '@/lib/graphql/mutations/bookings';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  Users,
  ChevronRight,
  Hotel,
  Loader2,
  Download,
  X,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-green-100 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

function getFilterCategory(status: string): string {
  if (status === 'PENDING' || status === 'CONFIRMED') return 'upcoming';
  if (status === 'CHECKED_OUT' || status === 'CHECKED_IN') return 'completed';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'cancelled';
  return 'all';
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Modify booking state
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyingBooking, setModifyingBooking] = useState<any>(null);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');

  const { data, loading, error, refetch } = useQuery<any>(MY_BOOKINGS, {
    variables: { limit: 100, offset: 0 },
    skip: !user,
  });

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_BOOKING, {
    onCompleted: () => {
      setShowCancelModal(false);
      setCancellingId(null);
      setCancelReason('');
      refetch();
    },
  });

  const [modifyBooking, { loading: modifying }] = useMutation<any>(MODIFY_BOOKING, {
    onCompleted: () => {
      setShowModifyModal(false);
      setModifyingBooking(null);
      refetch();
    },
  });

  const handleModifyClick = (booking: any) => {
    setModifyingBooking(booking);
    setNewCheckIn(new Date(booking.checkInDate).toISOString().split('T')[0]);
    setNewCheckOut(booking.checkOutDate ? new Date(booking.checkOutDate).toISOString().split('T')[0] : '');
    setShowModifyModal(true);
  };

  const handleModifySubmit = async () => {
    if (!modifyingBooking) return;
    await modifyBooking({
      variables: {
        input: {
          bookingId: modifyingBooking.id,
          checkInDate: new Date(newCheckIn).toISOString(),
          checkOutDate: newCheckOut ? new Date(newCheckOut).toISOString() : undefined,
        },
      },
    });
  };

  const bookings = data?.myBookings || [];

  const filteredBookings = bookings.filter((booking: any) => {
    if (filter === 'all') return true;
    return getFilterCategory(booking.status) === filter;
  });

  const filterTabs: { value: BookingFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: bookings.length },
    { value: 'upcoming', label: 'Upcoming', count: bookings.filter((b: any) => getFilterCategory(b.status) === 'upcoming').length },
    { value: 'completed', label: 'Completed', count: bookings.filter((b: any) => getFilterCategory(b.status) === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: bookings.filter((b: any) => getFilterCategory(b.status) === 'cancelled').length },
  ];

  const handleCancelClick = (bookingId: string) => {
    setCancellingId(bookingId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!cancellingId || !cancelReason.trim()) return;
    cancelBooking({
      variables: {
        input: { bookingId: cancellingId, reason: cancelReason.trim() },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Modify Modal */}
      {showModifyModal && modifyingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Modify Booking</h3>
            <p className="text-sm text-gray-600 mb-4">
              Booking #{modifyingBooking.bookingNumber} — {modifyingBooking.roomType?.name}
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="modCheckIn">Check-in Date</Label>
                <Input
                  id="modCheckIn"
                  type="date"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="modCheckOut">Check-out Date</Label>
                <Input
                  id="modCheckOut"
                  type="date"
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  min={newCheckIn}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowModifyModal(false); setModifyingBooking(null); }} disabled={modifying}>
                Cancel
              </Button>
              <Button onClick={handleModifySubmit} disabled={modifying || !newCheckIn || !newCheckOut}>
                {modifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => { setShowCancelModal(false); setCancellingId(null); setCancelReason(''); }}
                disabled={cancelling}
              >
                Keep Booking
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Manage and view your hotel reservations</p>
        </div>
        <Button asChild>
          <Link href="/rooms">
            <Hotel size={18} className="mr-2" />
            Book New Stay
          </Link>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            )}
          >
            {tab.label}
            <span className={cn(
              'ml-2 px-1.5 py-0.5 rounded-full text-xs',
              filter === tab.value
                ? 'bg-white/20'
                : 'bg-gray-100'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load bookings. Please try again.
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking: any) => (
            <Card key={booking.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Hotel Image */}
                  <div className="md:w-48 h-40 md:h-auto bg-gray-100 flex-shrink-0">
                    {booking.roomType?.images?.[0] ? (
                      <img
                        src={booking.roomType.images[0]}
                        alt={booking.hotel?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-400 flex items-center justify-center min-h-[160px]">
                        <Hotel size={32} className="text-brand-700" />
                      </div>
                    )}
                  </div>

                  {/* Booking Details */}
                  <div className="flex-1 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors[booking.status] || 'bg-gray-100 text-gray-600'}>
                            {statusLabels[booking.status] || booking.status}
                          </Badge>
                          {booking.bookingType === 'HOURLY' && (
                            <Badge variant="outline" className="border-purple-300 text-purple-700">
                              <Clock size={12} className="mr-1" />
                              Hourly
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.hotel?.name || 'Hotel'}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} />
                          {booking.hotel?.city || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Booking ID</p>
                        <p className="font-mono text-sm font-medium text-gray-900">
                          {booking.bookingNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Check-in</p>
                          <p className="font-medium text-gray-900">
                            {new Date(booking.checkInDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">
                            {booking.bookingType === 'HOURLY' ? 'Duration' : 'Check-out'}
                          </p>
                          <p className="font-medium text-gray-900">
                            {booking.bookingType === 'HOURLY'
                              ? `${booking.numHours || '-'} hours`
                              : booking.checkOutDate
                                ? new Date(booking.checkOutDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Room</p>
                          <p className="font-medium text-gray-900">
                            {booking.roomType?.name || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Guests</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Users size={14} />
                            {booking.numGuests}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation reason */}
                    {booking.status === 'CANCELLED' && booking.cancellationReason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                        <p className="text-red-700">
                          <span className="font-medium">Cancellation reason:</span>{' '}
                          {booking.cancellationReason}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* Download Invoice */}
                        {(booking.paymentStatus === 'PAID' || booking.status === 'CHECKED_OUT') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const token = localStorage.getItem('accessToken');
                              const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';
                              window.open(`${apiUrl}/api/invoices/${booking.id}?token=${token}`, '_blank');
                            }}
                          >
                            <Download size={14} className="mr-1" />
                            Invoice
                          </Button>
                        )}
                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModifyClick(booking)}
                          >
                            <CalendarDays size={14} className="mr-1" />
                            Modify
                          </Button>
                        )}
                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleCancelClick(booking.id)}
                          >
                            <X size={14} className="mr-1" />
                            Cancel
                          </Button>
                        )}
                        {booking.hotel?.slug && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/hotels/${booking.hotel.slug}`}>
                              View Hotel
                              <ChevronRight size={14} className="ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CalendarDays size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings found</h3>
            <p className="mt-2 text-gray-500">
              {filter === 'all' 
                ? "You haven't made any bookings yet." 
                : `You don't have any ${filter} bookings.`}
            </p>
            <Button asChild className="mt-6">
              <Link href="/rooms">Browse Rooms</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
