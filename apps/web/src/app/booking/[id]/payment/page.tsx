'use client';

/**
 * Payment Page - /booking/[id]/payment
 * Fetches real booking data and shows the payment form
 */

import { use } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_BOOKING } from '@/lib/graphql/queries/user';
import { PaymentForm } from './payment-form';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PaymentPageProps {
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

export default function PaymentPage({ params }: PaymentPageProps) {
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
          <p className="text-gray-500">Loading booking details...</p>
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
          <p className="text-gray-500 text-sm mb-6">
            {error?.message || 'Unable to load booking details.'}
          </p>
          <Link
            href="/dashboard/bookings"
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            ← Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  // If already paid, show a message
  if (booking.paymentStatus === 'PAID') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md shadow-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Already Paid</h2>
          <p className="text-gray-500 text-sm mb-6">This booking has already been paid.</p>
          <Link
            href={`/booking/${id}/confirmation`}
            className="inline-block px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            View Confirmation
          </Link>
        </div>
      </div>
    );
  }

  const nights = booking.checkOutDate
    ? Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Bookings
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Complete Your Booking
            </h1>
            <p className="text-gray-600 mb-8">
              You&apos;re just one step away from confirming your stay
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Payment Form */}
              <div className="lg:col-span-3">
                <PaymentForm bookingId={id} amount={booking.totalAmount} />
              </div>
              
              {/* Booking Summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Booking Summary
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-900">{booking.hotel?.name}</p>
                      <p className="text-sm text-gray-500">{booking.roomType?.name}</p>
                      {booking.hotel?.city && (
                        <p className="text-xs text-gray-400 mt-0.5">{booking.hotel.city}</p>
                      )}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Check-in</span>
                        <span className="text-gray-900">{formatDate(booking.checkInDate)}</span>
                      </div>
                      {booking.checkOutDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Check-out</span>
                          <span className="text-gray-900">{formatDate(booking.checkOutDate)}</span>
                        </div>
                      )}
                      {booking.numHours && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration</span>
                          <span className="text-gray-900">{booking.numHours} hours</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Guests</span>
                        <span className="text-gray-900">
                          {booking.numGuests}{booking.numExtraGuests > 0 ? ` + ${booking.numExtraGuests} extra` : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Room{nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : ''}
                        </span>
                        <span className="text-gray-900">{formatCurrency(booking.roomTotal)}</span>
                      </div>
                      {booking.extraGuestTotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Extra guests</span>
                          <span className="text-gray-900">{formatCurrency(booking.extraGuestTotal)}</span>
                        </div>
                      )}
                      {booking.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>−{formatCurrency(booking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taxes & fees</span>
                        <span className="text-gray-900">{formatCurrency(booking.taxes)}</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(booking.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      🔒 Your payment is secured with 256-bit SSL encryption
                    </p>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-400">Ref: {booking.bookingNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
