'use client';

/**
 * Walk-in Booking Page - Admin Dashboard
 *
 * Allows hotel staff to create walk-in bookings directly.
 * Form collects guest details, room selection, dates, and marks as WALK_IN source.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_ADMIN_ROOM_TYPES } from '@/lib/graphql/queries/admin';
import { CREATE_DAILY_BOOKING, CREATE_HOURLY_BOOKING } from '@/lib/graphql/mutations/bookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserPlus,
  CalendarDays,
  Clock,
  BedDouble,
  Users,
  Phone,
  Mail,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

type BookingType = 'DAILY' | 'HOURLY';

export default function WalkInBookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookingType, setBookingType] = useState<BookingType>('DAILY');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Guest info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Room selection
  const [roomTypeId, setRoomTypeId] = useState('');
  const [numRooms, setNumRooms] = useState(1);
  const [numGuests, setNumGuests] = useState(2);
  const [numExtraGuests, setNumExtraGuests] = useState(0);

  // Dates
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [numHours, setNumHours] = useState(3);

  const [specialRequests, setSpecialRequests] = useState('');

  const hotelId = (user as any)?.hotelId;

  const { data: roomTypesData, loading: roomsLoading } = useQuery<any>(GET_ADMIN_ROOM_TYPES, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [createDailyBooking, { loading: creatingDaily }] = useMutation<any>(CREATE_DAILY_BOOKING);
  const [createHourlyBooking, { loading: creatingHourly }] = useMutation<any>(CREATE_HOURLY_BOOKING);

  const roomTypes = roomTypesData?.adminRoomTypes || [];
  const selectedRoom = roomTypes.find((r: any) => r.id === roomTypeId);
  const isSubmitting = creatingDaily || creatingHourly;

  // Auto-set checkout to next day when daily
  useEffect(() => {
    if (bookingType === 'DAILY' && checkInDate && !checkOutDate) {
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOutDate(nextDay.toISOString().split('T')[0]);
    }
  }, [checkInDate, bookingType, checkOutDate]);

  // Price estimate
  const estimatePrice = () => {
    if (!selectedRoom) return 0;
    if (bookingType === 'DAILY') {
      if (!checkInDate || !checkOutDate) return 0;
      const nights = Math.ceil(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000,
      );
      const roomTotal = selectedRoom.basePriceDaily * nights * numRooms;
      const extraCharge = numExtraGuests * (selectedRoom.extraGuestCharge || 0) * nights;
      return roomTotal + extraCharge;
    } else {
      const roomTotal = (selectedRoom.basePriceHourly || 0) * numHours * numRooms;
      return roomTotal;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!roomTypeId) {
      setError('Please select a room type');
      return;
    }

    if (!guestName || !guestPhone) {
      setError('Guest name and phone are required');
      return;
    }

    try {
      const guestInfo = {
        name: guestName,
        email: guestEmail || `walkin-${Date.now()}@hotel.local`,
        phone: guestPhone,
      };

      if (bookingType === 'DAILY') {
        const { data } = await createDailyBooking({
          variables: {
            input: {
              hotelId,
              roomTypeId,
              checkInDate: new Date(checkInDate).toISOString(),
              checkOutDate: new Date(checkOutDate).toISOString(),
              numRooms,
              numGuests,
              numExtraGuests,
              guestInfo,
              specialRequests: specialRequests || undefined,
              source: 'WALK_IN',
            },
          },
        });

        if (data?.createDailyBooking?.success) {
          const booking = data.createDailyBooking.booking;
          setSuccess(`Walk-in booking created! Booking #${booking.bookingNumber}`);
          // Reset form after 2s
          setTimeout(() => {
            router.push('/admin/bookings');
          }, 2000);
        } else {
          setError(data?.createDailyBooking?.message || 'Failed to create booking');
        }
      } else {
        const { data } = await createHourlyBooking({
          variables: {
            input: {
              hotelId,
              roomTypeId,
              checkInDate: new Date(checkInDate).toISOString(),
              checkInTime,
              numHours,
              numRooms,
              numGuests,
              guestInfo,
              specialRequests: specialRequests || undefined,
              source: 'WALK_IN',
            },
          },
        });

        if (data?.createHourlyBooking?.success) {
          const booking = data.createHourlyBooking.booking;
          setSuccess(`Walk-in booking created! Booking #${booking.bookingNumber}`);
          setTimeout(() => {
            router.push('/admin/bookings');
          }, 2000);
        } else {
          setError(data?.createHourlyBooking?.message || 'Failed to create booking');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/bookings">
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="text-blue-600" size={28} />
            New Walk-in Booking
          </h1>
          <p className="text-gray-500">Create a booking for walk-in guests</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Guest Info + Room */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User size={18} />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guestName">Full Name *</Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guestPhone">Phone *</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-gray-50 border rounded-md text-sm text-gray-500">
                        +91
                      </div>
                      <Input
                        id="guestPhone"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email (Optional)</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Booking Type Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BedDouble size={18} />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type Toggle */}
                <div>
                  <Label>Booking Type</Label>
                  <div className="flex bg-gray-100 rounded-lg p-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setBookingType('DAILY')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        bookingType === 'DAILY'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CalendarDays size={16} />
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType('HOURLY')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        bookingType === 'HOURLY'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Clock size={16} />
                      Hourly
                    </button>
                  </div>
                </div>

                {/* Room Type Selection */}
                <div>
                  <Label htmlFor="roomType">Room Type *</Label>
                  {roomsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      Loading rooms...
                    </div>
                  ) : (
                    <select
                      id="roomType"
                      value={roomTypeId}
                      onChange={(e) => setRoomTypeId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a room type</option>
                      {roomTypes.filter((r: any) => r.isActive).map((rt: any) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} — ₹{bookingType === 'DAILY' ? rt.basePriceDaily : (rt.basePriceHourly || 'N/A')}/
                          {bookingType === 'DAILY' ? 'night' : 'hr'} ({rt.totalRooms} rooms)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkIn">Check-in Date *</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={checkInDate}
                      onChange={(e) => { setCheckInDate(e.target.value); setCheckOutDate(''); }}
                      required
                    />
                  </div>
                  {bookingType === 'DAILY' ? (
                    <div>
                      <Label htmlFor="checkOut">Check-out Date *</Label>
                      <Input
                        id="checkOut"
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        min={checkInDate}
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="checkInTime">Check-in Time</Label>
                        <Input
                          id="checkInTime"
                          type="time"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {bookingType === 'HOURLY' && (
                  <div>
                    <Label htmlFor="numHours">Duration (hours)</Label>
                    <Input
                      id="numHours"
                      type="number"
                      value={numHours}
                      onChange={(e) => setNumHours(parseInt(e.target.value) || 3)}
                      min={1}
                      max={24}
                    />
                  </div>
                )}

                {/* Guests */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="numRooms">Rooms</Label>
                    <Input
                      id="numRooms"
                      type="number"
                      value={numRooms}
                      onChange={(e) => setNumRooms(parseInt(e.target.value) || 1)}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numGuests">Guests</Label>
                    <Input
                      id="numGuests"
                      type="number"
                      value={numGuests}
                      onChange={(e) => setNumGuests(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numExtraGuests">Extra Guests</Label>
                    <Input
                      id="numExtraGuests"
                      type="number"
                      value={numExtraGuests}
                      onChange={(e) => setNumExtraGuests(parseInt(e.target.value) || 0)}
                      min={0}
                      max={10}
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <Label htmlFor="specialRequests">Special Requests</Label>
                  <textarea
                    id="specialRequests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests or notes..."
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium">{bookingType === 'DAILY' ? 'Daily Stay' : 'Hourly Stay'}</span>
                  </div>
                  {selectedRoom && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Room</span>
                      <span className="font-medium">{selectedRoom.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check-in</span>
                    <span className="font-medium">
                      {checkInDate ? new Date(checkInDate).toLocaleDateString('en-IN') : '—'}
                    </span>
                  </div>
                  {bookingType === 'DAILY' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-out</span>
                      <span className="font-medium">
                        {checkOutDate ? new Date(checkOutDate).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                  )}
                  {bookingType === 'HOURLY' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-medium">{numHours} hours</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rooms × Guests</span>
                    <span className="font-medium">{numRooms} × {numGuests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      <UserPlus size={12} />
                      Walk-in
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Estimated Total</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{estimatePrice().toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * Taxes may apply. Final amount calculated at checkout.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !roomTypeId || !guestName || !guestPhone}
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><UserPlus size={16} className="mr-2" />Create Walk-in Booking</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
