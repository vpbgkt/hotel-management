'use client';

/**
 * Reusable search/booking widget used across all templates.
 * Variants: 'default' | 'minimal' | 'luxury'
 */

import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeColor } from '@/lib/security/sanitize';
import type { ThemeConfig } from '@/lib/tenant/tenant-context';

interface SearchWidgetProps {
  theme: ThemeConfig;
  checkIn: string;
  checkOut: string;
  guests: number;
  onCheckInChange: (v: string) => void;
  onCheckOutChange: (v: string) => void;
  onGuestsChange: (v: number) => void;
  variant?: 'default' | 'minimal' | 'luxury';
}

export function SearchWidget({
  theme, checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
  variant = 'default',
}: SearchWidgetProps) {
  const primary = sanitizeColor(theme.primaryColor, '#2563eb');
  const today = format(new Date(), 'yyyy-MM-dd');

  const containerClass = variant === 'minimal'
    ? 'bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/5 border border-gray-100/80 p-5 md:p-6'
    : variant === 'luxury'
      ? 'bg-white rounded-none shadow-xl border-t-2 p-5 md:p-8'
      : 'bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-6';

  return (
    <div className={containerClass} style={variant === 'luxury' ? { borderTopColor: primary } : undefined}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Check-in
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={checkIn}
              onChange={(e) => onCheckInChange(e.target.value)}
              min={today}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent transition-shadow"
              style={{ '--tw-ring-color': `${primary}40` } as React.CSSProperties}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Check-out
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => onCheckOutChange(e.target.value)}
              min={checkIn}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent transition-shadow"
              style={{ '--tw-ring-color': `${primary}40` } as React.CSSProperties}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Guests
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={guests}
              onChange={(e) => onGuestsChange(Number(e.target.value))}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:border-transparent appearance-none bg-white transition-shadow"
              style={{ '--tw-ring-color': `${primary}40` } as React.CSSProperties}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Link href={`/rooms?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`}>
          <Button
            className="w-full py-2.5 text-sm font-medium"
            style={{ backgroundColor: primary }}
          >
            Check Availability
          </Button>
        </Link>
      </div>
    </div>
  );
}
