/**
 * Sitemap - Hotel Manager
 * Dynamic sitemap generation for SEO
 * Includes static pages + dynamic hotel pages from API
 */

import { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function getHotelSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            hotels(pagination: { page: 1, limit: 1000 }) {
              hotels {
                slug
              }
            }
          }
        `,
      }),
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    const json = await res.json();
    return json?.data?.hotels?.hotels?.map((h: { slug: string }) => h.slug) || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hotelSlugs = await getHotelSlugs();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/hotels`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic hotel pages
  const hotelPages: MetadataRoute.Sitemap = hotelSlugs.map((slug) => ({
    url: `${BASE_URL}/hotels/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...hotelPages];
}
