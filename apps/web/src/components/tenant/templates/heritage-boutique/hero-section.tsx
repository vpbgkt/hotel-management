'use client';

import Image from 'next/image';
import { Star, MapPin, ArrowDown } from 'lucide-react';
import { sanitizeColor, sanitizeImageUrl, sanitizeText } from '@/lib/security/sanitize';
import { SearchWidget } from '../shared/search-widget';
import type { HeroSectionProps } from '../types';

export function HeritageBoutiqueHero({
  hotel, theme,
  checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
}: HeroSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#8B4513');
  const heroImg = sanitizeImageUrl(hotel.heroImageUrl);

  return (
    <>
      <section className="relative w-full min-h-screen flex items-center overflow-hidden bg-stone-100">
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
            <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-900/30 to-stone-900/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 text-center py-32">
          <div style={{ animation: 'fade-in 1s ease-out 0.3s both' }}>
            {/* Ornamental divider */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-16 h-px bg-white/30" />
              <div className="w-2 h-2 rotate-45 border border-white/40" />
              <div className="w-16 h-px bg-white/30" />
            </div>

            {hotel.starRating > 0 && (
              <div className="flex items-center justify-center gap-1.5 mb-6" style={{ animation: 'fade-in 1s ease-out 0.4s both' }}>
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-stone-300 text-stone-300" />
                ))}
              </div>
            )}

            <h1
              className="text-5xl md:text-7xl text-white leading-[1.1] mb-6"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400, color: primary, animation: 'slide-up 0.8s ease-out 0.5s both' }}
            >
              {sanitizeText(hotel.name)}
            </h1>

            {hotel.tagline && (
              <p
                className="text-lg md:text-xl text-white/60 italic mb-10 max-w-2xl mx-auto"
                style={{ fontFamily: "'Lora', serif", animation: 'slide-up 0.8s ease-out 0.7s both' }}
              >
                &ldquo;{sanitizeText(hotel.tagline)}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40" style={{ animation: 'fade-in 1s ease-out 0.9s both' }}>
              {hotel.averageRating && (
                <span className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-stone-300 text-stone-300" />
                  {hotel.averageRating.toFixed(1)} ({hotel.reviewCount})
                </span>
              )}
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {sanitizeText(hotel.city)}
              </span>
            </div>

            {hotel.startingPrice && (
              <div className="mt-12" style={{ animation: 'slide-up 0.8s ease-out 1s both' }}>
                <span className="text-sm tracking-widest uppercase text-white/40 block mb-2" style={{ fontFamily: "'Lora', serif" }}>Tariff from</span>
                <span className="text-4xl md:text-5xl text-white font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ₹{hotel.startingPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-white/30 text-sm ml-2">/ night</span>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" style={{ animation: 'fade-in 1s ease-out 1.2s both' }}>
          <ArrowDown className="w-5 h-5 text-white/30 animate-bounce" />
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
            variant="default"
          />
        </div>
      </section>
    </>
  );
}
