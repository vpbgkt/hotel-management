'use client';

/**
 * Tenant Footer Component
 * Hotel-specific branded footer
 */

import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
import { useTenant } from '@/lib/tenant/tenant-context';

export function TenantFooter() {
  const { hotel, theme } = useTenant();
  const year = new Date().getFullYear();

  if (!hotel) return null;

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
              >
                {hotel.name.charAt(0)}
              </div>
              <span className="text-xl font-bold text-white">{hotel.name}</span>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              {hotel.tagline || hotel.description?.slice(0, 120) || 'Your perfect getaway destination.'}
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-sm hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/rooms" className="text-sm hover:text-white transition-colors">Rooms & Suites</Link></li>
              <li><Link href="/gallery" className="text-sm hover:text-white transition-colors">Gallery</Link></li>
              <li><Link href="/reviews" className="text-sm hover:text-white transition-colors">Guest Reviews</Link></li>
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/about#contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>{hotel.address}, {hotel.city}, {hotel.state} {hotel.pincode}</span>
              </li>
              {hotel.phone && (
                <li className="flex items-center gap-2.5 text-sm">
                  <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <a href={`tel:${hotel.phone}`} className="hover:text-white transition-colors">{hotel.phone}</a>
                </li>
              )}
              {hotel.email && (
                <li className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <a href={`mailto:${hotel.email}`} className="hover:text-white transition-colors">{hotel.email}</a>
                </li>
              )}
            </ul>
          </div>

          {/* Hours & Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Stay Info</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div>
                  <div className="text-gray-400 text-xs">Check-in</div>
                  <div>{hotel.checkInTime || '2:00 PM'}</div>
                </div>
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <div>
                  <div className="text-gray-400 text-xs">Check-out</div>
                  <div>{hotel.checkOutTime || '11:00 AM'}</div>
                </div>
              </li>
              {hotel.startingPrice && (
                <li className="text-sm">
                  <span className="text-gray-400">Starting from </span>
                  <span className="text-white font-semibold">₹{hotel.startingPrice.toLocaleString('en-IN')}</span>
                  <span className="text-gray-400">/night</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; {year} {hotel.name}. All rights reserved.</p>
          <p>Powered by <a href="https://hotel.local" className="text-gray-400 hover:text-white transition-colors">Hotel Manager</a></p>
        </div>
      </div>
    </footer>
  );
}
