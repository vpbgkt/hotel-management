'use client';

/**
 * Admin Payments Page - Hotel Manager
 * Payment gateway configuration and transaction overview
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_HOTEL_BY_ID } from '@/lib/graphql/queries/hotels';
import { UPDATE_HOTEL, GET_ADMIN_BOOKINGS, GET_ADMIN_DASHBOARD_STATS } from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  IndianRupee,
  TrendingUp,
  Clock,
  ShieldCheck,
  ExternalLink,
  Zap,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [saved, setSaved] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({
    razorpayAccountId: '',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hotelData, loading: hotelLoading } = useQuery<any>(GET_HOTEL_BY_ID, {
    variables: { id: hotelId },
    skip: !hotelId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: statsData } = useQuery<any>(GET_ADMIN_DASHBOARD_STATS, {
    variables: { hotelId },
    skip: !hotelId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingsData } = useQuery<any>(GET_ADMIN_BOOKINGS, {
    variables: {
      filters: { hotelId },
      pagination: { page: 1, limit: 10 },
    },
    skip: !hotelId,
  });

  const [updateHotel, { loading: saving }] = useMutation(UPDATE_HOTEL, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (hotelData?.hotel) {
      setGatewayConfig({
        razorpayAccountId: hotelData.hotel.razorpayAccountId || '',
      });
    }
  }, [hotelData]);

  const handleSaveGateway = async () => {
    await updateHotel({
      variables: {
        input: {
          hotelId,
          razorpayAccountId: gatewayConfig.razorpayAccountId || undefined,
        },
      },
    });
  };

  const stats = statsData?.adminDashboardStats;
  const bookings = bookingsData?.bookings?.bookings || [];
  const paidBookings = bookings.filter((b: { paymentStatus: string }) => b.paymentStatus === 'PAID');
  const pendingBookings = bookings.filter((b: { paymentStatus: string }) => b.paymentStatus === 'PENDING');

  const hasRazorpay = !!gatewayConfig.razorpayAccountId;
  const activeGateway = hasRazorpay ? 'Razorpay' : 'Demo';

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  if (hotelLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Payment gateway configuration and transaction overview</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Saved successfully
          </div>
        )}
      </div>

      {/* Revenue Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{(stats.totalRevenue || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{(stats.monthlyRevenue || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Gateway</p>
                  <p className="text-xl font-bold text-gray-900">{activeGateway}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Gateway Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-600" />
            Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Mode Banner */}
          {!hasRazorpay && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Demo Mode Active</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Payments are simulated. Configure Razorpay below to accept real payments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Razorpay */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  R
                </div>
                <div>
                  <h4 className="font-medium text-sm">Razorpay</h4>
                  <p className="text-xs text-gray-500">Popular payment gateway for India</p>
                </div>
              </div>
              {hasRazorpay && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
              <input
                type="text"
                value={gatewayConfig.razorpayAccountId}
                onChange={(e) => setGatewayConfig(prev => ({ ...prev, razorpayAccountId: e.target.value }))}
                placeholder="acc_xxxxxxxxxx"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your{' '}
                <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-1">
                  Razorpay Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveGateway} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Gateway Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IndianRupee className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Booking</th>
                    <th className="pb-2 font-medium">Guest</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking: {
                    id: string;
                    bookingNumber: string;
                    guestName: string;
                    totalAmount: number;
                    status: string;
                    paymentStatus: string;
                    createdAt: string;
                  }) => (
                    <tr key={booking.id} className="text-gray-700">
                      <td className="py-2.5 font-mono text-xs">{booking.bookingNumber}</td>
                      <td className="py-2.5">{booking.guestName}</td>
                      <td className="py-2.5 font-medium">₹{booking.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          booking.status === 'CONFIRMED' ? 'bg-green-50 text-green-700' :
                          booking.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                          booking.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          booking.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' :
                          booking.paymentStatus === 'REFUNDED' ? 'bg-orange-50 text-orange-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Footer */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
            <span>{paidBookings.length} paid, {pendingBookings.length} pending of {bookings.length} recent</span>
            <a href="/admin/bookings" className="text-brand-600 hover:underline text-sm font-medium">
              View All Bookings →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
