'use client';

/**
 * Hotel Tenant — Gallery Page
 * Photo gallery with lightbox viewer
 */

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { useTenant } from '@/lib/tenant/tenant-context';

export default function TenantGalleryPage() {
  const { hotel, loading, theme } = useTenant();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (loading || !hotel) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Collect all images: hero, gallery, room images
  const allImages: { url: string; label: string }[] = [];
  if (hotel.heroImageUrl) allImages.push({ url: hotel.heroImageUrl, label: 'Hotel' });
  (hotel.galleryImages || []).forEach((img, i) => allImages.push({ url: img, label: `Gallery ${i + 1}` }));
  (hotel.roomTypes || []).forEach((rt) => {
    (rt.images || []).forEach((img, i) =>
      allImages.push({ url: img, label: `${rt.name} ${i + 1}` })
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-12 text-white"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'}, ${theme.secondaryColor || '#1e40af'})`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Photo Gallery</h1>
          <p className="text-white/80">{allImages.length} photos of {hotel.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {allImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200"
              >
                <Image
                  src={img.url}
                  alt={img.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.label}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No photos available yet.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && allImages[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() =>
              setLightboxIndex((i) => (i! > 0 ? i! - 1 : allImages.length - 1))
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative w-[90vw] h-[80vh]">
            <Image
              src={allImages[lightboxIndex].url}
              alt={allImages[lightboxIndex].label}
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={() =>
              setLightboxIndex((i) => (i! < allImages.length - 1 ? i! + 1 : 0))
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {allImages[lightboxIndex].label} — {lightboxIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
