'use client';

/**
 * Room Card Component
 * Displays room type information with pricing and booking CTA
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Maximize2, 
  ChevronDown,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Bath,
  Mountain
} from 'lucide-react';

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    basePriceDaily: number;
    basePriceHourly?: number | null;
    maxGuests: number;
    maxExtraGuests: number;
    extraGuestCharge: number;
    totalRooms: number;
    amenities: string[];
    images: string[];
    isActive: boolean;
  };
  hotelSlug: string;
  bookingModel: 'DAILY' | 'HOURLY' | 'BOTH';
  onSelectRoom?: (roomId: string) => void;
}

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  ac: <Wind className="w-4 h-4" />,
  tv: <Tv className="w-4 h-4" />,
  minibar: <Coffee className="w-4 h-4" />,
  'room-service': <Coffee className="w-4 h-4" />,
  'ocean-view': <Mountain className="w-4 h-4" />,
  balcony: <Maximize2 className="w-4 h-4" />,
  bathtub: <Bath className="w-4 h-4" />,
};

const amenityLabels: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Flat-screen TV',
  minibar: 'Mini Bar',
  'room-service': 'Room Service',
  'ocean-view': 'Ocean View',
  balcony: 'Private Balcony',
  bathtub: 'Bathtub',
  safe: 'Safe',
  breakfast: 'Breakfast Included',
};

export function RoomCard({ room, hotelSlug, bookingModel, onSelectRoom }: RoomCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const hasHourlyOption = bookingModel === 'HOURLY' || bookingModel === 'BOTH';
  const hasDailyOption = bookingModel === 'DAILY' || bookingModel === 'BOTH';
  
  const displayedAmenities = room.amenities.slice(0, 4);
  const remainingAmenities = room.amenities.length - 4;

  return (
    <motion.div 
      className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      layout
    >
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0">
          {room.images && room.images.length > 0 ? (
            <>
              <Image
                src={room.images[currentImageIndex]}
                alt={room.name}
                fill
                className="object-cover"
              />
              {room.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {room.images.slice(0, 5).map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
              <span className="text-brand-600 font-medium">No Image</span>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="flex-1 p-5">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.maxGuests} guests
                  </span>
                  {room.maxExtraGuests > 0 && (
                    <span className="text-xs text-gray-500">
                      (+{room.maxExtraGuests} extra @ ₹{room.extraGuestCharge})
                    </span>
                  )}
                </div>
              </div>
              
              {/* Pricing */}
              <div className="text-right flex-shrink-0">
                {hasDailyOption && (
                  <div className="text-xl font-bold text-gray-900">
                    ₹{room.basePriceDaily.toLocaleString('en-IN')}
                    <span className="text-sm font-normal text-gray-500">/night</span>
                  </div>
                )}
                {hasHourlyOption && room.basePriceHourly && (
                  <div className="text-sm text-brand-600 font-medium">
                    ₹{room.basePriceHourly.toLocaleString('en-IN')}/hour
                  </div>
                )}
              </div>
            </div>
            
            {/* Amenities */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {displayedAmenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs rounded-full"
                >
                  {amenityIcons[amenity] || null}
                  {amenityLabels[amenity] || amenity}
                </span>
              ))}
              {remainingAmenities > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-brand-600 text-xs font-medium hover:bg-brand-50 rounded-full transition-colors"
                >
                  +{remainingAmenities} more
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            
            {/* Expanded Amenities */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-gray-100">
                    {room.amenities.slice(4).map((amenity) => (
                      <span
                        key={amenity}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 text-xs rounded-full"
                      >
                        {amenityIcons[amenity] || null}
                        {amenityLabels[amenity] || amenity}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Description (collapsed) */}
            {room.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {room.description}
              </p>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
              {hasDailyOption && (
                <Button 
                  onClick={() => onSelectRoom?.(room.id)}
                  className="flex-1"
                >
                  Book Daily
                </Button>
              )}
              {hasHourlyOption && room.basePriceHourly && (
                <Button
                  variant="outline"
                  onClick={() => onSelectRoom?.(room.id)}
                  className="flex-1"
                >
                  Book Hourly
                </Button>
              )}
              <Link 
                href={`/hotels/${hotelSlug}/rooms/${room.slug}`}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
