'use client';

import { sanitizeColor, sanitizeText } from '@/lib/security/sanitize';
import { getAmenityIcon, getAmenityLabel } from '../shared/amenities';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { AmenitiesSectionProps } from '../types';

export function ModernMinimalAmenities({ hotel, theme }: AmenitiesSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const { ref, isVisible } = useScrollReveal();

  if (!hotel.amenities?.length) return null;

  return (
    <section className="py-20 bg-gray-50/50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-xl mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: primary }}>
            Amenities
          </p>
          <h2 className="text-3xl font-light text-gray-900 tracking-tight">
            Everything you need
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {hotel.amenities.map((amenity, i) => (
            <div
              key={amenity}
              className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-sm opacity-0"
              style={isVisible ? {
                animation: `fade-in 0.5s ease-out ${i * 0.05}s both`,
              } : undefined}
            >
              <span style={{ color: primary }}>
                {getAmenityIcon(amenity)}
              </span>
              <span className="text-gray-700 font-light">
                {getAmenityLabel(sanitizeText(amenity) || amenity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
