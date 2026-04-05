'use client';

/**
 * Hotel Tenant — Blog Listing Page
 * 
 * Shows published blog posts for the hotel with category filtering and search.
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { Search, Calendar, Tag, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLOG_POSTS } from '@/lib/graphql/queries/blog';
import { useTenant } from '@/lib/tenant/tenant-context';

const CATEGORIES = [
  { value: '', label: 'All Posts' },
  { value: 'travel-tips', label: 'Travel Tips' },
  { value: 'city-guides', label: 'City Guides' },
  { value: 'hotel-news', label: 'Hotel News' },
  { value: 'food-dining', label: 'Food & Dining' },
  { value: 'events', label: 'Events' },
  { value: 'local-attractions', label: 'Local Attractions' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getReadingTime(content?: string) {
  if (!content) return '3 min read';
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function BlogPage() {
  const { hotel: tenant } = useTenant();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery<any>(BLOG_POSTS, {
    variables: {
      hotelId: tenant?.id,
      category: category || undefined,
      search: search || undefined,
      page,
      limit: 9,
    },
  });

  const posts = data?.blogPosts?.posts || [];
  const totalPages = data?.blogPosts?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-20">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-300" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Blog</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Travel tips, city guides, and stories from {tenant?.name || 'our hotel'}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-xl" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No articles found</h3>
            <p className="text-gray-400">
              {search || category ? 'Try different search terms or categories' : 'Check back soon for new content!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post: any) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-indigo-100 overflow-hidden">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpen className="w-12 h-12 text-blue-300" />
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                        {post.category.replace(/-/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                      <span>·</span>
                      <span>{getReadingTime(post.excerpt)}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="inline-flex items-center text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
