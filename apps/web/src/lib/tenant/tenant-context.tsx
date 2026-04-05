'use client';

/**
 * Hotel Tenant Context
 * Provides hotel data and theme configuration to all tenant pages.
 * For dev/demo, we resolve tenant by slug query parameter or use first hotel.
 */

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_HOTEL_BY_SLUG_TENANT } from '@/lib/graphql/queries/tenant';

interface RoomTypeInfo {
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
}

export type HotelTemplateName = 'STARTER' | 'MODERN_MINIMAL' | 'LUXURY_RESORT' | 'HERITAGE_BOUTIQUE';

export interface TenantHotel {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  latitude?: number;
  longitude?: number;
  starRating: number;
  averageRating?: number;
  reviewCount?: number;
  heroImageUrl?: string;
  logoUrl?: string;
  galleryImages?: string[];
  startingPrice?: number;
  bookingModel: 'DAILY' | 'HOURLY' | 'BOTH';
  checkInTime?: string;
  checkOutTime?: string;
  hourlyMinHours?: number;
  hourlyMaxHours?: number;
  amenities?: string[];
  policies?: string[];
  themeConfig?: ThemeConfig;
  template?: HotelTemplateName;
  isVerified?: boolean;
  roomTypes?: RoomTypeInfo[];
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headerStyle?: 'light' | 'dark' | 'transparent';
  heroStyle?: 'full' | 'split' | 'minimal';
}

interface TenantContextType {
  hotel: TenantHotel | null;
  loading: boolean;
  error?: string;
  theme: ThemeConfig;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#f59e0b',
  fontFamily: 'Inter',
  headerStyle: 'transparent',
  heroStyle: 'full',
};

const TenantContext = createContext<TenantContextType>({
  hotel: null,
  loading: true,
  theme: DEFAULT_THEME,
});

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}

/**
 * Apply CSS custom properties based on hotel theme config.
 * Generates a full color palette from a single primary color.
 * CSS variables are consumed by tenant-specific Tailwind utilities.
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generateShades(hex: string): Record<string, string> {
  const hsl = hexToHSL(hex);
  if (!hsl) return {};
  const { h, s } = hsl;
  return {
    '50': `hsl(${h}, ${Math.min(s + 10, 100)}%, 97%)`,
    '100': `hsl(${h}, ${Math.min(s + 5, 100)}%, 93%)`,
    '200': `hsl(${h}, ${s}%, 85%)`,
    '300': `hsl(${h}, ${s}%, 75%)`,
    '400': `hsl(${h}, ${s}%, 60%)`,
    '500': `hsl(${h}, ${s}%, 48%)`,
    '600': hex,
    '700': `hsl(${h}, ${Math.min(s + 5, 100)}%, 38%)`,
    '800': `hsl(${h}, ${Math.min(s + 10, 100)}%, 30%)`,
    '900': `hsl(${h}, ${Math.min(s + 15, 100)}%, 22%)`,
    '950': `hsl(${h}, ${Math.min(s + 20, 100)}%, 14%)`,
  };
}

function applyTheme(theme: ThemeConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (theme.primaryColor) {
    // Generate full palette from primary color
    const shades = generateShades(theme.primaryColor);
    Object.entries(shades).forEach(([shade, value]) => {
      root.style.setProperty(`--tenant-primary-${shade}`, value);
    });
    root.style.setProperty('--tenant-primary', theme.primaryColor);
    root.style.setProperty('--tenant-primary-light', shades['100'] || `${theme.primaryColor}20`);
    root.style.setProperty('--tenant-primary-dark', theme.secondaryColor || shades['800'] || theme.primaryColor);
  }
  if (theme.accentColor) {
    const accentShades = generateShades(theme.accentColor);
    root.style.setProperty('--tenant-accent', theme.accentColor);
    Object.entries(accentShades).forEach(([shade, value]) => {
      root.style.setProperty(`--tenant-accent-${shade}`, value);
    });
  }
  if (theme.fontFamily) {
    root.style.setProperty('--tenant-font', theme.fontFamily);
  }
  // Apply body background for themed pages
  root.style.setProperty('--tenant-bg', theme.primaryColor ? 
    generateShades(theme.primaryColor)['50'] || '#f9fafb' : '#f9fafb');
}

// Hotel slug — set NEXT_PUBLIC_HOTEL_SLUG in .env for production
const DEFAULT_SLUG = process.env.NEXT_PUBLIC_HOTEL_SLUG || 'radhika-resort';

export function TenantProvider({ 
  children, 
  slug 
}: { 
  children: ReactNode;
  slug?: string;
}) {
  const hotelSlug = slug || DEFAULT_SLUG;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error } = useQuery<any>(GET_HOTEL_BY_SLUG_TENANT, {
    variables: { slug: hotelSlug },
    fetchPolicy: 'cache-and-network',
  });

  const hotel: TenantHotel | null = data?.hotelBySlug || null;
  const theme = { ...DEFAULT_THEME, ...(hotel?.themeConfig as ThemeConfig || {}) };

  useEffect(() => {
    applyTheme(theme);
  }, [theme.primaryColor, theme.secondaryColor, theme.accentColor]);

  return (
    <TenantContext.Provider
      value={{
        hotel,
        loading,
        error: error?.message,
        theme,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
