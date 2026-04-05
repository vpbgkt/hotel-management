'use client';

import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeColor, sanitizeText } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { LocationSectionProps } from '../types';

export function LuxuryResortLocation({ hotel, theme }: LocationSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center opacity-0"
          style={isVisible ? { animation: 'slide-up 0.7s ease-out both' } : undefined}
        >
          <div>
            <div className="w-8 h-px mb-6" style={{ backgroundColor: primary }} />
            <h2
              className="text-3xl text-gray-900 mb-8"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
            >
              Find Us
            </h2>
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: primary }} />
              <div className="text-sm">
                <p className="text-gray-900">{sanitizeText(hotel.address)}</p>
                <p className="text-gray-500">{sanitizeText(hotel.city)}, {sanitizeText(hotel.state)} — {sanitizeText(hotel.pincode)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-8">
              <Clock className="w-4 h-4" style={{ color: primary }} />
              Check-in: {hotel.checkInTime || '2:00 PM'} &middot; Check-out: {hotel.checkOutTime || '11:00 AM'}
            </div>
            <Link href="/about#contact">
              <Button variant="outline" className="border-gray-300 rounded-lg">Get Directions</Button>
            </Link>
          </div>
          <div className="h-80 bg-gray-100 rounded-xl flex items-center justify-center">
            <p className="text-gray-400 text-sm">Map</p>
          </div>
        </div>
      </div>
    </section>
  );
}
