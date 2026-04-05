/**
 * Luxury Resort Template — Component Index
 */

import type { TemplateComponentSet } from '../types';
import { LuxuryResortHero } from './hero-section';
import { LuxuryResortRooms } from './rooms-section';
import { LuxuryResortAmenities } from './amenities-section';
import { LuxuryResortWhyBook } from './why-book-section';
import { LuxuryResortLocation } from './location-section';
import { LuxuryResortCTA } from './cta-section';

export const LuxuryResortTemplate: TemplateComponentSet = {
  HeroSection: LuxuryResortHero,
  RoomsSection: LuxuryResortRooms,
  AmenitiesSection: LuxuryResortAmenities,
  WhyBookSection: LuxuryResortWhyBook,
  LocationSection: LuxuryResortLocation,
  CTASection: LuxuryResortCTA,
};
