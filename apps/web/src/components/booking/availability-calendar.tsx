'use client';

/**
 * Availability Calendar - Hotel Manager
 * 
 * Visual month calendar showing room availability and pricing per night.
 * Used in the hotel detail / rooms page so guests can visually pick dates.
 * 
 * Features:
 *   - Month navigation with animated transitions
 *   - Color-coded availability: green = available, red = closed, gray = past
 *   - Per-night pricing shown on each cell
 *   - Date range selection for check-in/check-out
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  differenceInDays,
} from 'date-fns';

// GraphQL query to fetch room inventory for a date range
const GET_ROOM_AVAILABILITY_CALENDAR = gql`
  query GetAvailabilityCalendar(
    $roomTypeId: ID!
    $startDate: DateTime!
    $endDate: DateTime!
  ) {
    availabilityCalendar(
      roomTypeId: $roomTypeId
      startDate: $startDate
      endDate: $endDate
    ) {
      roomTypeId
      roomTypeName
      basePriceDaily
      totalRooms
      calendar {
        date
        available
        price
        isClosed
      }
    }
  }
`;

interface AvailabilityCalendarProps {
  roomTypeId: string;
  basePrice: number;
  totalRooms: number;
  onDateRangeSelect?: (checkIn: string, checkOut: string) => void;
  selectedCheckIn?: string;
  selectedCheckOut?: string;
  minStayNights?: number;
}

interface DayData {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  available: number;
  price: number;
  isClosed: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailabilityCalendar({
  roomTypeId,
  basePrice,
  totalRooms,
  onDateRangeSelect,
  selectedCheckIn,
  selectedCheckOut,
  minStayNights = 1,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);
  const [localCheckIn, setLocalCheckIn] = useState<Date | null>(
    selectedCheckIn ? new Date(selectedCheckIn) : null
  );
  const [localCheckOut, setLocalCheckOut] = useState<Date | null>(
    selectedCheckOut ? new Date(selectedCheckOut) : null
  );

  // Fetch inventory for the displayed month (with buffer for week overlap)
  const startDate = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
  const endDate = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');

  const { data, loading } = useQuery<any>(GET_ROOM_AVAILABILITY_CALENDAR, {
    variables: { roomTypeId, startDate, endDate },
    fetchPolicy: 'cache-and-network',
  });

  // Build inventory map from query results
  const inventoryMap = useMemo(() => {
    const map = new Map<string, { available: number; price: number; isClosed: boolean }>();
    
    if (data?.availabilityCalendar?.calendar) {
      for (const day of data.availabilityCalendar.calendar) {
        map.set(day.date.slice(0, 10), {
          available: day.available,
          price: day.price ?? basePrice,
          isClosed: day.isClosed,
        });
      }
    }
    
    return map;
  }, [data, basePrice]);

  // Generate calendar grid
  const calendarDays = useMemo((): DayData[][] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weeks: DayData[][] = [];
    let current = gridStart;
    
    while (current <= gridEnd) {
      const week: DayData[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const inv = inventoryMap.get(dateStr);
        const isCurrentMonth = isSameMonth(current, currentMonth);
        const isPast = isBefore(current, today);
        
        const isCheckIn = localCheckIn ? isSameDay(current, localCheckIn) : false;
        const isCheckOut = localCheckOut ? isSameDay(current, localCheckOut) : false;
        const isSelected = isCheckIn || isCheckOut;
        
        let isInRange = false;
        if (localCheckIn && localCheckOut) {
          isInRange = isAfter(current, localCheckIn) && isBefore(current, localCheckOut);
        } else if (localCheckIn && hoverDate && !selectingCheckIn) {
          isInRange = isAfter(current, localCheckIn) && isBefore(current, hoverDate);
        }
        
        week.push({
          date: new Date(current),
          dateStr,
          isCurrentMonth,
          isPast,
          isToday: isSameDay(current, today),
          available: inv?.available ?? totalRooms,
          price: inv?.price ?? basePrice,
          isClosed: inv?.isClosed ?? false,
          isSelected,
          isInRange,
          isCheckIn,
          isCheckOut,
        });
        
        current = addDays(current, 1);
      }
      
      weeks.push(week);
    }
    
    return weeks;
  }, [currentMonth, inventoryMap, totalRooms, basePrice, localCheckIn, localCheckOut, hoverDate, selectingCheckIn]);

  // Handle date click
  const handleDateClick = useCallback((day: DayData) => {
    if (day.isPast || day.isClosed || !day.isCurrentMonth) return;
    if (day.available <= 0) return;
    
    if (selectingCheckIn) {
      setLocalCheckIn(day.date);
      setLocalCheckOut(null);
      setSelectingCheckIn(false);
    } else {
      if (localCheckIn && isAfter(day.date, localCheckIn)) {
        const nights = differenceInDays(day.date, localCheckIn);
        if (nights >= minStayNights) {
          setLocalCheckOut(day.date);
          setSelectingCheckIn(true);
          
          // Notify parent
          if (onDateRangeSelect) {
            onDateRangeSelect(
              format(localCheckIn, 'yyyy-MM-dd'),
              format(day.date, 'yyyy-MM-dd')
            );
          }
        }
      } else {
        // Clicked before check-in — reset
        setLocalCheckIn(day.date);
        setLocalCheckOut(null);
        setSelectingCheckIn(false);
      }
    }
  }, [selectingCheckIn, localCheckIn, minStayNights, onDateRangeSelect]);

  const goToPreviousMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (!isBefore(endOfMonth(prev), new Date())) {
      setCurrentMonth(prev);
    }
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`;
    }
    return `₹${price}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h3 className="font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* Selection hint */}
      <div className="px-4 py-2 text-xs text-center text-gray-500 bg-gray-50/50 border-b border-gray-100">
        {!localCheckIn ? 'Select check-in date' : 
         !localCheckOut ? 'Select check-out date' :
         `${differenceInDays(localCheckOut, localCheckIn)} night${differenceInDays(localCheckOut, localCheckIn) > 1 ? 's' : ''} selected`}
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={format(currentMonth, 'yyyy-MM')}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {calendarDays.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7">
                {week.map((day) => {
                  const isDisabled = day.isPast || !day.isCurrentMonth || day.isClosed || day.available <= 0;
                  
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => handleDateClick(day)}
                      onMouseEnter={() => !selectingCheckIn && setHoverDate(day.date)}
                      onMouseLeave={() => setHoverDate(null)}
                      disabled={isDisabled}
                      className={`
                        relative h-16 border-b border-r border-gray-50 p-1
                        flex flex-col items-center justify-center gap-0.5
                        text-sm transition-colors
                        ${!day.isCurrentMonth ? 'opacity-30' : ''}
                        ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${day.isClosed ? 'bg-red-50 text-red-300 cursor-not-allowed' : ''}
                        ${day.available <= 0 && !day.isClosed && !day.isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                        ${day.isCheckIn ? 'bg-brand-600 text-white rounded-l-lg' : ''}
                        ${day.isCheckOut ? 'bg-brand-600 text-white rounded-r-lg' : ''}
                        ${day.isInRange ? 'bg-brand-50 text-brand-700' : ''}
                        ${!isDisabled && !day.isSelected && !day.isInRange ? 'hover:bg-brand-50 cursor-pointer' : ''}
                        ${day.isToday && !day.isSelected ? 'ring-1 ring-inset ring-brand-400' : ''}
                      `}
                    >
                      <span className={`text-sm font-medium ${day.isSelected ? 'text-white' : ''}`}>
                        {format(day.date, 'd')}
                      </span>
                      
                      {day.isCurrentMonth && !day.isPast && !day.isClosed && day.available > 0 && (
                        <span className={`text-[10px] leading-none ${
                          day.isSelected ? 'text-white/80' : 'text-gray-400'
                        }`}>
                          {formatPrice(day.price)}
                        </span>
                      )}
                      
                      {day.isClosed && day.isCurrentMonth && (
                        <span className="text-[9px] text-red-400">Closed</span>
                      )}
                      
                      {day.available <= 0 && !day.isClosed && day.isCurrentMonth && !day.isPast && (
                        <span className="text-[9px] text-gray-400">Sold out</span>
                      )}
                      
                      {day.available > 0 && day.available <= 3 && day.isCurrentMonth && !day.isPast && !day.isClosed && !day.isSelected && (
                        <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" title={`${day.available} left`} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-gray-100 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-brand-600" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-brand-50 border border-brand-100" /> In range
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Few left
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100" /> Sold out
        </span>
      </div>
    </div>
  );
}
