'use client';

import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeColor, sanitizeText } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { LocationSectionProps } from '../types';

export function HeritageBoutiqueLocation({ hotel, theme }: LocationSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#b45309');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-stone-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center opacity-0"
          style={isVisible ? { animation: 'slide-up 0.7s ease-out both' } : undefined}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px" style={{ backgroundColor: primary }} />
              <div className="w-1.5 h-1.5 rotate-45 border" style={{ borderColor: primary }} />
            </div>
            <h2
              className="text-3xl text-stone-800 mb-8"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
            >
              How to Find Us
            </h2>
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: primary }} />
              <div className="text-sm" style={{ fontFamily: "'Lora', serif" }}>
                <p className="text-stone-800">{sanitizeText(hotel.address)}</p>
                <p className="text-stone-500 mt-0.5">
                  {sanitizeText(hotel.city)}, {sanitizeText(hotel.state)} — {sanitizeText(hotel.pincode)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-500 mb-8">
              <Clock className="w-4 h-4" style={{ color: primary }} />
              <span style={{ fontFamily: "'Lora', serif" }}>
                Check-in: {hotel.checkInTime || '2:00 PM'} &middot; Check-out: {hotel.checkOutTime || '11:00 AM'}
              </span>
            </div>
            <Link href="/about#contact">
              <Button variant="outline" className="border-stone-300 text-stone-600 hover:bg-stone-100 rounded-lg">
                Get Directions
              </Button>
            </Link>
          </div>
          <div className="h-80 bg-white rounded-xl shadow-sm border border-stone-100 flex items-center justify-center">
            <p className="text-stone-400 text-sm" style={{ fontFamily: "'Lora', serif" }}>Map</p>
          </div>
        </div>
      </div>
    </section>
  );
}
