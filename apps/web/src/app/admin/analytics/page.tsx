'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_ADMIN_ANALYTICS } from '@/lib/graphql/queries/admin';

// ============================================
// Types
// ============================================

interface MonthlyDataPoint {
  month: string;
  bookings: number;
  revenue: number;
}

interface RoomTypePopularity {
  roomTypeName: string;
  bookings: number;
  revenue: number;
}

interface BookingsBySource {
  source: string;
  count: number;
}

interface BookingsByStatus {
  status: string;
  count: number;
}

interface AnalyticsData {
  monthlyData: MonthlyDataPoint[];
  roomTypePopularity: RoomTypePopularity[];
  bookingsBySource: BookingsBySource[];
  bookingsByStatus: BookingsByStatus[];
  averageBookingValue: number;
  averageStayNights: number;
}

// ============================================
// Helpers
// ============================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-blue-500',
  CHECKED_IN: 'bg-green-500',
  CHECKED_OUT: 'bg-gray-400',
  CANCELLED: 'bg-red-500',
  NO_SHOW: 'bg-orange-500',
};

const SOURCE_COLORS: Record<string, string> = {
  DIRECT: 'bg-emerald-500',
  ONLINE: 'bg-blue-500',
  OTA: 'bg-purple-500',
  WALK_IN: 'bg-amber-500',
};

// Simple bar chart component (no external dependencies)
function BarChart({
  data,
  label,
  value,
  maxValue,
  color = 'bg-blue-500',
}: {
  data: { label: string; value: number }[];
  label: string;
  value: string;
  maxValue: number;
  color?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 truncate">{item.label}</span>
            <span className="text-gray-900 font-medium ml-2">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [months, setMonths] = useState(6);

  const { data, loading, error } = useQuery<{ adminAnalytics: AnalyticsData }>(
    GET_ADMIN_ANALYTICS,
    {
      variables: { hotelId, months },
      skip: !hotelId,
    },
  );

  const analytics = data?.adminAnalytics as AnalyticsData | undefined;

  if (!hotelId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No hotel assigned to your account.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load analytics. {error?.message}</p>
        </div>
      </div>
    );
  }

  // Compute totals
  const totalRevenue = analytics.monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalBookings = analytics.monthlyData.reduce((sum, m) => sum + m.bookings, 0);
  const maxMonthlyRevenue = Math.max(...analytics.monthlyData.map((m) => m.revenue), 1);
  const maxMonthlyBookings = Math.max(...analytics.monthlyData.map((m) => m.bookings), 1);
  const maxRoomTypeBookings = Math.max(...analytics.roomTypePopularity.map((r) => r.bookings), 1);
  const maxRoomTypeRevenue = Math.max(...analytics.roomTypePopularity.map((r) => r.revenue), 1);
  const totalSourceCount = analytics.bookingsBySource.reduce((s, b) => s + b.count, 0);
  const totalStatusCount = analytics.bookingsByStatus.reduce((s, b) => s + b.count, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, bookings, and room performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                months === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m} months
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">Last {months} months</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalBookings}</div>
          <div className="text-xs text-gray-400 mt-1">Last {months} months</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Avg Booking Value</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(analytics.averageBookingValue)}</div>
          <div className="text-xs text-gray-400 mt-1">Per booking</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Avg Stay Duration</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{analytics.averageStayNights} nights</div>
          <div className="text-xs text-gray-400 mt-1">Daily bookings only</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
        <div className="space-y-1">
          {analytics.monthlyData.map((m) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 text-right">{m.month}</span>
              <div className="flex-1 h-8 bg-gray-50 rounded-lg overflow-hidden flex items-center">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                  style={{ width: `${maxMonthlyRevenue > 0 ? Math.max((m.revenue / maxMonthlyRevenue) * 100, m.revenue > 0 ? 15 : 0) : 0}%` }}
                >
                  {m.revenue > 0 && (
                    <span className="text-xs text-white font-medium whitespace-nowrap">
                      {formatCurrency(m.revenue)}
                    </span>
                  )}
                </div>
                {m.revenue === 0 && (
                  <span className="text-xs text-gray-400 ml-2">No revenue</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Bookings</h3>
        <div className="flex items-end gap-2 h-48">
          {analytics.monthlyData.map((m) => {
            const height = maxMonthlyBookings > 0 ? (m.bookings / maxMonthlyBookings) * 100 : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end">
                <span className="text-xs text-gray-600 font-medium mb-1">{m.bookings}</span>
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-700"
                  style={{ height: `${Math.max(height, m.bookings > 0 ? 10 : 2)}%` }}
                />
                <span className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">
                  {m.month.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Room Type Popularity (by bookings) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Type Performance</h3>
          {analytics.roomTypePopularity.length > 0 ? (
            <div className="space-y-5">
              {analytics.roomTypePopularity.map((rt) => (
                <div key={rt.roomTypeName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{rt.roomTypeName}</span>
                    <span className="text-sm text-gray-600">
                      {rt.bookings} bookings · {formatCurrency(rt.revenue)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-gray-400 mb-0.5">Bookings</div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(rt.bookings / maxRoomTypeBookings) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 mb-0.5">Revenue</div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${maxRoomTypeRevenue > 0 ? (rt.revenue / maxRoomTypeRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No room type data yet</p>
          )}
        </div>

        {/* Booking Sources & Status */}
        <div className="space-y-6">
          {/* Source distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Sources</h3>
            {analytics.bookingsBySource.length > 0 ? (
              <div className="space-y-3">
                {analytics.bookingsBySource.map((bs) => (
                  <div key={bs.source} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${SOURCE_COLORS[bs.source] || 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-700 flex-1">{bs.source}</span>
                    <span className="text-sm font-medium text-gray-900">{bs.count}</span>
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {totalSourceCount > 0 ? Math.round((bs.count / totalSourceCount) * 100) : 0}%
                    </span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SOURCE_COLORS[bs.source] || 'bg-gray-400'}`}
                        style={{ width: `${totalSourceCount > 0 ? (bs.count / totalSourceCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No booking source data yet</p>
            )}
          </div>

          {/* Status distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
            {analytics.bookingsByStatus.length > 0 ? (
              <>
                {/* Stacked bar */}
                <div className="h-4 flex rounded-full overflow-hidden mb-4">
                  {analytics.bookingsByStatus.map((bs) => (
                    <div
                      key={bs.status}
                      className={`${STATUS_COLORS[bs.status] || 'bg-gray-300'} transition-all`}
                      style={{ width: `${totalStatusCount > 0 ? (bs.count / totalStatusCount) * 100 : 0}%` }}
                      title={`${bs.status}: ${bs.count}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {analytics.bookingsByStatus.map((bs) => (
                    <div key={bs.status} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[bs.status] || 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-600">{bs.status}</span>
                      <span className="text-xs font-medium text-gray-900 ml-auto">{bs.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No status data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
