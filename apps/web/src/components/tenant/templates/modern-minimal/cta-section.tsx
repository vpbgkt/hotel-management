'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeColor, sanitizeText } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { CTASectionProps } from '../types';

export function ModernMinimalCTA({ hotel, theme }: CTASectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="py-24 text-center relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${primary}, ${primary}dd)` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
      <div
        className="relative max-w-2xl mx-auto px-6 opacity-0"
        style={isVisible ? { animation: 'scale-in 0.6s ease-out both' } : undefined}
      >
        <h2 className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight">
          Experience {sanitizeText(hotel.name)}
        </h2>
        <p className="text-white/70 mb-10 font-light">
          Book your stay today and enjoy the best rates when you book direct.
        </p>
        <Link href="/rooms">
          <Button
            size="lg"
            className="bg-white hover:bg-white/90 rounded-full px-8 transition-transform duration-300 hover:scale-105"
            style={{ color: primary }}
          >
            Reserve Now <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
