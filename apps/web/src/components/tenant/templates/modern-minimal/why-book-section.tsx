'use client';

import { Shield, Award, Heart } from 'lucide-react';
import { sanitizeColor } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { WhyBookSectionProps } from '../types';

const VALUE_PROPS = [
  { icon: Shield, title: 'Best Price Guarantee', desc: 'Book directly for the lowest rate — no middlemen, no hidden fees.' },
  { icon: Award, title: 'No Hidden Charges', desc: 'Transparent pricing. What you see is exactly what you pay.' },
  { icon: Heart, title: 'Personalized Service', desc: 'Direct communication with our team for special requests.' },
];

export function ModernMinimalWhyBook({ theme }: WhyBookSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: primary }}>
            Why Direct
          </p>
          <h2 className="text-3xl font-light text-gray-900 tracking-tight">
            Book with confidence
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {VALUE_PROPS.map((item, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl bg-gray-50/80 hover:bg-white hover:shadow-lg transition-all duration-500 opacity-0"
              style={isVisible ? {
                animation: `slide-up 0.6s ease-out ${i * 0.15}s both`,
              } : undefined}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${primary}10`, color: primary }}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
