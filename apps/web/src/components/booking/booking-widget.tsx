'use client';

/**
 * Booking Widget Component
 * Sticky sidebar for room booking (daily or hourly)
 */

import { useState, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { format, addDays, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { CREATE_DAILY_BOOKING, CREATE_HOURLY_BOOKING } from '@/lib/graphql/mutations/bookings';
import { useAuth } from '@/lib/auth/auth-context';

interface BookingWidgetProps {
  hotelId: string;
  hotelName: string;
  hotelSlug: string;
  selectedRoom?: {
    id: string;
    name: string;
    basePriceDaily: number;
    basePriceHourly?: number | null;
    maxGuests: number;
    maxExtraGuests: number;
    extraGuestCharge: number;
  } | null;
  bookingModel: 'DAILY' | 'HOURLY' | 'BOTH';
  minStayNights?: number;
  minStayHours?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export function BookingWidget({
  hotelId,
  hotelName,
  hotelSlug,
  selectedRoom,
  bookingModel,
  minStayNights = 1,
  minStayHours = 3,
  checkInTime = '14:00',
  checkOutTime = '11:00',
}: BookingWidgetProps) {
  const [bookingType, setBookingType] = useState<'DAILY' | 'HOURLY'>(
    bookingModel === 'HOURLY' ? 'HOURLY' : 'DAILY'
  );
  
  // Daily booking state
  const [checkInDate, setCheckInDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  
  // Hourly booking state
  const [bookingDate, setBookingDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState<string>('14:00');
  const [hours, setHours] = useState<number>(minStayHours);
  
  // Auth context
  const { user } = useAuth();

  // Guest count
  const [guests, setGuests] = useState(2);
  const [extraGuests, setExtraGuests] = useState(0);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  
  // Mutations
  const [createDailyBooking, { loading: dailyLoading, error: dailyError }] = useMutation(CREATE_DAILY_BOOKING);
  const [createHourlyBooking, { loading: hourlyLoading, error: hourlyError }] = useMutation(CREATE_HOURLY_BOOKING);
  
  const loading = dailyLoading || hourlyLoading;
  const error = dailyError || hourlyError;

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedRoom) return null;
    
    if (bookingType === 'DAILY') {
      const nights = differenceInDays(new Date(checkOutDate), new Date(checkInDate));
      const roomTotal = selectedRoom.basePriceDaily * nights;
      const extraGuestTotal = extraGuests * selectedRoom.extraGuestCharge * nights;
      const subtotal = roomTotal + extraGuestTotal;
      const taxes = Math.round(subtotal * 0.18); // 18% GST
      const total = subtotal + taxes;
      
      return { type: 'DAILY' as const, nights, roomTotal, extraGuestTotal, subtotal, taxes, total };
    } else {
      const hourlyRate = selectedRoom.basePriceHourly || 0;
      const roomTotal = hourlyRate * hours;
      const extraGuestTotal = extraGuests * selectedRoom.extraGuestCharge;
      const subtotal = roomTotal + extraGuestTotal;
      const taxes = Math.round(subtotal * 0.18);
      const total = subtotal + taxes;
      
      return { type: 'HOURLY' as const, hours, roomTotal, extraGuestTotal, subtotal, taxes, total };
    }
  }, [selectedRoom, bookingType, checkInDate, checkOutDate, hours, extraGuests]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const handleBooking = async () => {
    if (!selectedRoom) return;
    
    // Default guest info for demo/guest mode
    const guestInfo = {
      name: user?.name || 'Guest User',
      email: user?.email || 'guest@example.com',
      phone: user?.phone || '9999999999',
    };
    
    try {
      if (bookingType === 'DAILY') {
        console.log('Creating daily booking with:', {
          hotelId,
          roomTypeId: selectedRoom.id,
          checkInDate,
          checkOutDate,
          numGuests: guests,
          numExtraGuests: extraGuests,
          guestInfo
        });

        const result = await createDailyBooking({
          variables: {
            input: {
              hotelId,
              roomTypeId: selectedRoom.id,
              checkInDate,
              checkOutDate,
              numGuests: guests,
              numExtraGuests: extraGuests,
              guestInfo
            }
          }
        });
        
        // Redirect to payment page
        const bookingData = result.data as { createDailyBooking?: { id: string } } | null;
        if (bookingData?.createDailyBooking?.id) {
          window.location.href = `/booking/${bookingData.createDailyBooking.id}/payment`;
        }
      } else {
        console.log('Creating hourly booking with:', {
          hotelId,
          roomTypeId: selectedRoom.id,
          date: bookingDate,
          checkInTime: startTime,
          numHours: hours,
          numGuests: guests,
          guestInfo
        });

        const result = await createHourlyBooking({
          variables: {
            input: {
              hotelId,
              roomTypeId: selectedRoom.id,
              date: bookingDate,
              checkInTime: startTime,
              numHours: hours,
              numGuests: guests,
              guestInfo
            }
          }
        });
        
        const bookingData = result.data as { createHourlyBooking?: { id: string } } | null;
        if (bookingData?.createHourlyBooking?.id) {
          window.location.href = `/booking/${bookingData.createHourlyBooking.id}/payment`;
        }
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
  };

  const canBook = selectedRoom && pricing && pricing.total > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg sticky top-24">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          {selectedRoom ? (
            <div>
              <p className="text-sm text-gray-500">Selected Room</p>
              <p className="font-semibold text-gray-900">{selectedRoom.name}</p>
            </div>
          ) : (
            <p className="text-gray-600">Select a room to book</p>
          )}
        </div>
        
        {/* Booking Type Toggle */}
        {bookingModel === 'BOTH' && (
          <div className="flex bg-gray-100 rounded-lg p-1 mt-3">
            <button
              onClick={() => setBookingType('DAILY')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                bookingType === 'DAILY'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-1.5" />
              Daily
            </button>
            <button
              onClick={() => setBookingType('HOURLY')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                bookingType === 'HOURLY'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-1.5" />
              Hourly
            </button>
          </div>
        )}
      </div>
      
      {/* Date/Time Inputs */}
      <div className="p-5 space-y-4">
        {bookingType === 'DAILY' ? (
          <>
            {/* Check-in Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-in
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    const newCheckIn = new Date(e.target.value);
                    const currentCheckOut = new Date(checkOutDate);
                    if (currentCheckOut <= newCheckIn) {
                      setCheckOutDate(format(addDays(newCheckIn, 1), 'yyyy-MM-dd'));
                    }
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Check-out Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={format(addDays(new Date(checkInDate), minStayNights), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Booking Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Duration (hours)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHours(Math.max(minStayHours, hours - 1))}
                  disabled={hours <= minStayHours}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  -
                </button>
                <span className="flex-1 text-center text-lg font-semibold">{hours} hrs</span>
                <button
                  onClick={() => setHours(Math.min(24, hours + 1))}
                  disabled={hours >= 24}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Guest Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Guests
          </label>
          <button
            onClick={() => setShowGuestSelector(!showGuestSelector)}
            className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{guests} guest{guests > 1 ? 's' : ''}</span>
              {extraGuests > 0 && (
                <span className="text-gray-500">(+{extraGuests} extra)</span>
              )}
            </span>
            {showGuestSelector ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <AnimatePresence>
            {showGuestSelector && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Guests</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        disabled={guests <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-medium">{guests}</span>
                      <button
                        onClick={() => setGuests(Math.min(selectedRoom?.maxGuests || 10, guests + 1))}
                        disabled={guests >= (selectedRoom?.maxGuests || 10)}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {selectedRoom && selectedRoom.maxExtraGuests > 0 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-700">Extra Guests</span>
                        <p className="text-xs text-gray-500">
                          +₹{selectedRoom.extraGuestCharge}/night each
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))}
                          disabled={extraGuests <= 0}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-medium">{extraGuests}</span>
                        <button
                          onClick={() => setExtraGuests(Math.min(selectedRoom.maxExtraGuests, extraGuests + 1))}
                          disabled={extraGuests >= selectedRoom.maxExtraGuests}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Pricing Summary */}
      {selectedRoom && pricing && (
        <div className="px-5 pb-5">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                ₹{pricing.type === 'DAILY' ? selectedRoom.basePriceDaily.toLocaleString('en-IN') : (selectedRoom.basePriceHourly || 0).toLocaleString('en-IN')} × {pricing.type === 'DAILY' ? `${pricing.nights} night${pricing.nights > 1 ? 's' : ''}` : `${pricing.hours} hour${pricing.hours > 1 ? 's' : ''}`}
              </span>
              <span className="text-gray-900">₹{pricing.roomTotal.toLocaleString('en-IN')}</span>
            </div>
            
            {pricing.extraGuestTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Extra guests</span>
                <span className="text-gray-900">₹{pricing.extraGuestTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Taxes (18% GST)</span>
              <span className="text-gray-900">₹{pricing.taxes.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">₹{pricing.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error.message}</span>
          </div>
        </div>
      )}
      
      {/* Book Button */}
      <div className="p-5 pt-0">
        <Button
          onClick={handleBooking}
          disabled={!canBook || loading}
          className="w-full py-3 text-base"
          size="lg"
        >
          {loading ? 'Booking...' : selectedRoom ? 'Continue to Payment' : 'Select a Room'}
        </Button>
        
        <p className="text-xs text-center text-gray-500 mt-3">
          You won&apos;t be charged yet
        </p>
      </div>
      
      {/* Hotel Info */}
      {bookingType === 'DAILY' && (
        <div className="px-5 pb-5 text-xs text-gray-500">
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span>Check-in</span>
            <span>{checkInTime}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span>Check-out</span>
            <span>{checkOutTime}</span>
          </div>
        </div>
      )}
    </div>
  );
}
