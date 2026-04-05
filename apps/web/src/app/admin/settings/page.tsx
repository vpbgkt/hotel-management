'use client';

/**
 * Admin Hotel Settings - Hotel Manager
 * Edit hotel details, contact info, and configuration
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import { GET_HOTEL_BY_ID } from '@/lib/graphql/queries/hotels';
import { UPDATE_HOTEL } from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Hotel,
  MapPin,
  Phone,
  Clock,
  Image as ImageIcon,
  CalendarDays,
  Download,
  FileCode,
} from 'lucide-react';

interface HotelData {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  whatsapp?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  starRating: number;
  bookingModel: string;
  checkInTime: string;
  checkOutTime: string;
  hourlyMinHours: number;
  hourlyMaxHours: number;
  latitude?: number;
  longitude?: number;
}

export default function AdminSettingsPage() {
  const { user, accessToken } = useAuth();
  const hotelId = user?.hotelId;
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState<'starter' | 'static' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error } = useQuery<any>(GET_HOTEL_BY_ID, {
    variables: { id: hotelId },
    skip: !hotelId,
  });

  const [updateHotel, { loading: saving }] = useMutation(UPDATE_HOTEL, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [form, setForm] = useState<Partial<HotelData>>({});

  useEffect(() => {
    if (data?.hotel) {
      const h = data.hotel;
      setForm({
        name: h.name,
        description: h.description || '',
        address: h.address,
        city: h.city,
        state: h.state,
        pincode: h.pincode,
        phone: h.phone,
        email: h.email,
        whatsapp: h.whatsapp || '',
        heroImageUrl: h.heroImageUrl || '',
        logoUrl: h.logoUrl || '',
        starRating: h.starRating,
        bookingModel: h.bookingModel || 'DAILY',
        checkInTime: h.checkInTime,
        checkOutTime: h.checkOutTime,
        hourlyMinHours: h.hourlyMinHours ?? 3,
        hourlyMaxHours: h.hourlyMaxHours ?? 12,
        latitude: h.latitude,
        longitude: h.longitude,
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHotel({
      variables: {
        input: {
          hotelId,
          name: form.name,
          description: form.description || undefined,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          phone: form.phone,
          email: form.email,
          whatsapp: form.whatsapp || undefined,
          heroImageUrl: form.heroImageUrl || undefined,
          logoUrl: form.logoUrl || undefined,
          starRating: form.starRating,
          bookingModel: form.bookingModel,
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          hourlyMinHours: form.bookingModel !== 'DAILY' ? form.hourlyMinHours : undefined,
          hourlyMaxHours: form.bookingModel !== 'DAILY' ? form.hourlyMaxHours : undefined,
          latitude: form.latitude ? Number(form.latitude) : undefined,
          longitude: form.longitude ? Number(form.longitude) : undefined,
        },
      },
    });
  };

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const downloadExport = async (type: 'starter' | 'static') => {
    if (!hotelId || !accessToken) {
      setExportError('Please login again to download export packages.');
      return;
    }

    setExportError(null);
    setExporting(type);

    try {
      const endpoint = type === 'starter' ? 'starter-kit' : 'site.zip';
      const configuredApiBase = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const normalizedBase = configuredApiBase.replace(/\/graphql\/?$/, '').replace(/\/$/, '');
      const response = await fetch(`${normalizedBase}/api/export/${hotelId}/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^\"]+)"?/i);
      const fallback = type === 'starter' ? 'hotel-starter-kit.zip' : 'hotel-site.zip';
      const filename = filenameMatch?.[1] || fallback;

      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to download export package');
    } finally {
      setExporting(null);
    }
  };

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Hotel</h2>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotel Settings</h1>
          <p className="text-gray-500 mt-1">Update your hotel information</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Saved successfully
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Hotel className="w-4 h-4 text-brand-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
              <select
                value={form.starRating || 3}
                onChange={(e) => updateField('starRating', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-600" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode || ''}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.latitude || ''}
                  onChange={(e) => updateField('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g., 20.7217"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.longitude || ''}
                  onChange={(e) => updateField('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g., 70.9876"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={form.whatsapp || ''}
                  onChange={(e) => updateField('whatsapp', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Check-in/out Times */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Check-in / Check-out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                <input
                  type="time"
                  value={form.checkInTime || '14:00'}
                  onChange={(e) => updateField('checkInTime', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                <input
                  type="time"
                  value={form.checkOutTime || '12:00'}
                  onChange={(e) => updateField('checkOutTime', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Model Configuration */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-600" />
              Booking Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'DAILY', label: 'Daily Only', desc: 'Traditional check-in/check-out by date' },
                  { value: 'HOURLY', label: 'Hourly Only', desc: 'Book rooms by the hour' },
                  { value: 'BOTH', label: 'Both', desc: 'Guests choose daily or hourly' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('bookingModel', opt.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      form.bookingModel === opt.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {form.bookingModel !== 'DAILY' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-blue-800">Hourly Booking Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Hours
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={form.hourlyMinHours ?? 3}
                      onChange={(e) => updateField('hourlyMinHours', parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum booking duration</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Hours
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={form.hourlyMaxHours ?? 12}
                      onChange={(e) => updateField('hourlyMaxHours', parseInt(e.target.value) || 12)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum booking duration</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  Hourly pricing is set per room type in the Rooms section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-600" />
              Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
              <input
                type="url"
                value={form.heroImageUrl || ''}
                onChange={(e) => updateField('heroImageUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
              {form.heroImageUrl && (
                <div className="mt-2 w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={form.logoUrl || ''}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Source Export Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-600" />
            Client Handoff / Source Export
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Download ready-to-share packages for your hotel website. These exports do not include platform database credentials.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900">Next.js Starter Kit</h4>
              <p className="text-sm text-gray-500 mt-1">
                Share this with radhikaresort.in to run their own site frontend with hotel-scoped API access.
              </p>
              <Button
                type="button"
                className="mt-3"
                onClick={() => downloadExport('starter')}
                disabled={exporting !== null}
              >
                {exporting === 'starter' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Starter Kit
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900">Static Site Export</h4>
              <p className="text-sm text-gray-500 mt-1">
                Download static HTML/CSS export for quick deployment or backup sharing.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => downloadExport('static')}
                disabled={exporting !== null}
              >
                {exporting === 'static' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Static ZIP
              </Button>
            </div>
          </div>

          {exportError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {exportError}
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
            Share only the downloaded package and hotel-scoped API key. Do not share platform database URL, Redis URL, or JWT secrets.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


