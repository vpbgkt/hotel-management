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
      <Link href={`/rooms/${room.id}`} className="block">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-6">
          {roomImg ? (
            <Image
              src={roomImg}
              alt={sanitizeText(room.name)}
              fill
              className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">No Image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h3
              className="text-2xl text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
            >
              {sanitizeText(room.name)}
            </h3>
            <div className="flex items-center gap-3 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {room.maxGuests} guests
              </span>
              {room.amenities.slice(0, 2).map((a: string) => (
                <span key={a} className="hidden sm:inline">{getAmenityLabel(a)}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-2xl text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              ₹{room.basePriceDaily.toLocaleString('en-IN')}
            </span>
            <span className="text-gray-400 text-sm ml-2">/ night</span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-300 group-hover:gap-3"
            style={{ color: primary }}
          >
            View <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Link>
    </div>
  );
}

export function LuxuryResortRooms({ hotel, theme }: RoomsSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#d4a574');
  const activeRooms = hotel.roomTypes?.filter((r: any) => r.isActive) || [];

  if (activeRooms.length === 0) return null;

  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: primary }} />
          <h2
            className="text-3xl md:text-4xl text-gray-900 mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Rooms & Suites
          </h2>
          <p className="text-gray-400 font-light max-w-md mx-auto">
            Refined spaces designed for your comfort and pleasure
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
