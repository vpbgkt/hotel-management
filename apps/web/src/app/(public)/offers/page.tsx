'use client';

/**
 * Hotel Offers & Deals Page - Hotel Manager
 *
 * Displays current promotions, seasonal deals, and special packages
 * from the hotel. Data driven by hotel's offers configuration.
 */

import { useTenant } from '@/lib/tenant/tenant-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Tag,
  Calendar,
  Percent,
  Clock,
  Gift,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  validFrom: string;
  validTo: string;
  code?: string;
  category: 'seasonal' | 'weekend' | 'early-bird' | 'last-minute' | 'package' | 'loyalty';
  isActive: boolean;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  seasonal: { icon: Calendar, color: 'text-green-700', bg: 'bg-green-50' },
  weekend: { icon: Star, color: 'text-purple-700', bg: 'bg-purple-50' },
  'early-bird': { icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50' },
  'last-minute': { icon: Sparkles, color: 'text-red-700', bg: 'bg-red-50' },
  package: { icon: Gift, color: 'text-orange-700', bg: 'bg-orange-50' },
  loyalty: { icon: Tag, color: 'text-indigo-700', bg: 'bg-indigo-50' },
};

// Default offers when hotel hasn't configured custom ones
const defaultOffers: Offer[] = [
  {
    id: '1',
    title: 'Early Bird Special',
    description: 'Book 30+ days in advance and enjoy a special discount on your stay. Perfect for planning ahead!',
    discount: '15% OFF',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    code: 'EARLYBIRD15',
    category: 'early-bird',
    isActive: true,
  },
  {
    id: '2',
    title: 'Weekend Getaway',
    description: 'Make your weekends special! Book a Friday-Sunday stay and get complimentary breakfast for two.',
    discount: '10% OFF + Free Breakfast',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    code: 'WEEKEND10',
    category: 'weekend',
    isActive: true,
  },
  {
    id: '3',
    title: 'Long Stay Package',
    description: 'Stay 7 nights or more and unlock our best rates. Includes daily housekeeping and Wi-Fi.',
    discount: '25% OFF',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    code: 'LONGSTAY25',
    category: 'package',
    isActive: true,
  },
  {
    id: '4',
    title: 'Monsoon Magic',
    description: 'Enjoy the rains with our special monsoon packages. Includes hot beverages and room upgrade.',
    discount: '20% OFF',
    validFrom: '2026-06-01',
    validTo: '2026-09-30',
    category: 'seasonal',
    isActive: true,
  },
  {
    id: '5',
    title: 'Last Minute Deal',
    description: 'Booking within 48 hours? Get an exclusive discount on available rooms. Limited availability!',
    discount: '12% OFF',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    code: 'LASTMIN12',
    category: 'last-minute',
    isActive: true,
  },
  {
    id: '6',
    title: 'Loyalty Reward',
    description: 'Returning guest? Enjoy special pricing on your next booking as a thank you for your loyalty.',
    discount: '18% OFF',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    code: 'LOYAL18',
    category: 'loyalty',
    isActive: true,
  },
];

export default function HotelOffersPage() {
  const { hotel, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // In production, offers would come from hotel.offersConfig or a dedicated API
  const offers = defaultOffers.filter((o) => o.isActive);
  const activeOffers = offers.filter((o) => {
    const now = new Date();
    return new Date(o.validFrom) <= now && new Date(o.validTo) >= now;
  });
  const upcomingOffers = offers.filter((o) => new Date(o.validFrom) > new Date());

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
            <Percent size={16} />
            <span className="text-sm font-medium">Special Offers & Deals</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Exclusive Offers at {hotel?.name || 'Our Hotel'}
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Discover amazing deals and packages curated just for you. Save more on your next stay!
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Active Offers */}
        {activeOffers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Sparkles className="text-yellow-500" size={24} />
              Active Offers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Offers */}
        {upcomingOffers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="text-blue-500" size={24} />
              Upcoming Offers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} upcoming />
              ))}
            </div>
          </section>
        )}

        {/* How to use */}
        <section className="bg-gray-50 rounded-2xl p-8 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How to Use Promo Codes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-700 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">Choose Your Room</h3>
              <p className="text-sm text-gray-600">Browse rooms and select your dates</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-700 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">Apply Promo Code</h3>
              <p className="text-sm text-gray-600">Enter the code during checkout</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-700 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Enjoy Savings</h3>
              <p className="text-sm text-gray-600">Discount applied to your booking</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link href="/rooms">
              Browse Rooms
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, upcoming }: { offer: Offer; upcoming?: boolean }) {
  const config = categoryConfig[offer.category] || categoryConfig.seasonal;
  const Icon = config.icon;

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className={`h-2 ${upcoming ? 'bg-gray-300' : 'bg-gradient-to-r from-blue-500 to-blue-700'}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon size={20} className={config.color} />
          </div>
          <Badge variant={upcoming ? 'secondary' : 'default'} className="text-xs">
            {upcoming ? 'Coming Soon' : offer.discount}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-2 group-hover:text-blue-600 transition-colors">
          {offer.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{offer.description}</p>

        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>
              Valid: {new Date(offer.validFrom).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(offer.validTo).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {offer.code && !upcoming && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Promo Code</p>
              <p className="font-mono font-bold text-blue-700 text-sm">{offer.code}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                navigator.clipboard.writeText(offer.code!);
              }}
            >
              Copy
            </Button>
          </div>
        )}

        {!upcoming && (
          <Button className="w-full mt-4" variant="outline" size="sm" asChild>
            <Link href="/rooms">
              Book Now
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
