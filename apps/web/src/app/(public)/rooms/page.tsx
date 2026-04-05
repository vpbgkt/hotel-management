'use client';

/**
 * Hotel Tenant — Rooms Listing Page
 * Shows all available rooms with filters, animations, and booking options
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Users,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Bath,
  Mountain,
  Star,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/tenant/tenant-context';
import { CHECK_DAILY_AVAILABILITY } from '@/lib/graphql/queries/rooms';
import { AvailabilityCalendar } from '@/components/booking/availability-calendar';

/* ─── Scroll reveal hook ─── */
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  ac: <Wind className="w-4 h-4" />,
  tv: <Tv className="w-4 h-4" />,
  minibar: <Coffee className="w-4 h-4" />,
  'room-service': <Coffee className="w-4 h-4" />,
  'ocean-view': <Mountain className="w-4 h-4" />,
  balcony: <Mountain className="w-4 h-4" />,
  bathtub: <Bath className="w-4 h-4" />,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Smart TV',
  minibar: 'Mini Bar',
  'room-service': 'Room Service',
  'ocean-view': 'Ocean View',
  balcony: 'Private Balcony',
  bathtub: 'Bathtub',
  safe: 'Safe',
  breakfast: 'Breakfast',
};

export default function TenantRoomsPage() {
  const { hotel, loading: hotelLoading, theme } = useTenant();
  const searchParams = useSearchParams();

  const [checkIn, setCheckIn] = useState(
    searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd')
  );
  const [checkOut, setCheckOut] = useState(
    searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [guestCount, setGuestCount] = useState(
    Number(searchParams.get('guests')) || 2
  );
  const [bookingMode, setBookingMode] = useState<'DAILY' | 'HOURLY'>('DAILY');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'guests' | 'name'>('price');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarRoomId, setCalendarRoomId] = useState<string | null>(null);

  const nights = Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: availData } = useQuery<any>(CHECK_DAILY_AVAILABILITY, {
    variables: {
      input: {
        hotelId: hotel?.id,
        checkIn,
        checkOut,
        numRooms: 1,
      },
    },
    skip: !hotel?.id,
    fetchPolicy: 'cache-and-network',
  });

  const availabilityMap = useMemo(() => {
    const map: Record<string, { isAvailable: boolean; totalPrice: number; pricePerNight: number }> = {};
    if (availData?.checkDailyAvailability) {
      const result = availData.checkDailyAvailability;
      [...(result.roomTypes || []), ...(result.unavailableRoomTypes || [])].forEach((rt: { roomType: { id: string }; isAvailable: boolean; totalPrice: number; pricePerNight: number }) => {
        map[rt.roomType.id] = {
          isAvailable: rt.isAvailable,
          totalPrice: rt.totalPrice || 0,
          pricePerNight: rt.pricePerNight || 0,
        };
      });
    }
    return map;
  }, [availData]);

  const activeRooms = useMemo(() => {
    const rooms = (hotel?.roomTypes || []).filter((r) => r.isActive);
    return rooms.sort((a, b) => {
      if (sortBy === 'price') return a.basePriceDaily - b.basePriceDaily;
      if (sortBy === 'guests') return b.maxGuests - a.maxGuests;
      return a.name.localeCompare(b.name);
    });
  }, [hotel?.roomTypes, sortBy]);

  if (hotelLoading || !hotel) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse mb-8" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-50 rounded-2xl animate-pulse mb-6" />
          ))}
        </div>
      </div>
    );
  }

  const showHourlyToggle = hotel.bookingModel === 'BOTH';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Animated Hero Header ─── */}
      <section
        className="relative py-16 md:py-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'}, ${theme.secondaryColor || '#1e40af'})`,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div style={{ animation: 'slide-up 0.6s ease-out' }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 text-sm px-4 py-1.5 rounded-full mb-4 border border-white/10">
              <Sparkles className="w-4 h-4" />
              {activeRooms.length} room type{activeRooms.length !== 1 ? 's' : ''} available
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight">
              Rooms & Suites
            </h1>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              Find your perfect room at {hotel.name}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Glass Search Bar ─── */}
      <div className="relative z-10 -mt-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              {showHourlyToggle && (
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setBookingMode('DAILY')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingMode === 'DAILY' ? 'bg-white shadow-sm text-gray-900 scale-105' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-1.5" />
                    Daily
                  </button>
                  <button
                    onClick={() => setBookingMode('HOURLY')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingMode === 'HOURLY' ? 'bg-white shadow-sm text-gray-900 scale-105' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-1.5" />
                    Hourly
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="pl-10 pr-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all w-[150px]"
                  />
                </div>
                <span className="text-gray-300">→</span>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                    className="pl-10 pr-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all w-[150px]"
                  />
                </div>
                <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                  {nights} night{nights > 1 ? 's' : ''}
                </span>
              </div>

              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="pl-10 pr-3 py-2.5 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-sm bg-transparent border-0 focus:outline-none text-gray-600 font-medium"
                >
                  <option value="price">Price</option>
                  <option value="guests">Capacity</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Room Cards ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Availability Calendar Toggle */}
        {activeRooms.length > 0 && bookingMode === 'DAILY' && (
          <div className="mb-8">
            <button
              onClick={() => {
                setShowCalendar(!showCalendar);
                if (!calendarRoomId && activeRooms[0]) {
                  setCalendarRoomId(activeRooms[0].id);
                }
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline transition-colors"
              style={{ color: theme.primaryColor || '#2563eb' }}
            >
              <Calendar className="w-4 h-4" />
              {showCalendar ? 'Hide availability calendar' : 'View availability calendar'}
            </button>

            {showCalendar && calendarRoomId && (
              <div className="mt-4 max-w-md" style={{ animation: 'slide-up 0.3s ease-out' }}>
                {activeRooms.length > 1 && (
                  <div className="mb-3">
                    <select
                      value={calendarRoomId}
                      onChange={(e) => setCalendarRoomId(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-500 w-full"
                    >
                      {activeRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} — ₹{room.basePriceDaily.toLocaleString('en-IN')}/night
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <AvailabilityCalendar
                  roomTypeId={calendarRoomId}
                  basePrice={activeRooms.find(r => r.id === calendarRoomId)?.basePriceDaily || 0}
                  totalRooms={activeRooms.find(r => r.id === calendarRoomId)?.totalRooms || 1}
                  selectedCheckIn={checkIn}
                  selectedCheckOut={checkOut}
                  onDateRangeSelect={(ci, co) => {
                    setCheckIn(ci);
                    setCheckOut(co);
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          {activeRooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              hotel={hotel}
              theme={theme}
              index={index}
              nights={nights}
              checkIn={checkIn}
              checkOut={checkOut}
              guestCount={guestCount}
              avail={availabilityMap[room.id]}
              isExpanded={expandedRoom === room.id}
              onToggleExpand={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
            />
          ))}
        </div>

        {activeRooms.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 text-lg font-medium">No rooms available at the moment</p>
            <p className="text-gray-400 mt-2">Please contact us for more information.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Animated Room Card ─── */
function RoomCard({
  room, hotel, theme, index, nights, checkIn, checkOut, guestCount, avail, isExpanded, onToggleExpand,
}: {
  room: any; hotel: any; theme: any; index: number; nights: number;
  checkIn: string; checkOut: string; guestCount: number;
  avail?: { isAvailable: boolean; totalPrice: number; pricePerNight: number };
  isExpanded: boolean; onToggleExpand: () => void;
}) {
  const { ref, isVisible } = useScrollReveal(0.05);
  const isAvailable = avail?.isAvailable !== false;
  const images = room.images || [];

  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-700 hover:shadow-xl ${
        !isAvailable ? 'opacity-60' : ''
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* Image with hover zoom */}
        <div className="relative h-64 md:h-full min-h-[240px] overflow-hidden group">
          {images[0] ? (
            <Image
              src={images[0]}
              alt={room.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
              +{images.length - 1} photos
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <Badge variant="destructive" className="text-sm px-4 py-1.5 rounded-full">
                Sold Out
              </Badge>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="md:col-span-2 p-6 md:p-8 flex flex-col">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{room.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg">
                    <Users className="w-4 h-4" />
                    {room.maxGuests} guests
                  </span>
                  {room.maxExtraGuests > 0 && (
                    <span className="text-xs">(+{room.maxExtraGuests} extra at ₹{room.extraGuestCharge}/night)</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  ₹{(avail?.pricePerNight || room.basePriceDaily).toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-gray-500">/night</div>
                {nights > 1 && avail?.totalPrice && (
                  <div className="text-sm text-gray-400 mt-0.5">
                    ₹{avail.totalPrice.toLocaleString('en-IN')} total
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-500 mb-4 line-clamp-2 leading-relaxed">
              {room.description || 'A comfortable and well-appointed room for a relaxing stay.'}
            </p>

            {/* Amenities with stagger */}
            <div className="flex flex-wrap gap-2 mb-4">
              {room.amenities.slice(0, 6).map((a: string, i: number) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  {AMENITY_ICONS[a] || <Check className="w-3.5 h-3.5" />}
                  {AMENITY_LABELS[a] || a}
                </span>
              ))}
              {room.amenities.length > 6 && (
                <button
                  onClick={onToggleExpand}
                  className="text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ color: theme.primaryColor || '#2563eb' }}
                >
                  {isExpanded ? 'Show less' : `+${room.amenities.length - 6} more`}
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="flex flex-wrap gap-2 mb-4" style={{ animation: 'slide-up 0.2s ease-out' }}>
                {room.amenities.slice(6).map((a: string) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-xl font-medium"
                  >
                    {AMENITY_ICONS[a] || <Check className="w-3.5 h-3.5" />}
                    {AMENITY_LABELS[a] || a}
                  </span>
                ))}
              </div>
            )}

            {hotel.bookingModel !== 'DAILY' && room.basePriceHourly && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl inline-flex mb-3">
                <Clock className="w-4 h-4" />
                Hourly: ₹{room.basePriceHourly.toLocaleString('en-IN')}/hr (min {hotel.hourlyMinHours || 3} hrs)
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto pt-5 border-t border-gray-100">
            <Link href={`/rooms/${room.id}`} className="flex-1">
              <Button variant="outline" className="w-full rounded-xl hover:scale-[1.02] transition-transform">
                View Details
              </Button>
            </Link>
            {isAvailable ? (
              <Link
                href={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guestCount}`}
                className="flex-1"
              >
                <Button
                  className="w-full rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                  style={{ backgroundColor: theme.primaryColor || undefined }}
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Button className="flex-1 rounded-xl" disabled>
                Sold Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
