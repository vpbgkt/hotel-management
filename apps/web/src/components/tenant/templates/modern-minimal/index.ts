/**
 * Modern Minimal Template — Component Index
 */

export { ModernMinimalHero } from './hero-section';
export { ModernMinimalRooms } from './rooms-section';
export { ModernMinimalAmenities } from './amenities-section';
export { ModernMinimalWhyBook } from './why-book-section';
export { ModernMinimalLocation } from './location-section';
export { ModernMinimalCTA } from './cta-section';

import type { TemplateComponentSet } from '../types';
import { ModernMinimalHero } from './hero-section';
import { ModernMinimalRooms } from './rooms-section';
import { ModernMinimalAmenities } from './amenities-section';
import { ModernMinimalWhyBook } from './why-book-section';
import { ModernMinimalLocation } from './location-section';
import { ModernMinimalCTA } from './cta-section';

export const ModernMinimalTemplate: TemplateComponentSet = {
  HeroSection: ModernMinimalHero,
  RoomsSection: ModernMinimalRooms,
  AmenitiesSection: ModernMinimalAmenities,
  WhyBookSection: ModernMinimalWhyBook,
  LocationSection: ModernMinimalLocation,
  CTASection: ModernMinimalCTA,
};
