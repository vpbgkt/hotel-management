'use client';

import { sanitizeColor } from '@/lib/security/sanitize';
import { getAmenityIcon, getAmenityLabel } from '../shared/amenities';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { AmenitiesSectionProps } from '../types';

export function LuxuryResortAmenities({ hotel, theme }: AmenitiesSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const { ref, isVisible } = useScrollReveal();

  if (!hotel.amenities?.length) return null;

  return (
    <section className="py-24 bg-gray-950 text-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: primary }} />
          <h2
            className="text-3xl text-white mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Facilities & Services
          </h2>
          <p className="text-gray-500 font-light">Curated amenities for a refined experience</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {hotel.amenities.map((amenity, i) => (
            <div
              key={amenity}
              className="text-center group opacity-0"
              style={isVisible ? { animation: `fade-in 0.5s ease-out ${i * 0.06}s both` } : undefined}
            >
              <div className="w-14 h-14 rounded-full border border-gray-800 group-hover:border-gray-600 flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110">
                <span style={{ color: primary }}>
                  {getAmenityIcon(amenity)}
                </span>
              </div>
              <span className="text-sm text-gray-400 font-light">
                {getAmenityLabel(amenity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
