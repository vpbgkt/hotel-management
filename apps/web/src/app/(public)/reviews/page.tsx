'use client';

/**
 * Hotel Tenant — Reviews Page
 * Shows all guest reviews with stats and pagination
 */

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Star, MessageSquare, ThumbsUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/lib/tenant/tenant-context';
import { GET_TENANT_REVIEWS } from '@/lib/graphql/queries/tenant';

export default function TenantReviewsPage() {
  const { hotel, loading: hotelLoading, theme } = useTenant();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const limit = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading } = useQuery<any>(GET_TENANT_REVIEWS, {
    variables: {
      hotelId: hotel?.id,
      page,
      limit,
      sortBy,
    },
    skip: !hotel?.id,
    fetchPolicy: 'cache-and-network',
  });

  const reviews = data?.hotelReviews?.reviews || [];
  const total = data?.hotelReviews?.total || 0;
  const stats = data?.hotelReviewStats;

  if (hotelLoading || !hotel) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-12 text-white"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor || '#2563eb'}, ${theme.secondaryColor || '#1e40af'})`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Guest Reviews</h1>
          <p className="text-white/80">See what our guests have to say about {hotel.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Overall rating */}
              <div className="text-center md:text-left">
                <div className="text-5xl font-bold text-gray-900 mb-1">
                  {stats.averageRating?.toFixed(1) || '—'}
                </div>
                <div className="flex items-center gap-1 justify-center md:justify-start mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= Math.round(stats.averageRating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500">Based on {stats.totalReviews} reviews</p>
              </div>

              {/* Distribution */}
              <div className="space-y-2">
                {(stats.distribution || [])
                  .sort((a: { rating: number }, b: { rating: number }) => b.rating - a.rating)
                  .map((d: { rating: number; count: number; percentage: number }) => (
                    <div key={d.rating} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-6">{d.rating}★</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.percentage}%`,
                            backgroundColor: theme.primaryColor || '#2563eb',
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{d.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Sort & Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{total} review{total !== 1 ? 's' : ''}</p>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          {loading && reviews.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))
          ) : reviews.length > 0 ? (
            reviews.map((review: {
              id: string;
              rating: number;
              title?: string;
              comment?: string;
              hotelReply?: string;
              isVerified?: boolean;
              createdAt: string;
              guest: { name: string; avatarUrl?: string };
            }) => (
              <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-600">
                    {review.guest.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{review.guest.name}</span>
                      {review.isVerified && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          Verified Stay
                        </span>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {review.title && (
                      <h3 className="font-medium text-gray-900 mb-1">{review.title}</h3>
                    )}
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    )}

                    {/* Hotel reply */}
                    {review.hotelReply && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Response from {hotel.name}</p>
                        <p className="text-sm text-gray-600">{review.hotelReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reviews yet.</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to share your experience!</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
