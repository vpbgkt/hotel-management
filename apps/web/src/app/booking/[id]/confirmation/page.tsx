'use client';

/**
 * Booking Confirmation Page
 * /booking/[id]/confirmation - Shows booking confirmation details from real API
 */

import { use } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_BOOKING } from '@/lib/graphql/queries/user';
import Link from 'next/link';
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  User, 
  Download,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { id } = use(params);

  const { data, loading, error } = useQuery<{ booking: any }>(GET_BOOKING, {
    variables: { id },
  });

  const booking = data?.booking;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error?.message || 'Unable to load booking.'}</p>
          <Link href="/dashboard/bookings" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
            ← Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const nights = booking.checkOutDate
    ? Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000))
    : null;

  const isConfirmed = booking.status === 'CONFIRMED' || booking.paymentStatus === 'PAID';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className={`w-20 h-20 ${isConfirmed ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <CheckCircle className={`w-10 h-10 ${isConfirmed ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {isConfirmed ? 'Booking Confirmed!' : 'Booking Received'}
              </h1>
              <p className="text-gray-600">
                {isConfirmed
                  ? 'Your reservation has been successfully booked'
                  : 'Your booking is being processed'}
              </p>
            </div>
            
            {/* Confirmation Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="bg-brand-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-brand-100 text-sm">Booking Number</p>
                    <p className="text-xl font-bold tracking-wide">
                      {booking.bookingNumber}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isConfirmed ? 'bg-white text-brand-600' : 'bg-yellow-400 text-yellow-900'
                  }`}>
                    {booking.status}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Hotel Info */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {booking.hotel?.name || 'Hotel'}
                  </h2>
                  <div className="space-y-2 text-sm text-gray-600">
                    {booking.hotel?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{booking.hotel.address}, {booking.hotel.city}</span>
                      </div>
                    )}
                    {booking.hotel?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${booking.hotel.phone}`} className="text-brand-600 hover:underline">
                          {booking.hotel.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Check-in */}
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Check-in
                      </div>
                      <p className="font-semibold text-gray-900">{formatDate(booking.checkInDate)}</p>
                      {booking.checkInTime && (
                        <p className="text-sm text-gray-500">At {booking.checkInTime}</p>
                      )}
                    </div>
                    
                    {/* Check-out */}
                    {booking.checkOutDate && (
                      <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                          <Calendar className="w-4 h-4" />
                          Check-out
                        </div>
                        <p className="font-semibold text-gray-900">{formatDate(booking.checkOutDate)}</p>
                        {booking.checkOutTime && (
                          <p className="text-sm text-gray-500">By {booking.checkOutTime}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Room */}
                    <div>
                      <div className="text-gray-500 text-sm mb-1">Room Type</div>
                      <p className="font-semibold text-gray-900">{booking.roomType?.name}</p>
                      {booking.numRooms > 1 && (
                        <p className="text-sm text-gray-500">{booking.numRooms} rooms</p>
                      )}
                    </div>
                    
                    {/* Guests */}
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <User className="w-4 h-4" />
                        Guests
                      </div>
                      <p className="font-semibold text-gray-900">
                        {booking.numGuests} guest{booking.numGuests > 1 ? 's' : ''}
                        {booking.numExtraGuests > 0 && ` + ${booking.numExtraGuests} extra`}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Guest Details */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Guest Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name</span>
                      <span className="text-gray-900 font-medium">{booking.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email</span>
                      <span className="text-gray-900">{booking.guestEmail}</span>
                    </div>
                    {booking.guestPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone</span>
                        <span className="text-gray-900">{booking.guestPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Special Requests</h3>
                    <p className="text-sm text-gray-600">{booking.specialRequests}</p>
                  </div>
                )}
                
                {/* Payment Summary */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Room{nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : ''}
                      </span>
                      <span className="text-gray-900">{formatCurrency(booking.roomTotal)}</span>
                    </div>
                    {booking.extraGuestTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Extra guests</span>
                        <span className="text-gray-900">{formatCurrency(booking.extraGuestTotal)}</span>
                      </div>
                    )}
                    {booking.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>−{formatCurrency(booking.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes & fees</span>
                      <span className="text-gray-900">{formatCurrency(booking.taxes)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Payment Status</span>
                      <span className={booking.paymentStatus === 'PAID' ? 'text-green-600 font-medium' : ''}>
                        {booking.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
              <Link
                href="/dashboard/bookings"
                className="inline-flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                View All Bookings
              </Link>
            </div>
            
            {/* Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-800">
                A confirmation email has been sent to <strong>{booking.guestEmail}</strong>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
