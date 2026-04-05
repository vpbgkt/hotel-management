'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeColor, sanitizeText } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { CTASectionProps } from '../types';

export function LuxuryResortCTA({ hotel, theme }: CTASectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-28 bg-gray-950 text-white text-center" ref={ref}>
      <div
        className="max-w-3xl mx-auto px-6 opacity-0"
        style={isVisible ? { animation: 'scale-in 0.6s ease-out both' } : undefined}
      >
        <div className="w-12 h-px mx-auto mb-8" style={{ backgroundColor: primary }} />
        <h2
          className="text-3xl md:text-4xl text-white mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 300 }}
        >
          Begin Your Journey at {sanitizeText(hotel.name)}
        </h2>
        <p className="text-gray-500 mb-12 font-light">
          Reserve your experience today — best rates guaranteed when booked directly.
        </p>
        <Link href="/rooms">
          <Button
            size="lg"
            className="text-gray-950 px-10 rounded-lg transition-transform duration-300 hover:scale-105"
            style={{ backgroundColor: primary }}
          >
            Reserve Now <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
