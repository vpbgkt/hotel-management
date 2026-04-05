'use client';

/**
 * Hotel Tenant — About & Contact Page
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Shield,
  MapPin,
  Clock,
  Users,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Car,
  UtensilsCrossed,
  Waves,
  Dumbbell,
  Heart,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/lib/tenant/tenant-context';

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-6 h-6" />,
  ac: <Wind className="w-6 h-6" />,
  tv: <Tv className="w-6 h-6" />,
  minibar: <Coffee className="w-6 h-6" />,
  parking: <Car className="w-6 h-6" />,
  restaurant: <UtensilsCrossed className="w-6 h-6" />,
  pool: <Waves className="w-6 h-6" />,
  gym: <Dumbbell className="w-6 h-6" />,
  'room-service': <Coffee className="w-6 h-6" />,
  spa: <Heart className="w-6 h-6" />,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Free WiFi',
  ac: 'Air Conditioning',
  tv: 'Smart TV',
  minibar: 'Mini Bar',
  parking: 'Free Parking',
  restaurant: 'On-site Restaurant',
  pool: 'Swimming Pool',
  gym: 'Fitness Center',
  'room-service': '24/7 Room Service',
  spa: 'Spa & Wellness',
  breakfast: 'Complimentary Breakfast',
  laundry: 'Laundry Service',
};

export default function TenantAboutPage() {
  const { hotel, loading, theme } = useTenant();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  if (loading || !hotel) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const roomCount = hotel.roomTypes?.reduce((sum, r) => sum + r.totalRooms, 0) || 0;
  const roomTypeCount = hotel.roomTypes?.filter((r) => r.isActive).length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[300px]">
        {hotel.heroImageUrl ? (
          <Image src={hotel.heroImageUrl} alt={hotel.name} fill className="object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'}, ${theme.secondaryColor || '#1e40af'})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">About {hotel.name}</h1>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Description */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h2>
          <p className="text-gray-600 leading-relaxed text-lg">
            {hotel.description ||
              `Welcome to ${hotel.name}, a ${hotel.starRating}-star property located in the heart of ${hotel.city}, ${hotel.state}. We pride ourselves on offering exceptional hospitality, comfortable accommodations, and memorable experiences for all our guests.`}
          </p>
        </section>

        {/* Quick Facts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Facts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Star className="w-5 h-5" />, label: 'Star Rating', value: `${hotel.starRating} Stars` },
              { icon: <MapPin className="w-5 h-5" />, label: 'Location', value: `${hotel.city}, ${hotel.state}` },
              { icon: <Users className="w-5 h-5" />, label: 'Rooms', value: `${roomCount} rooms, ${roomTypeCount} types` },
              { icon: <Clock className="w-5 h-5" />, label: 'Check-in', value: hotel.checkInTime || '2:00 PM' },
            ].map((fact, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl">
                <div className="mb-2" style={{ color: theme.primaryColor || '#2563eb' }}>{fact.icon}</div>
                <div className="text-xs text-gray-500 mb-1">{fact.label}</div>
                <div className="font-medium text-gray-900 text-sm">{fact.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Amenities & Facilities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities & Facilities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {hotel.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <span style={{ color: theme.primaryColor || '#2563eb' }}>
                    {AMENITY_ICONS[amenity] || <Star className="w-6 h-6" />}
                  </span>
                  <span className="font-medium text-gray-700">
                    {AMENITY_LABELS[amenity] || amenity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Policies */}
        {hotel.policies && hotel.policies.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Hotel Policies</h2>
            <ul className="space-y-3">
              {hotel.policies.map((policy, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
                  <span>{policy}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── Contact Section ─── */}
        <section id="contact" className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{hotel.name}</h3>
                <div className="space-y-4">
                  {hotel.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
                      <div>
                        <p className="font-medium text-gray-900">{hotel.address}</p>
                        <p className="text-sm text-gray-600">{hotel.city}, {hotel.state} — {hotel.pincode}</p>
                      </div>
                    </div>
                  )}
                  {hotel.phone && (
                    <a href={`tel:${hotel.phone}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <Phone className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
                      <span className="text-gray-700">{hotel.phone}</span>
                    </a>
                  )}
                  {hotel.email && (
                    <a href={`mailto:${hotel.email}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <Mail className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
                      <span className="text-gray-700">{hotel.email}</span>
                    </a>
                  )}
                  {hotel.whatsapp && (
                    <a
                      href={`https://wa.me/${hotel.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <MessageCircle className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor || '#2563eb' }} />
                      <span className="text-gray-700">WhatsApp: {hotel.whatsapp}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Hours */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: theme.primaryColor || '#2563eb' }} />
                  Front Desk Hours
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex justify-between"><span>Front Desk</span><span className="font-medium text-gray-900">24 hours</span></li>
                  <li className="flex justify-between"><span>Check-in</span><span className="font-medium text-gray-900">{hotel.checkInTime || '2:00 PM'}</span></li>
                  <li className="flex justify-between"><span>Check-out</span><span className="font-medium text-gray-900">{hotel.checkOutTime || '11:00 AM'}</span></li>
                </ul>
              </div>

              {/* Map */}
              {hotel.latitude && hotel.longitude && (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <iframe
                    title="Hotel Location"
                    src={`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15&output=embed`}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 rounded-xl p-6 h-fit">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Send a Message</h3>

              {submitted && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-2 text-sm">
                  <Check className="w-5 h-5" />
                  Thank you! Your message has been sent. We&apos;ll get back to you soon.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Your name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: theme.primaryColor || undefined }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Book?</h2>
          <p className="text-gray-600 mb-6">Browse our rooms and find the perfect one for your stay.</p>
          <Link href="/rooms">
            <Button size="lg" style={{ backgroundColor: theme.primaryColor || undefined }}>
              View Rooms & Suites
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
