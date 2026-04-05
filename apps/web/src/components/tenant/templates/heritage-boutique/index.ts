/**
 * Heritage Boutique Template — Component Index
 */

import type { TemplateComponentSet } from '../types';
import { HeritageBoutiqueHero } from './hero-section';
import { HeritageBoutiqueRooms } from './rooms-section';
import { HeritageBoutiqueAmenities } from './amenities-section';
import { HeritageBoutiqueWhyBook } from './why-book-section';
import { HeritageBoutiqueLocation } from './location-section';
import { HeritageBoutiqueCTA } from './cta-section';

export const HeritageBoutiqueTemplate: TemplateComponentSet = {
  HeroSection: HeritageBoutiqueHero,
  RoomsSection: HeritageBoutiqueRooms,
  AmenitiesSection: HeritageBoutiqueAmenities,
  WhyBookSection: HeritageBoutiqueWhyBook,
  LocationSection: HeritageBoutiqueLocation,
  CTASection: HeritageBoutiqueCTA,
};
