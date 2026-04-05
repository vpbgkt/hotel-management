/**
 * Shared types for hotel website templates.
 * Each template implements these component interfaces.
 */

import type { TenantHotel, ThemeConfig } from '@/lib/tenant/tenant-context';

export interface TemplateProps {
  hotel: TenantHotel;
  theme: ThemeConfig;
}

export interface HeroSectionProps extends TemplateProps {
  checkIn: string;
  checkOut: string;
  guests: number;
  onCheckInChange: (v: string) => void;
  onCheckOutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
}

export interface RoomsSectionProps extends TemplateProps {}

export interface AmenitiesSectionProps extends TemplateProps {}

export interface WhyBookSectionProps extends TemplateProps {}

export interface LocationSectionProps extends TemplateProps {}

export interface CTASectionProps extends TemplateProps {}

export interface TemplateComponentSet {
  HeroSection: React.ComponentType<HeroSectionProps>;
  RoomsSection: React.ComponentType<RoomsSectionProps>;
  AmenitiesSection: React.ComponentType<AmenitiesSectionProps>;
  WhyBookSection: React.ComponentType<WhyBookSectionProps>;
  LocationSection: React.ComponentType<LocationSectionProps>;
  CTASection: React.ComponentType<CTASectionProps>;
}
