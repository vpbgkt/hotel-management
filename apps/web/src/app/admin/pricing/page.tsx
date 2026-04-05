'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  GET_ADMIN_ROOM_TYPES,
  GET_ADMIN_INVENTORY_CALENDAR,
  BULK_UPDATE_INVENTORY,
  UPDATE_DATE_INVENTORY,
} from '@/lib/graphql/queries/admin';

interface CalendarDay {
  date: string;
  available: number;
  price: number;
  basePrice: number;
  isClosed: boolean;
  minStayNights: number;
  hasCustomPrice: boolean;
  hasCustomAvailability: boolean;
}

interface InventoryCalendar {
  roomTypeId: string;
  roomTypeName: string;
  basePriceDaily: number;
  totalRooms: number;
  calendar: CalendarDay[];
}

interface RoomTypeItem {
  id: string;
  name: string;
  basePriceDaily: number;
  totalRooms: number;
  isActive: boolean;
}

// ============================================
// Helper functions
// ============================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthDates(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

function getDayOfWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PricingCalendarPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;

  // Calendar navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);

  // Selection state for bulk operations
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  // Bulk update form
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkAvailable, setBulkAvailable] = useState('');
  const [bulkClosed, setBulkClosed] = useState<boolean | null>(null);
  const [bulkMinStay, setBulkMinStay] = useState('');

  // Single date edit
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editAvailable, setEditAvailable] = useState('');
  const [editClosed, setEditClosed] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Month date range
  const { start: monthStart, end: monthEnd } = useMemo(
    () => getMonthDates(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // Queries
  const { data: roomTypesData } = useQuery<{ adminRoomTypes: RoomTypeItem[] }>(GET_ADMIN_ROOM_TYPES, {
    variables: { hotelId },
    skip: !hotelId,
  });

  // Auto-select first room type
  const firstRoomTypeId = (roomTypesData?.adminRoomTypes as RoomTypeItem[] | undefined)?.[0]?.id;
  if (!selectedRoomTypeId && firstRoomTypeId) {
    setSelectedRoomTypeId(firstRoomTypeId);
  }

  const { data: calendarData, loading: calendarLoading, refetch: refetchCalendar } = useQuery<{ adminInventoryCalendar: InventoryCalendar }>(
    GET_ADMIN_INVENTORY_CALENDAR,
    {
      variables: {
        roomTypeId: selectedRoomTypeId,
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      },
      skip: !selectedRoomTypeId,
    },
  );

  // Mutations
  const [bulkUpdate, { loading: bulkUpdating }] = useMutation<{ bulkUpdateInventory: { success: boolean; message: string; daysUpdated: number } }>(BULK_UPDATE_INVENTORY);
  const [updateDate, { loading: dateUpdating }] = useMutation(UPDATE_DATE_INVENTORY);

  const roomTypes = (roomTypesData?.adminRoomTypes ?? []) as RoomTypeItem[];
  const calendar = (calendarData?.adminInventoryCalendar ?? null) as InventoryCalendar | null;

  // ============================================
  // Calendar grid
  // ============================================

  const calendarGrid = useMemo(() => {
    if (!calendar) return [];

    const firstDay = getDayOfWeek(calendar.calendar[0]?.date || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);
    const grid: (CalendarDay | null)[] = [];

    // Pad start with nulls
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }

    for (const day of calendar.calendar) {
      grid.push(day);
    }

    return grid;
  }, [calendar, currentYear, currentMonth]);

  // ============================================
  // Navigation
  // ============================================

  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDates(new Set());
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDates(new Set());
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDates(new Set());
  }, [today]);

  // ============================================
  // Date selection
  // ============================================

  const toggleDateSelection = useCallback((dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  }, []);

  const selectAllDates = useCallback(() => {
    if (!calendar) return;
    setSelectedDates(new Set(calendar.calendar.map((d) => d.date)));
  }, [calendar]);

  const selectWeekends = useCallback(() => {
    if (!calendar) return;
    const weekends = calendar.calendar.filter((d) => {
      const dow = getDayOfWeek(d.date);
      return dow === 0 || dow === 6;
    });
    setSelectedDates(new Set(weekends.map((d) => d.date)));
  }, [calendar]);

  const selectWeekdays = useCallback(() => {
    if (!calendar) return;
    const weekdays = calendar.calendar.filter((d) => {
      const dow = getDayOfWeek(d.date);
      return dow !== 0 && dow !== 6;
    });
    setSelectedDates(new Set(weekdays.map((d) => d.date)));
  }, [calendar]);

  const clearSelection = useCallback(() => {
    setSelectedDates(new Set());
    setShowBulkForm(false);
  }, []);

  // ============================================
  // Bulk update handler
  // ============================================

  const handleBulkUpdate = useCallback(async () => {
    if (!selectedRoomTypeId || selectedDates.size === 0) return;

    const sortedDates = Array.from(selectedDates).sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    const input: Record<string, unknown> = {
      roomTypeId: selectedRoomTypeId,
      startDate,
      endDate,
    };

    if (bulkPrice) input.priceOverride = parseFloat(bulkPrice);
    if (bulkAvailable) input.availableCount = parseInt(bulkAvailable);
    if (bulkClosed !== null) input.isClosed = bulkClosed;
    if (bulkMinStay) input.minStayNights = parseInt(bulkMinStay);

    try {
      const { data } = await bulkUpdate({ variables: { input } });
      if (data?.bulkUpdateInventory?.success) {
        setToast(`Updated ${data.bulkUpdateInventory.daysUpdated} days`);
        setTimeout(() => setToast(null), 3000);
        refetchCalendar();
        clearSelection();
        setBulkPrice('');
        setBulkAvailable('');
        setBulkClosed(null);
        setBulkMinStay('');
      }
    } catch (err) {
      setToast(`Error: ${(err as Error).message}`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [selectedRoomTypeId, selectedDates, bulkPrice, bulkAvailable, bulkClosed, bulkMinStay, bulkUpdate, refetchCalendar, clearSelection]);

  // ============================================
  // Single date update handler
  // ============================================

  const handleDateEdit = useCallback((day: CalendarDay) => {
    setEditingDate(day.date);
    setEditPrice(day.hasCustomPrice ? String(day.price) : '');
    setEditAvailable(String(day.available));
    setEditClosed(day.isClosed);
  }, []);

  const handleDateUpdate = useCallback(async () => {
    if (!editingDate || !selectedRoomTypeId) return;

    const input: Record<string, unknown> = {
      roomTypeId: selectedRoomTypeId,
      date: editingDate,
    };

    if (editPrice) input.priceOverride = parseFloat(editPrice);
    input.availableCount = parseInt(editAvailable);
    input.isClosed = editClosed;

    try {
      await updateDate({ variables: { input } });
      setToast('Date updated');
      setTimeout(() => setToast(null), 3000);
      setEditingDate(null);
      refetchCalendar();
    } catch (err) {
      setToast(`Error: ${(err as Error).message}`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [editingDate, selectedRoomTypeId, editPrice, editAvailable, editClosed, updateDate, refetchCalendar]);

  // ============================================
  // Render
  // ============================================

  if (!hotelId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No hotel assigned to your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing &amp; Availability</h1>
          <p className="text-sm text-gray-500 mt-1">Manage room pricing and availability calendar</p>
        </div>
      </div>

      {/* Room Type Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {roomTypes.filter((rt) => rt.isActive).map((rt) => (
            <button
              key={rt.id}
              onClick={() => {
                setSelectedRoomTypeId(rt.id);
                setSelectedDates(new Set());
                setShowBulkForm(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRoomTypeId === rt.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {rt.name}
              <span className="ml-2 text-xs opacity-75">
                {formatCurrency(rt.basePriceDaily)}/night
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 w-48 text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={goToToday} className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
              Today
            </button>
          </div>

          {/* Quick selection buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllDates}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Select All
            </button>
            <button
              onClick={selectWeekends}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Weekends
            </button>
            <button
              onClick={selectWeekdays}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Weekdays
            </button>
            {selectedDates.size > 0 && (
              <>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                >
                  Clear ({selectedDates.size})
                </button>
                <button
                  onClick={() => setShowBulkForm(true)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Bulk Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            <span>Custom Price</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            <span>Closed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span>Selected</span>
          </div>
        </div>

        {/* Calendar Grid */}
        {calendarLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday headers */}
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                {day}
              </div>
            ))}

            {/* Calendar cells */}
            {calendarGrid.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-24" />;
              }

              const isSelected = selectedDates.has(day.date);
              const isToday = day.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const dayNum = parseInt(day.date.split('-')[2]);

              let cellBg = 'bg-green-50 border-green-200 hover:bg-green-100';
              if (day.isClosed) {
                cellBg = 'bg-red-50 border-red-200 hover:bg-red-100';
              } else if (day.hasCustomPrice) {
                cellBg = 'bg-amber-50 border-amber-200 hover:bg-amber-100';
              }
              if (isSelected) {
                cellBg = 'bg-blue-100 border-blue-400 ring-2 ring-blue-300';
              }

              return (
                <div
                  key={day.date}
                  onClick={() => toggleDateSelection(day.date)}
                  onDoubleClick={() => handleDateEdit(day)}
                  className={`h-24 p-1.5 rounded-lg border cursor-pointer transition-all ${cellBg} ${
                    isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                  title={`Double-click to edit ${day.date}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                      {dayNum}
                    </span>
                    {day.isClosed && (
                      <span className="text-[10px] bg-red-200 text-red-700 px-1 rounded">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <div className={`text-sm font-bold ${day.hasCustomPrice ? 'text-amber-700' : 'text-gray-800'}`}>
                      {formatCurrency(day.price)}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {day.available} avail
                      {day.minStayNights > 1 && ` · ${day.minStayNights}N min`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Update Panel */}
      {showBulkForm && selectedDates.size > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Update — {selectedDates.size} date(s) selected
            </h3>
            <button
              onClick={() => setShowBulkForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Override (₹)
              </label>
              <input
                type="number"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="Leave empty to keep current"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available Rooms
              </label>
              <input
                type="number"
                value={bulkAvailable}
                onChange={(e) => setBulkAvailable(e.target.value)}
                placeholder="Leave empty to keep current"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Close Dates?
              </label>
              <select
                value={bulkClosed === null ? '' : bulkClosed ? 'true' : 'false'}
                onChange={(e) => setBulkClosed(e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No change</option>
                <option value="true">Close dates</option>
                <option value="false">Open dates</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stay Nights
              </label>
              <input
                type="number"
                value={bulkMinStay}
                onChange={(e) => setBulkMinStay(e.target.value)}
                placeholder="Leave empty to keep current"
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {bulkUpdating ? 'Updating...' : `Apply to ${selectedDates.size} date(s)`}
            </button>
            <button
              onClick={() => {
                setShowBulkForm(false);
                clearSelection();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Cancel
            </button>
          </div>

          {/* Selected dates preview */}
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from(selectedDates).sort().map((d) => (
              <span key={d} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Single Date Edit Modal */}
      {editingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingDate(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit {new Date(editingDate + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder={`Base: ${calendar ? formatCurrency(calendar.basePriceDaily) : ''}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to use base price ({calendar ? formatCurrency(calendar.basePriceDaily) : ''})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Rooms
                </label>
                <input
                  type="number"
                  value={editAvailable}
                  onChange={(e) => setEditAvailable(e.target.value)}
                  min={0}
                  max={calendar?.totalRooms ?? 100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-closed"
                  checked={editClosed}
                  onChange={(e) => setEditClosed(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="edit-closed" className="text-sm text-gray-700">
                  Close this date (no bookings allowed)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleDateUpdate}
                disabled={dateUpdating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {dateUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingDate(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {calendar && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Base Price</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(calendar.basePriceDaily)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Custom Prices</div>
            <div className="text-xl font-bold text-amber-600">
              {calendar.calendar.filter((d) => d.hasCustomPrice).length} days
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Closed Dates</div>
            <div className="text-xl font-bold text-red-600">
              {calendar.calendar.filter((d) => d.isClosed).length} days
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Avg Price This Month</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(
                calendar.calendar.reduce((sum, d) => sum + d.price, 0) / calendar.calendar.length,
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage instructions */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">Tips</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Click</strong> dates to select them for bulk editing</li>
          <li><strong>Double-click</strong> a date to edit it individually</li>
          <li>Use <strong>Select All</strong>, <strong>Weekends</strong>, or <strong>Weekdays</strong> for quick selection</li>
          <li>Dates with custom prices are highlighted in <span className="text-amber-600 font-medium">amber</span></li>
          <li>Closed dates appear in <span className="text-red-600 font-medium">red</span></li>
        </ul>
      </div>
    </div>
  );
}
