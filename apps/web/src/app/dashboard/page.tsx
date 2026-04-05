'use client';

/**
 * Dashboard Overview Page - Hotel Manager
 * Shows summary of user's bookings, recent activity, and quick actions
 * Wired to real GraphQL API
 */

import { useAuth } from '@/lib/auth/auth-context';
import { useQuery } from '@apollo/client/react';
import { MY_BOOKINGS, MY_REVIEWS } from '@/lib/graphql/queries/user';
import Link from 'next/link';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  ChevronRight,
  Hotel,
  Star,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions = [
  { label: 'Book a Hotel', href: '/hotels', icon: Hotel },
  { label: 'View Bookings', href: '/dashboard/bookings', icon: CalendarDays },
  { label: 'My Reviews', href: '/dashboard/reviews', icon: Star },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  CHECKED_IN: { label: 'Checked In', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CHECKED_OUT: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: bookingsData, loading: bookingsLoading } = useQuery<any>(MY_BOOKINGS, {
    variables: { limit: 50, offset: 0 },
    skip: !user,
  });

  const { data: reviewsData, loading: reviewsLoading } = useQuery<any>(MY_REVIEWS, {
    variables: { limit: 10, offset: 0 },
    skip: !user,
  });

  const bookings = bookingsData?.myBookings || [];
  const reviews = reviewsData?.myReviews || [];
  const loading = bookingsLoading || reviewsLoading;

  // Compute real stats
  const upcomingCount = bookings.filter(
    (b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING'
  ).length;
  const uniqueCities = new Set(bookings.map((b: any) => b.hotel?.city).filter(Boolean)).size;

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: CalendarDays, color: 'text-blue-600 bg-blue-100' },
    { label: 'Upcoming Stays', value: upcomingCount, icon: Clock, color: 'text-green-600 bg-green-100' },
    { label: 'Cities Visited', value: uniqueCities, icon: MapPin, color: 'text-purple-600 bg-purple-100' },
    { label: 'Reviews Given', value: reviews.length, icon: Star, color: 'text-orange-600 bg-orange-100' },
  ];

  const recentBookings = bookings.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] || 'Guest'}! 👋
        </h1>
        <p className="mt-2 text-brand-100">
          Manage your bookings, explore new destinations, and track your stays.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {loading ? (
                        <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Recent Bookings</CardTitle>
              <Link 
                href="/dashboard/bookings"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              ) : recentBookings.length > 0 ? (
                recentBookings.map((booking: any) => {
                  const status = statusConfig[booking.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <Link
                      key={booking.id}
                      href="/dashboard/bookings"
                      className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {booking.roomType?.images?.[0] ? (
                          <img
                            src={booking.roomType.images[0]}
                            alt={booking.hotel?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-400 flex items-center justify-center">
                            <Hotel size={24} className="text-brand-700" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {booking.hotel?.name || 'Hotel'}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {booking.hotel?.city || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(booking.checkInDate).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                          {booking.checkOutDate && (
                            <>
                              {' - '}
                              {new Date(booking.checkOutDate).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Hotel size={48} className="mx-auto text-gray-300" />
                  <p className="mt-4 text-gray-500">No bookings yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/rooms">Browse Rooms</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Reviews Summary */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors">
                      <Icon size={18} />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                      {action.label}
                    </span>
                    <ChevronRight size={16} className="ml-auto text-gray-400" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">My Reviews</CardTitle>
              <Link 
                href="/dashboard/reviews"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((review: any) => (
                    <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(review.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      {review.title && (
                        <p className="text-sm font-medium text-gray-900">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Star size={32} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No reviews yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
