'use client';

import { Shield, Award, Heart } from 'lucide-react';
import { sanitizeColor } from '@/lib/security/sanitize';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { WhyBookSectionProps } from '../types';

const VALUE_PROPS = [
  { icon: Shield, title: 'Best Rate Promise', desc: 'Our direct booking always offers the most favourable rate — a promise honoured with every reservation.' },
  { icon: Award, title: 'Authentic Experience', desc: 'Immerse yourself in local heritage with curated cultural experiences only available when you book with us.' },
  { icon: Heart, title: 'Personal Attention', desc: 'From arrival to departure, our team crafts your stay with warmth and care.' },
];

export function HeritageBoutiqueWhyBook({ theme }: WhyBookSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#b45309');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-amber-50/30" ref={ref}>
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
                className="w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110"
                style={{ borderColor: `${primary}40`, color: primary }}
              >
                <item.icon className="w-6 h-6" />
              </div>
              <h3
                className="text-lg text-stone-800 mb-3"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
