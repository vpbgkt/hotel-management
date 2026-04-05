/**
 * Web App Manifest - Hotel PWA
 * Next.js metadata file API for manifest.json
 */

import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'My Hotel',
    short_name: process.env.NEXT_PUBLIC_APP_NAME || 'Hotel',
    description: 'Book rooms, check availability, and manage your stay.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['travel', 'booking', 'hotels'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/home.png',
        sizes: '1280x720',
        type: 'image/png',
      },
    ],
  };
}
