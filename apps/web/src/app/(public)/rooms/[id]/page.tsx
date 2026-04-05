'use client';

/**
 * Hotel Tenant — Room Detail Page
 * Shows room details with image gallery, amenities, and booking widget
 */

import { useState, useMemo, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Bath,
  Mountain,
  Star,
  ArrowLeft,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/tenant/tenant-context';
import { GET_TENANT_ROOM_DETAIL } from '@/lib/graphql/queries/tenant';
import { BookingWidget } from '@/components/booking/booking-widget';

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-5 h-5" />,
  ac: <Wind className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  minibar: <Coffee className="w-5 h-5" />,
  'room-service': <Coffee className="w-5 h-5" />,
  'ocean-view': <Mountain className="w-5 h-5" />,
  balcony: <Maximize2 className="w-5 h-5" />,
  bathtub: <Bath className="w-5 h-5" />,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Smart TV',
  minibar: 'Mini Bar',
  'room-service': '24/7 Room Service',
  'ocean-view': 'Ocean View',
  balcony: 'Private Balcony',
  bathtub: 'Luxury Bathtub',
  safe: 'In-room Safe',
  breakfast: 'Breakfast Included',
  parking: 'Free Parking',
  laundry: 'Laundry Service',
  iron: 'Iron & Board',
  hairdryer: 'Hair Dryer',
  kettle: 'Electric Kettle',
  desk: 'Work Desk',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TenantRoomDetailPage({ params }: PageProps) {
  const { id: roomId } = use(params);
  const { hotel, loading: hotelLoading, theme } = useTenant();
  const searchParams = useSearchParams();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading } = useQuery<any>(GET_TENANT_ROOM_DETAIL, {
    variables: { id: roomId },
    skip: !roomId,
  });
  const room = data?.roomType;

  if (loading || hotelLoading) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded-xl animate-pulse mb-6" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!room || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h1>
          <Link href="/rooms">
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] = room.images || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/rooms" className="hover:text-gray-700">Rooms</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{room.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              {/* Main Image */}
              <div className="relative h-72 md:h-96">
                {images.length > 0 ? (
                  <>
                    <Image
                      src={images[currentImageIndex]}
                      alt={`${room.name} - Image ${currentImageIndex + 1}`}
                      fill
                      className="object-cover cursor-pointer"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                    {/* Navigation arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400">No images available</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                        i === currentImageIndex ? 'border-brand-500' : 'border-transparent'
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Room Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {room.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      Up to {room.maxGuests} guests
                    </span>
                    {room.maxExtraGuests > 0 && (
                      <span>+{room.maxExtraGuests} extra guests (₹{room.extraGuestCharge}/night)</span>
                    )}
                    <span>{room.totalRooms} rooms</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    ₹{room.basePriceDaily.toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-gray-500">/night</div>
                  {room.basePriceHourly && hotel.bookingModel !== 'DAILY' && (
                    <div className="text-sm text-gray-400 mt-1">
                      ₹{room.basePriceHourly.toLocaleString('en-IN')}/hr
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed">
                {room.description ||
                  `Experience comfort and elegance in our ${room.name.toLowerCase()}. Perfect for both leisure and business travelers, this room offers modern amenities and a relaxing atmosphere for up to ${room.maxGuests} guests.`}
              </p>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {room.amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span style={{ color: theme.primaryColor || '#2563eb' }}>
                      {AMENITY_ICONS[amenity] || <Check className="w-5 h-5" />}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {AMENITY_LABELS[amenity] || amenity.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: theme.primaryColor || '#2563eb' }} />
                    Check-in / Check-out
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>Check-in: {hotel.checkInTime || '2:00 PM'}</li>
                    <li>Check-out: {hotel.checkOutTime || '11:00 AM'}</li>
                    {hotel.bookingModel !== 'DAILY' && (
                      <li>Minimum stay: {hotel.hourlyMinHours || 3} hours (hourly)</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: theme.primaryColor || '#2563eb' }} />
                    Guest Policy
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>Max guests: {room.maxGuests} per room</li>
                    {room.maxExtraGuests > 0 && (
                      <li>Extra guests: up to {room.maxExtraGuests} at ₹{room.extraGuestCharge}/night each</li>
                    )}
                    <li>ID proof required at check-in</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Back link */}
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all rooms
            </Link>
          </div>

          {/* Sidebar — Booking Widget */}
          <div className="lg:col-span-1">
            <BookingWidget
              hotelId={hotel.id}
              hotelName={hotel.name}
              hotelSlug={hotel.slug}
              bookingModel={hotel.bookingModel}
              minStayNights={1}
              minStayHours={hotel.hourlyMinHours || 3}
              checkInTime={hotel.checkInTime || '14:00'}
              checkOutTime={hotel.checkOutTime || '11:00'}
              selectedRoom={{
                id: room.id,
                name: room.name,
                basePriceDaily: room.basePriceDaily,
                basePriceHourly: room.basePriceHourly,
                maxGuests: room.maxGuests,
                maxExtraGuests: room.maxExtraGuests,
                extraGuestCharge: room.extraGuestCharge,
              }}
            />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative w-[90vw] h-[80vh]">
            <Image
              src={images[currentImageIndex]}
              alt={`${room.name} - Image ${currentImageIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={() => setCurrentImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
