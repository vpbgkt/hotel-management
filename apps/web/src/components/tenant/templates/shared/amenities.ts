/**
 * Shared amenity icons and labels used across all templates.
 */

import {
  Wifi, Wind, Tv, Coffee, Car, UtensilsCrossed,
  Waves, Dumbbell, Heart, Star,
} from 'lucide-react';
import React from 'react';

export const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: React.createElement(Wifi, { className: 'w-5 h-5' }),
  ac: React.createElement(Wind, { className: 'w-5 h-5' }),
  tv: React.createElement(Tv, { className: 'w-5 h-5' }),
  minibar: React.createElement(Coffee, { className: 'w-5 h-5' }),
  parking: React.createElement(Car, { className: 'w-5 h-5' }),
  restaurant: React.createElement(UtensilsCrossed, { className: 'w-5 h-5' }),
  pool: React.createElement(Waves, { className: 'w-5 h-5' }),
  gym: React.createElement(Dumbbell, { className: 'w-5 h-5' }),
  'room-service': React.createElement(Coffee, { className: 'w-5 h-5' }),
  spa: React.createElement(Heart, { className: 'w-5 h-5' }),
};

export const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Smart TV',
  minibar: 'Mini Bar',
  parking: 'Free Parking',
  restaurant: 'Restaurant',
  pool: 'Swimming Pool',
  gym: 'Fitness Center',
  'room-service': 'Room Service',
  spa: 'Spa & Wellness',
  breakfast: 'Breakfast Included',
  balcony: 'Private Balcony',
  safe: 'In-room Safe',
  laundry: 'Laundry Service',
};

export function getAmenityIcon(amenity: string): React.ReactNode {
  return AMENITY_ICONS[amenity] || React.createElement(Star, { className: 'w-5 h-5' });
}

export function getAmenityLabel(amenity: string): string {
  return AMENITY_LABELS[amenity] || amenity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
