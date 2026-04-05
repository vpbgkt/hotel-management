'use client';

/**
 * Hotel Tenant Homepage
 * The main landing page for a hotel's own website.
 * Modern design with scroll-triggered animations and parallax effects.
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import {
  Star,
  MapPin,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Car,
  UtensilsCrossed,
  Waves,
  Dumbbell,
  Shield,
  Award,
  Heart,
  ArrowDown,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/lib/tenant/tenant-context';
import type { TemplateComponentSet } from '@/components/tenant/templates/types';
import { loadTemplate } from '@/components/tenant/templates/registry';
import { sanitizeText, sanitizeColor, sanitizeImageUrl, sanitizeJsonLd, sanitizeTemplateName } from '@/lib/security/sanitize';

/* ─── Scroll-triggered animation hook ─── */
function useScrollReveal(threshold = 0.15) {
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

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal(0.3);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count.toLocaleString('en-IN')}{suffix}</span>;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-5 h-5" />,
  ac: <Wind className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  minibar: <Coffee className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  restaurant: <UtensilsCrossed className="w-5 h-5" />,
  pool: <Waves className="w-5 h-5" />,
  gym: <Dumbbell className="w-5 h-5" />,
  'room-service': <Coffee className="w-5 h-5" />,
  spa: <Heart className="w-5 h-5" />,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Smart TV',
  minibar: 'Mini Bar',
  parking: 'Free Parking',
  restaurant: 'Restaurant',
  pool: 'Swimming Pool',
  gym: 'Fitness Center',
  'room-service': 'Room Service',
  spa: 'Spa & Wellness',
  breakfast: 'Breakfast Included',
  balcony: 'Private Balcony',
  safe: 'In-room Safe',
  laundry: 'Laundry Service',
};

export default function TenantHomePage() {
  const { hotel, loading, theme } = useTenant();

  // Search widget state
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(2);

  // Dynamic template loading
  const [templateSet, setTemplateSet] = useState<TemplateComponentSet | null>(null);

  useEffect(() => {
    if (!hotel) return;
    const tplName = sanitizeTemplateName(hotel.template) as import('@/lib/tenant/tenant-context').HotelTemplateName;
    if (tplName !== 'STARTER') {
      loadTemplate(tplName).then(setTemplateSet);
    } else {
      setTemplateSet(null); // Use inline STARTER layout
    }
  }, [hotel?.template, hotel]);

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Hero skeleton */}
        <div className="h-[70vh] bg-gray-200 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hotel Not Found</h1>
          <p className="text-gray-600 mb-6">The hotel you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/">
            <Button>Go to Hotel Manager</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeRooms = hotel.roomTypes?.filter((r) => r.isActive) || [];

  // ─── TEMPLATE RENDERING ──────────────────────────────────
  // If a non-STARTER template is loaded, render its component set instead of the inline layout.
  if (templateSet) {
    const { HeroSection, RoomsSection, AmenitiesSection, WhyBookSection, LocationSection, CTASection } = templateSet;

    // JSON-LD structured data (shared across all templates)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: sanitizeText(hotel.name),
      description: sanitizeText(hotel.description),
      address: {
        '@type': 'PostalAddress',
        streetAddress: sanitizeText(hotel.address),
        addressLocality: sanitizeText(hotel.city),
        addressRegion: sanitizeText(hotel.state),
        postalCode: sanitizeText(hotel.pincode),
        addressCountry: 'IN',
      },
      starRating: { '@type': 'Rating', ratingValue: hotel.starRating },
      ...(hotel.averageRating && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: hotel.averageRating,
          reviewCount: hotel.reviewCount || 0,
          bestRating: 5,
        },
      }),
      ...(hotel.heroImageUrl && { image: sanitizeImageUrl(hotel.heroImageUrl) }),
      ...(hotel.phone && { telephone: sanitizeText(hotel.phone) }),
      ...(hotel.email && { email: sanitizeText(hotel.email) }),
      checkinTime: hotel.checkInTime || '14:00',
      checkoutTime: hotel.checkOutTime || '12:00',
    };

    return (
      <div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeJsonLd(jsonLd)) }}
        />
        <HeroSection
          hotel={hotel}
          theme={theme}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          onGuestsChange={setGuests}
        />
        <RoomsSection hotel={hotel} theme={theme} />
        <AmenitiesSection hotel={hotel} theme={theme} />
        <WhyBookSection hotel={hotel} theme={theme} />
        <LocationSection hotel={hotel} theme={theme} />
        <CTASection hotel={hotel} theme={theme} />
      </div>
    );
  }

  // ─── STARTER (DEFAULT) TEMPLATE ──────────────────────────

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    description: hotel.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      addressRegion: hotel.state,
      postalCode: hotel.pincode,
      addressCountry: 'IN',
    },
    starRating: { '@type': 'Rating', ratingValue: hotel.starRating },
    ...(hotel.averageRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: hotel.averageRating,
        reviewCount: hotel.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(hotel.heroImageUrl && { image: hotel.heroImageUrl }),
    ...(hotel.phone && { telephone: hotel.phone }),
    ...(hotel.email && { email: hotel.email }),
    checkinTime: hotel.checkInTime || '14:00',
    checkoutTime: hotel.checkOutTime || '12:00',
  };

  return (
    <div className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizeJsonLd(jsonLd)) }}
      />

      {/* =================== HERO SECTION — Full-screen parallax =================== */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {hotel.heroImageUrl ? (
          <Image
            src={hotel.heroImageUrl}
            alt={hotel.name}
            fill
            className="object-cover scale-105"
            style={{ willChange: 'transform' }}
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'} 0%, ${theme.secondaryColor || '#1e40af'} 50%, ${theme.primaryColor || '#2563eb'}aa 100%)`,
            }}
          />
        )}
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Animated particle dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {hotel.isVerified && (
            <div
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-sm font-medium px-5 py-2 rounded-full mb-6 border border-white/20"
              style={{ animation: 'fade-in 0.8s ease-out 0.2s both' }}
            >
              <Shield className="w-4 h-4" />
              Verified Property
            </div>
          )}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 tracking-tight leading-[0.95]"
            style={{ animation: 'slide-up 0.8s ease-out 0.3s both' }}
          >
            {hotel.name}
          </h1>
          {hotel.tagline && (
            <p
              className="text-xl md:text-2xl text-white/85 mb-6 font-light max-w-2xl mx-auto"
              style={{ animation: 'slide-up 0.8s ease-out 0.5s both' }}
            >
              {hotel.tagline}
            </p>
          )}
          <div
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/80 mb-8"
            style={{ animation: 'slide-up 0.8s ease-out 0.7s both' }}
          >
            <div className="flex items-center gap-1.5">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            {hotel.averageRating && (
              <span className="flex items-center gap-1.5 text-sm">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white">{hotel.averageRating.toFixed(1)}</span>
                ({hotel.reviewCount} reviews)
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4" />
              {hotel.city}, {hotel.state}
            </span>
          </div>

          {hotel.startingPrice && (
            <div
              className="inline-flex items-baseline gap-2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 mb-8"
              style={{ animation: 'scale-in 0.5s ease-out 0.9s both' }}
            >
              <span className="text-white/70 text-sm">From</span>
              <span className="text-4xl font-bold text-white">₹{hotel.startingPrice.toLocaleString('en-IN')}</span>
              <span className="text-white/70">/night</span>
            </div>
          )}

          <div style={{ animation: 'slide-up 0.8s ease-out 1s both' }}>
            <Link href="/rooms">
              <Button
                size="lg"
                className="px-8 py-4 text-lg rounded-full shadow-2xl hover:shadow-brand-500/25 transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: theme.primaryColor || undefined }}
              >
                Explore Rooms
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" style={{ animation: 'slide-up 0.8s ease-out 1.2s both' }}>
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* =================== SEARCH BAR — Glass morphism =================== */}
      <section className="relative z-20 -mt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Check-in</label>
                <div className="relative group">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full pl-11 pr-3 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Check-out</label>
                <div className="relative group">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                    className="w-full pl-11 pr-3 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Guests</label>
                <div className="relative group">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full pl-11 pr-3 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Link href={`/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}>
                <Button
                  className="w-full py-3 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  style={{ backgroundColor: theme.primaryColor || undefined }}
                >
                  Check Availability
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================== QUICK STATS =================== */}
      {(hotel.averageRating || activeRooms.length > 0) && (
        <StatsStrip hotel={hotel} roomCount={activeRooms.length} theme={theme} />
      )}

      {/* =================== ROOMS PREVIEW — Staggered cards =================== */}
      {activeRooms.length > 0 && (
        <RoomsSection rooms={activeRooms} hotel={hotel} theme={theme} />
      )}

      {/* =================== AMENITIES — Animated grid =================== */}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <AmenitiesSection amenities={hotel.amenities} theme={theme} />
      )}

      {/* =================== WHY BOOK DIRECT =================== */}
      <WhyBookSection theme={theme} />

      {/* =================== LOCATION =================== */}
      <LocationSection hotel={hotel} theme={theme} />

      {/* =================== CTA — Gradient with animation =================== */}
      <CTASection hotel={hotel} theme={theme} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Section Components with scroll-triggered animations
   ═══════════════════════════════════════════════════════════ */

function StatsStrip({ hotel, roomCount, theme }: { hotel: any; roomCount: number; theme: any }) {
  const { ref, isVisible } = useScrollReveal();
  const stats = [
    ...(hotel.averageRating ? [{ value: hotel.averageRating, suffix: '/5', label: 'Guest Rating' }] : []),
    ...(hotel.reviewCount ? [{ value: hotel.reviewCount, suffix: '+', label: 'Reviews' }] : []),
    { value: roomCount, suffix: '+', label: 'Room Types' },
    { value: hotel.starRating, suffix: ' Star', label: 'Property' },
  ];

  return (
    <section ref={ref} className="py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoomsSection({ rooms, hotel, theme }: { rooms: any[]; hotel: any; theme: any }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-sm font-semibold uppercase tracking-widest mb-3 block" style={{ color: theme.primaryColor || '#2563eb' }}>
            Accommodation
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Rooms & Suites
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Thoughtfully designed spaces where comfort meets elegance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.slice(0, 6).map((room, i) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 150}ms` }}
            >
              <div className="relative h-64 overflow-hidden">
                {room.images?.[0] ? (
                  <Image
                    src={room.images[0]}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No image</span>
                  </div>
                )}
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {hotel.bookingModel === 'BOTH' && room.basePriceHourly && (
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Hourly Available
                  </div>
                )}

                {/* Price badge visible on hover */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-lg">
                  <span className="text-xl font-bold text-gray-900">₹{room.basePriceDaily.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-500">/night</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">
                  {room.name}
                </h3>
                <p className="text-gray-500 mb-4 line-clamp-2 text-sm leading-relaxed">
                  {room.description || `Comfortable room for up to ${room.maxGuests} guests`}
                </p>
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Users className="w-3.5 h-3.5" />
                    {room.maxGuests} Guests
                  </span>
                  {room.amenities.slice(0, 2).map((a: string) => (
                    <span key={a} className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                      {AMENITY_LABELS[a] || a}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">₹{room.basePriceDaily.toLocaleString('en-IN')}</span>
                    <span className="text-sm text-gray-500 ml-1">/night</span>
                  </div>
                  <span
                    className="text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all duration-300"
                    style={{ color: theme.primaryColor || '#2563eb' }}
                  >
                    Book Now <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {rooms.length > 6 && (
          <div className="text-center mt-12">
            <Link href="/rooms">
              <Button variant="outline" size="lg" className="rounded-full px-8 hover:scale-105 transition-transform">
                View All {rooms.length} Rooms
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function AmenitiesSection({ amenities, theme }: { amenities: string[]; theme: any }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-sm font-semibold uppercase tracking-widest mb-3 block" style={{ color: theme.primaryColor || '#2563eb' }}>
            Facilities
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Hotel Amenities</h2>
          <p className="text-gray-500 text-lg">Everything you need for a memorable stay</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {amenities.map((amenity, i) => (
            <div
              key={amenity}
              className={`flex items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-default ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${200 + i * 80}ms` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: `${theme.primaryColor || '#2563eb'}15` }}
              >
                <span style={{ color: theme.primaryColor || '#2563eb' }}>
                  {AMENITY_ICONS[amenity] || <Star className="w-5 h-5" />}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {AMENITY_LABELS[amenity] || amenity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyBookSection({ theme }: { theme: any }) {
  const { ref, isVisible } = useScrollReveal();
  const items = [
    { icon: <Shield className="w-7 h-7" />, title: 'Best Price Guarantee', desc: 'Book directly with us for the absolute lowest rate, guaranteed.' },
    { icon: <Award className="w-7 h-7" />, title: 'No Hidden Charges', desc: 'Transparent pricing. No booking fees, no middleman markup.' },
    { icon: <Heart className="w-7 h-7" />, title: 'Personalized Service', desc: 'Direct communication with our team for your special requests.' },
  ];

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-sm font-semibold uppercase tracking-widest mb-3 block" style={{ color: theme.primaryColor || '#2563eb' }}>
            Direct Benefits
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">Why Book Direct?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              className={`text-center p-8 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${300 + i * 150}ms` }}
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-white shadow-lg"
                style={{
                  backgroundColor: theme.primaryColor || '#2563eb',
                  boxShadow: `0 10px 30px -5px ${theme.primaryColor || '#2563eb'}40`,
                }}
              >
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LocationSection({ hotel, theme }: { hotel: any; theme: any }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest mb-3 block" style={{ color: theme.primaryColor || '#2563eb' }}>
              Find Us
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Location</h2>
            <div className="flex items-start gap-4 mb-6 p-4 bg-white rounded-2xl border border-gray-100">
              <MapPin className="w-6 h-6 mt-0.5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
              <div>
                <p className="font-semibold text-gray-900 mb-1">{hotel.address}</p>
                <p className="text-gray-500">{hotel.city}, {hotel.state} — {hotel.pincode}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-xl px-4 py-3 border border-gray-100">
                <Clock className="w-4 h-4" style={{ color: theme.primaryColor || '#2563eb' }} />
                Check-in: {hotel.checkInTime || '2:00 PM'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-xl px-4 py-3 border border-gray-100">
                <Clock className="w-4 h-4" style={{ color: theme.primaryColor || '#2563eb' }} />
                Check-out: {hotel.checkOutTime || '11:00 AM'}
              </div>
            </div>
            {(hotel.phone || hotel.email) && (
              <div className="flex flex-wrap gap-4 mb-6">
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: theme.primaryColor || '#2563eb' }}>
                    <Phone className="w-4 h-4" /> {hotel.phone}
                  </a>
                )}
                {hotel.email && (
                  <a href={`mailto:${hotel.email}`} className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: theme.primaryColor || '#2563eb' }}>
                    <Mail className="w-4 h-4" /> {hotel.email}
                  </a>
                )}
              </div>
            )}
            <Link href="/about#contact">
              <Button variant="outline" className="rounded-full px-6 hover:scale-105 transition-transform">
                Get Directions
              </Button>
            </Link>
          </div>
          <div
            className={`h-80 bg-gray-200 rounded-3xl overflow-hidden shadow-lg transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            {hotel.latitude && hotel.longitude ? (
              <iframe
                title="Hotel Location"
                src={`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <MapPin className="w-8 h-8 mr-2" /> Map preview
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection({ hotel, theme }: { hotel: any; theme: any }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="relative py-20 md:py-28 text-white text-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'}, ${theme.secondaryColor || '#1e40af'})`,
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
      </div>

      <div className={`relative max-w-3xl mx-auto px-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
          Ready to Experience<br />{hotel.name}?
        </h2>
        <p className="text-white/75 mb-10 text-lg max-w-xl mx-auto">
          Book your stay today and enjoy our best rates when you book directly with us.
        </p>
        <Link href="/rooms">
          <Button
            size="lg"
            className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-4 text-lg rounded-full shadow-2xl hover:shadow-white/25 hover:scale-105 transition-all duration-300 font-semibold"
          >
            Browse Rooms & Book Now
          </Button>
        </Link>
      </div>
    </section>
  );
}
