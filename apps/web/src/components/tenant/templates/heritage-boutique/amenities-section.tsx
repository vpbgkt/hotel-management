'use client';

import { sanitizeColor } from '@/lib/security/sanitize';
import { getAmenityIcon, getAmenityLabel } from '../shared/amenities';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { AmenitiesSectionProps } from '../types';

export function HeritageBoutiqueAmenities({ hotel, theme }: AmenitiesSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#b45309');
  const { ref, isVisible } = useScrollReveal();

  if (!hotel.amenities?.length) return null;

  return (
    <section className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-px" style={{ backgroundColor: primary }} />
            <div className="w-2 h-2 rotate-45 border" style={{ borderColor: primary }} />
            <div className="w-12 h-px" style={{ backgroundColor: primary }} />
          </div>
          <h2
            className="text-3xl text-stone-800 mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Amenities & Comforts
          </h2>
          <p className="text-stone-500" style={{ fontFamily: "'Lora', serif" }}>
            Thoughtfully curated for your relaxation
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {hotel.amenities.map((amenity, i) => (
            <div
              key={amenity}
              className="text-center p-5 bg-stone-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 group opacity-0"
              style={isVisible ? { animation: `fade-in 0.5s ease-out ${i * 0.05}s both` } : undefined}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border transition-all duration-300 group-hover:scale-110"
                style={{ borderColor: `${primary}30`, color: primary }}
              >
                {getAmenityIcon(amenity)}
              </div>
              <span className="text-sm text-stone-600" style={{ fontFamily: "'Lora', serif" }}>
                {getAmenityLabel(amenity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
