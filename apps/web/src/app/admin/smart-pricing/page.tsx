'use client';

/**
 * Smart Pricing Page - AI-powered dynamic pricing suggestions
 * Shows demand analysis, price suggestions per day, and occupancy forecast
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  GET_ADMIN_ROOM_TYPES,
  GET_PRICE_SUGGESTIONS,
  APPLY_PRICE_SUGGESTIONS,
  GET_OCCUPANCY_FORECAST,
} from '@/lib/graphql/queries/admin';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Check,
  AlertTriangle,
  BarChart3,
  Calendar,
  Zap,
  DollarSign,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface PriceSuggestion {
  date: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  demandLevel: string;
  occupancyRate: number;
  reason: string;
}

interface RevenueProjection {
  current: number;
  projected: number;
  uplift: number;
}

interface PricingAnalysis {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  averageOccupancy: number;
  period: { from: string; to: string };
  suggestions: PriceSuggestion[];
  revenue: RevenueProjection;
}

interface OccupancyDay {
  date: string;
  occupancyRate: number;
  revenue: number;
}

interface RoomTypeItem {
  id: string;
  name: string;
  basePriceDaily: number;
  totalRooms: number;
  isActive: boolean;
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getDemandColor(level: string) {
  switch (level) {
    case 'PEAK': return 'text-red-600 bg-red-50 border-red-200';
    case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getDemandDotColor(level: string) {
  switch (level) {
    case 'PEAK': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-blue-500';
    case 'LOW': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
}

// ============================================
// Page Component
// ============================================

export default function SmartPricingPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;

  // Controls
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<number>(14); // days ahead
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'suggestions' | 'forecast'>('suggestions');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Date computation
  const today = new Date();
  const fromDate = today.toISOString().split('T')[0];
  const toDate = new Date(today.getTime() + dateRange * 86400000).toISOString().split('T')[0];

  // Queries
  const { data: roomTypesData } = useQuery<{ adminRoomTypes: RoomTypeItem[] }>(GET_ADMIN_ROOM_TYPES, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const roomTypes = (roomTypesData?.adminRoomTypes ?? []) as RoomTypeItem[];

  // Auto-select first room type
  if (!selectedRoomTypeId && roomTypes.length > 0) {
    setSelectedRoomTypeId(roomTypes[0].id);
  }

  const { data: pricingData, loading: pricingLoading, refetch: refetchPricing } = useQuery<{
    priceSuggestions: PricingAnalysis;
  }>(GET_PRICE_SUGGESTIONS, {
    variables: {
      input: { roomTypeId: selectedRoomTypeId, fromDate, toDate },
    },
    skip: !selectedRoomTypeId,
  });

  const { data: forecastData, loading: forecastLoading } = useQuery<{
    occupancyForecast: OccupancyDay[];
  }>(GET_OCCUPANCY_FORECAST, {
    variables: {
      input: { hotelId, days: dateRange },
    },
    skip: !hotelId || activeTab !== 'forecast',
  });

  // Mutation
  const [applyPrices, { loading: applying }] = useMutation<{
    applyPriceSuggestions: { applied: number; skipped: number };
  }>(APPLY_PRICE_SUGGESTIONS, {
    onCompleted: (data) => {
      const { applied, skipped } = data.applyPriceSuggestions;
      setToast({
        message: `Applied ${applied} price change${applied !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
        type: 'success',
      });
      setSelectedSuggestions(new Set());
      refetchPricing();
      setTimeout(() => setToast(null), 4000);
    },
    onError: (err) => {
      setToast({ message: `Failed: ${err.message}`, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    },
  });

  const analysis = pricingData?.priceSuggestions ?? null;
  const forecast = forecastData?.occupancyForecast ?? [];

  // Computed stats
  const stats = useMemo(() => {
    if (!analysis) return null;
    const { suggestions, revenue } = analysis;
    const increases = suggestions.filter((s) => s.changePercent > 0);
    const decreases = suggestions.filter((s) => s.changePercent < 0);
    const peakDays = suggestions.filter((s) => s.demandLevel === 'PEAK' || s.demandLevel === 'HIGH');

    return {
      totalDays: suggestions.length,
      increases: increases.length,
      decreases: decreases.length,
      unchanged: suggestions.length - increases.length - decreases.length,
      peakDays: peakDays.length,
      revenueUplift: revenue.uplift,
      revenueUpliftPercent: revenue.current > 0
        ? ((revenue.uplift / revenue.current) * 100).toFixed(1)
        : '0.0',
      projectedRevenue: revenue.projected,
      currentRevenue: revenue.current,
    };
  }, [analysis]);

  // Selection helpers
  const toggleSuggestion = (date: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const selectAll = () => {
    if (!analysis) return;
    const allDates = new Set(analysis.suggestions.filter((s) => s.changePercent !== 0).map((s) => s.date));
    setSelectedSuggestions(allDates);
  };

  const selectNone = () => setSelectedSuggestions(new Set());

  const handleApplySelected = () => {
    if (!analysis || selectedSuggestions.size === 0) return;
    const toApply = analysis.suggestions
      .filter((s) => selectedSuggestions.has(s.date))
      .map((s) => ({ date: s.date, price: s.suggestedPrice }));

    applyPrices({
      variables: {
        input: {
          roomTypeId: analysis.roomTypeId,
          suggestions: toApply,
        },
      },
    });
  };

  const handleApplyAll = () => {
    if (!analysis) return;
    const toApply = analysis.suggestions
      .filter((s) => s.changePercent !== 0)
      .map((s) => ({ date: s.date, price: s.suggestedPrice }));

    applyPrices({
      variables: {
        input: {
          roomTypeId: analysis.roomTypeId,
          suggestions: toApply,
        },
      },
    });
  };

  // ============================================
  // Render
  // ============================================

  if (!hotelId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        <p>No hotel assigned to your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all',
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-600" />
            Smart Pricing Engine
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered dynamic pricing based on demand patterns, occupancy, and seasonality
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        {/* Room Type Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Room Type</label>
          <select
            value={selectedRoomTypeId || ''}
            onChange={(e) => {
              setSelectedRoomTypeId(e.target.value);
              setSelectedSuggestions(new Set());
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} — {formatCurrency(rt.basePriceDaily)}/night
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Forecast Period</label>
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(Number(e.target.value));
              setSelectedSuggestions(new Set());
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetchPricing()}
          disabled={pricingLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {pricingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Analyze
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              Period
            </div>
            <div className="text-lg font-bold text-gray-900">{stats.totalDays} days</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.peakDays} peak/high demand
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Price Changes
            </div>
            <div className="text-lg font-bold text-gray-900">
              <span className="text-green-600">↑{stats.increases}</span>
              {' / '}
              <span className="text-red-600">↓{stats.decreases}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{stats.unchanged} unchanged</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Current Revenue
            </div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(stats.currentRevenue)}</div>
            <div className="text-xs text-gray-400 mt-1">at current prices</div>
          </div>

          <div className={cn(
            'rounded-xl border p-4',
            stats.revenueUplift >= 0
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200',
          )}>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Activity className="w-4 h-4" />
              Projected Impact
            </div>
            <div className={cn(
              'text-lg font-bold',
              stats.revenueUplift >= 0 ? 'text-green-700' : 'text-amber-700',
            )}>
              {stats.revenueUplift >= 0 ? '+' : ''}{formatCurrency(stats.revenueUplift)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.revenueUpliftPercent}% estimated change
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={cn(
              'pb-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'suggestions'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <Brain className="w-4 h-4 inline mr-1" />
            Price Suggestions
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={cn(
              'pb-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'forecast'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Occupancy Forecast
          </button>
        </nav>
      </div>

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {analysis && analysis.suggestions.some((s) => s.changePercent !== 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Select All Changes
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={selectNone}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Selection
                </button>
                {selectedSuggestions.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedSuggestions.size} selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleApplySelected}
                  disabled={selectedSuggestions.size === 0 || applying}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Apply Selected ({selectedSuggestions.size})
                </button>
                <button
                  onClick={handleApplyAll}
                  disabled={applying}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Apply All
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {pricingLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Analyzing demand patterns...</p>
              </div>
            </div>
          )}

          {/* Suggestions Table */}
          {analysis && !pricingLoading && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedSuggestions.size > 0 &&
                            selectedSuggestions.size ===
                              analysis.suggestions.filter((s) => s.changePercent !== 0).length
                          }
                          onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Demand
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Current
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Suggested
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Change
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Occupancy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.suggestions.map((s) => {
                      const isSelected = selectedSuggestions.has(s.date);
                      const isIncrease = s.changePercent > 0;
                      const isDecrease = s.changePercent < 0;

                      return (
                        <tr
                          key={s.date}
                          className={cn(
                            'hover:bg-gray-50 transition-colors',
                            isSelected && 'bg-purple-50',
                          )}
                        >
                          <td className="px-4 py-3">
                            {s.changePercent !== 0 && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSuggestion(s.date)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(s.date)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                                getDemandColor(s.demandLevel),
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', getDemandDotColor(s.demandLevel))} />
                              {s.demandLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatCurrency(s.currentPrice)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              'text-sm font-semibold',
                              isIncrease ? 'text-green-700' : isDecrease ? 'text-amber-700' : 'text-gray-600',
                            )}>
                              {formatCurrency(s.suggestedPrice)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.changePercent === 0 ? (
                              <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                <Minus className="w-3 h-3" /> —
                              </span>
                            ) : (
                              <span className={cn(
                                'text-xs font-medium flex items-center justify-end gap-1',
                                isIncrease ? 'text-green-600' : 'text-amber-600',
                              )}>
                                {isIncrease ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {isIncrease ? '+' : ''}{s.changePercent.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-gray-600">
                              {(s.occupancyRate * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500 line-clamp-1">
                              {s.reason || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!analysis && !pricingLoading && (
            <div className="text-center py-16 text-gray-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a room type and click Analyze to get pricing suggestions</p>
            </div>
          )}
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          {forecastLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading occupancy forecast...</p>
              </div>
            </div>
          )}

          {forecast.length > 0 && !forecastLoading && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Occupancy Forecast — Next {dateRange} Days
              </h3>

              {/* Bar Chart */}
              <div className="space-y-2">
                {forecast.map((day) => {
                  const pct = Math.round(day.occupancyRate * 100);
                  const barColor = pct >= 85
                    ? 'bg-red-500'
                    : pct >= 60
                      ? 'bg-orange-500'
                      : pct >= 30
                        ? 'bg-blue-500'
                        : 'bg-green-500';

                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                        {formatShortDate(day.date)}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', barColor)}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-12 text-right">
                        {pct}%
                      </span>
                      <span className="text-xs text-gray-400 w-24 text-right">
                        {formatCurrency(day.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-full bg-green-500" /> 0-30%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> 30-60%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-full bg-orange-500" /> 60-85%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-full bg-red-500" /> 85%+
                </div>
              </div>
            </div>
          )}

          {forecast.length === 0 && !forecastLoading && (
            <div className="text-center py-16 text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No forecast data available</p>
            </div>
          )}
        </div>
      )}

      {/* Demand Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">How Smart Pricing Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">LOW demand:</span> Reduced prices to attract bookings during slow periods
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">MEDIUM demand:</span> Moderate adjustments based on day-of-week patterns
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">HIGH demand:</span> Premium pricing for high-occupancy periods
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">PEAK demand:</span> Maximum pricing during peak seasons and events
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
