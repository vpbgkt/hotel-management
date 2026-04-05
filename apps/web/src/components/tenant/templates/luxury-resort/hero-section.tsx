'use client';

import Image from 'next/image';
import { Star, MapPin, ArrowDown } from 'lucide-react';
import { sanitizeColor, sanitizeImageUrl, sanitizeText } from '@/lib/security/sanitize';
import { SearchWidget } from '../shared/search-widget';
import type { HeroSectionProps } from '../types';

export function LuxuryResortHero({
  hotel, theme,
  checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
}: HeroSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const heroImg = sanitizeImageUrl(hotel.heroImageUrl);

  return (
    <>
      <section className="relative w-full min-h-screen flex items-end overflow-hidden bg-gray-950">
        {/* Background image with cinematic overlay */}
        <div className="absolute inset-0">
          {heroImg ? (
            <Image
              src={heroImg}
              alt={sanitizeText(hotel.name)}
              fill
              className="object-cover opacity-60"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 pb-32 pt-48">
          <div style={{ animation: 'fade-in 1s ease-out 0.3s both' }}>
            <div className="w-12 h-px mb-8" style={{ backgroundColor: primary, animation: 'fade-in 1s ease-out 0.5s both' }} />

            {hotel.starRating > 0 && (
              <div className="flex items-center gap-1.5 mb-6">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4" style={{ fill: primary, color: primary }} />
                ))}
              </div>
            )}

            <h1
              className="text-5xl md:text-7xl text-white leading-[1.1] mb-6"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 300, animation: 'slide-up 0.8s ease-out 0.4s both' }}
            >
              {sanitizeText(hotel.name)}
            </h1>

            {hotel.tagline && (
              <p className="text-lg md:text-xl text-white/50 font-light mb-10 max-w-xl" style={{ animation: 'slide-up 0.8s ease-out 0.6s both' }}>
                {sanitizeText(hotel.tagline)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm text-white/40" style={{ animation: 'fade-in 1s ease-out 0.8s both' }}>
              {hotel.averageRating && (
                <span className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" style={{ fill: primary, color: primary }} />
                  {hotel.averageRating.toFixed(1)} ({hotel.reviewCount} reviews)
                </span>
              )}
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {sanitizeText(hotel.city)}
              </span>
            </div>

            {hotel.startingPrice && (
              <div className="mt-12 flex items-baseline gap-2" style={{ animation: 'slide-up 0.8s ease-out 1s both' }}>
                <span className="text-4xl md:text-5xl text-white font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ₹{hotel.startingPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-white/30 text-sm">per night</span>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" style={{ animation: 'fade-in 1s ease-out 1.2s both' }}>
          <ArrowDown className="w-5 h-5 text-white/20 animate-bounce" />
        </div>
      </section>

      {/* Search widget */}
      <section className="relative z-20 -mt-12 max-w-5xl mx-auto px-6">
        <div style={{ animation: 'slide-up 0.6s ease-out 1s both' }}>
          <SearchWidget
            theme={theme}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onCheckInChange={onCheckInChange}
            onCheckOutChange={onCheckOutChange}
            onGuestsChange={onGuestsChange}
            variant="luxury"
          />
        </div>
      </section>
    </>
  );
}
