'use client';

import { Shield, Award, Heart } from 'lucide-react';
import { sanitizeColor } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { WhyBookSectionProps } from '../types';

const VALUE_PROPS = [
  { icon: Shield, title: 'Best Price Guarantee', desc: 'Our direct rates are always the most competitive — guaranteed.' },
  { icon: Award, title: 'Exclusive Benefits', desc: 'Complimentary upgrades and amenities when you book with us.' },
  { icon: Heart, title: 'Bespoke Service', desc: 'Tailored experiences crafted by our dedicated concierge team.' },
];

export function LuxuryResortWhyBook({ theme }: WhyBookSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-stone-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: primary }} />
          <h2
            className="text-3xl text-gray-900 mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Why Book Direct
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUE_PROPS.map((item, i) => (
            <div
              key={i}
              className="text-center p-10 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-500 opacity-0"
              style={isVisible ? { animation: `slide-up 0.6s ease-out ${i * 0.15}s both` } : undefined}
            >
              <div
                className="w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110"
                style={{ borderColor: primary, color: primary }}
              >
                <item.icon className="w-6 h-6" />
              </div>
              <h3
                className="text-lg text-gray-900 mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
