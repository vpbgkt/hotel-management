'use client';

import Image from 'next/image';
import { Star, MapPin, ArrowDown } from 'lucide-react';
import { sanitizeColor, sanitizeImageUrl, sanitizeText } from '@/lib/security/sanitize';
import type { HeroSectionProps } from '../types';
import { SearchWidget } from '../shared/search-widget';

export function ModernMinimalHero({
  hotel, theme,
  checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
}: HeroSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const heroImg = sanitizeImageUrl(hotel.heroImageUrl);

  return (
    <>
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          {heroImg ? (
            <Image
              src={heroImg}
              alt={sanitizeText(hotel.name)}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 py-32">
          <div className="max-w-2xl" style={{ animation: 'slide-up 0.8s ease-out 0.2s both' }}>
            {hotel.starRating > 0 && (
              <div className="flex items-center gap-1.5 mb-6">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-white/80 text-white/80" />
                ))}
              </div>
            )}

            <h1 className="text-5xl md:text-7xl font-light text-white tracking-tight leading-[1.1] mb-6">
              {sanitizeText(hotel.name)}
            </h1>

            {hotel.tagline && (
              <p className="text-lg md:text-xl text-white/70 font-light mb-8 max-w-lg">
                {sanitizeText(hotel.tagline)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
              {hotel.averageRating && (
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Star className="w-3.5 h-3.5 fill-white/80 text-white/80" />
                  {hotel.averageRating.toFixed(1)} ({hotel.reviewCount})
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {sanitizeText(hotel.city)}
              </span>
            </div>

            {hotel.startingPrice && (
              <div className="mt-10 inline-flex items-baseline gap-2 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
                <span className="text-3xl md:text-4xl font-light text-white">
                  ₹{hotel.startingPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-white/50 text-sm">/ night</span>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" style={{ animation: 'slide-up 0.8s ease-out 1s both' }}>
          <ArrowDown className="w-5 h-5 text-white/40 animate-bounce" />
        </div>
      </section>

      {/* Search widget */}
      <section className="relative z-20 -mt-12 max-w-5xl mx-auto px-6">
        <div style={{ animation: 'slide-up 0.6s ease-out 0.8s both' }}>
          <SearchWidget
            theme={theme}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onCheckInChange={onCheckInChange}
            onCheckOutChange={onCheckOutChange}
            onGuestsChange={onGuestsChange}
            variant="minimal"
          />
        </div>
      </section>
    </>
  );
}
