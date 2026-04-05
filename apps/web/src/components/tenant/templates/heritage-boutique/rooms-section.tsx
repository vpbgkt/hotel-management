'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { sanitizeColor, sanitizeImageUrl, sanitizeText } from '@/lib/security/sanitize';
import { getAmenityLabel } from '../shared/amenities';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { RoomsSectionProps } from '../types';

function RoomCard({ room, primary, index }: { room: any; primary: string; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  const roomImg = sanitizeImageUrl(room.images?.[0]);

  return (
    <div
      ref={ref}
      className="group opacity-0"
      style={isVisible ? { animation: `slide-up 0.7s ease-out ${index * 0.15}s both` } : undefined}
    >
      <Link href={`/rooms/${room.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
        <div className="relative aspect-[4/3] overflow-hidden">
          {roomImg ? (
            <Image
              src={roomImg}
              alt={sanitizeText(room.name)}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">No Image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="p-6">
          <h3
            className="text-xl text-stone-800 mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {sanitizeText(room.name)}
          </h3>

          {room.description && (
            <p className="text-sm text-stone-500 mb-4 line-clamp-2" style={{ fontFamily: "'Lora', serif" }}>
              {sanitizeText(room.description)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 rounded-full px-3 py-1 border border-stone-100">
              <Users className="w-3.5 h-3.5" /> {room.maxGuests} guests
            </span>
            {room.amenities.slice(0, 3).map((a: string) => (
              <span key={a} className="text-xs text-stone-500 bg-stone-50 rounded-full px-3 py-1 border border-stone-100">
                {getAmenityLabel(a)}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <div>
              <span className="text-2xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                ₹{room.basePriceDaily.toLocaleString('en-IN')}
              </span>
              <span className="text-stone-400 text-sm ml-1">/ night</span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-300 group-hover:gap-3"
              style={{ color: primary }}
            >
              View <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function HeritageBoutiqueRooms({ hotel, theme }: RoomsSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#8B4513');
  const activeRooms = hotel.roomTypes?.filter((r: any) => r.isActive) || [];

  if (activeRooms.length === 0) return null;

  return (
    <section className="py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-px" style={{ backgroundColor: primary }} />
            <div className="w-2 h-2 rotate-45 border" style={{ borderColor: primary }} />
            <div className="w-12 h-px" style={{ backgroundColor: primary }} />
          </div>
          <h2
            className="text-3xl md:text-4xl text-stone-800 mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Chambers & Suites
          </h2>
          <p className="text-stone-500 font-light max-w-md mx-auto" style={{ fontFamily: "'Lora', serif" }}>
            Timeless elegance interlaced with modern comforts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeRooms.map((room: any, i: number) => (
            <RoomCard key={room.id} room={room} primary={primary} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
