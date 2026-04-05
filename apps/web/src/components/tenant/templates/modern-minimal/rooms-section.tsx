'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { sanitizeColor, sanitizeImageUrl, sanitizeText } from '@/lib/security/sanitize';
import { getAmenityLabel } from '../shared/amenities';
import { useScrollReveal } from '../shared/use-scroll-reveal';
import type { RoomsSectionProps } from '../types';

function RoomCard({ room, hotel, primary, index }: { room: any; hotel: any; primary: string; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  const roomImg = sanitizeImageUrl(room.images?.[0]);

  return (
    <div
      ref={ref}
      className="group opacity-0"
      style={isVisible ? {
        animation: `slide-up 0.6s ease-out ${index * 0.1}s both`,
      } : undefined}
    >
      <Link href={`/rooms/${room.id}`} className="block">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5">
          {roomImg ? (
            <Image
              src={roomImg}
              alt={sanitizeText(room.name)}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium shadow-lg">
            ₹{room.basePriceDaily.toLocaleString('en-IN')} <span className="text-gray-400 font-light">/ night</span>
          </div>
        </div>

        <div className="px-1">
          <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:translate-x-1 transition-transform duration-300">
            {sanitizeText(room.name)}
          </h3>
          {room.description && (
            <p className="text-sm text-gray-500 font-light mb-3 line-clamp-2">
              {sanitizeText(room.description)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-full px-3 py-1">
              <Users className="w-3.5 h-3.5" /> {room.maxGuests} guests
            </span>
            {room.amenities.slice(0, 3).map((a: string) => (
              <span key={a} className="text-xs text-gray-500 bg-gray-50 rounded-full px-3 py-1">
                {getAmenityLabel(a)}
              </span>
            ))}
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-300 group-hover:gap-3"
            style={{ color: primary }}
          >
            View Room <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Link>
    </div>
  );
}

export function ModernMinimalRooms({ hotel, theme }: RoomsSectionProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const activeRooms = hotel.roomTypes?.filter((r: any) => r.isActive) || [];

  if (activeRooms.length === 0) return null;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: primary }}>
            Rooms & Suites
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 tracking-tight">
            Find your perfect stay
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {activeRooms.map((room: any, i: number) => (
            <RoomCard key={room.id} room={room} hotel={hotel} primary={primary} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
