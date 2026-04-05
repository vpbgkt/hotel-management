'use client';

/**
 * My Reviews Page - Hotel Manager Dashboard
 * Shows guest's reviews history with ratings
 * Wired to real GraphQL API
 */

import { useQuery } from '@apollo/client/react';
import { MY_REVIEWS } from '@/lib/graphql/queries/user';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Star, 
  Loader2, 
  MessageSquare,
  Hotel,
  Calendar,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react';

export default function GuestReviewsPage() {
  const { user } = useAuth();

  const { data, loading, error } = useQuery<{ myReviews: any[] }>(MY_REVIEWS, {
    variables: { limit: 50, offset: 0 },
    skip: !user,
  });

  const reviews = data?.myReviews || [];

  // Stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0';
  const verifiedCount = reviews.filter((r: any) => r.isVerified).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-600 mt-1">Reviews you&apos;ve written for hotels you&apos;ve stayed at</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : totalReviews}</p>
            <p className="text-sm text-gray-500">Total Reviews</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star size={18} className="text-amber-400 fill-amber-400" />
              <p className="text-2xl font-bold text-gray-900">{loading ? '-' : avgRating}</p>
            </div>
            <p className="text-sm text-gray-500">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : verifiedCount}</p>
            <p className="text-sm text-gray-500">Verified Stays</p>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load reviews. Please try again.
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{review.rating}/5</span>
                      {review.isVerified && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} />
                          Verified Stay
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {review.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{review.title}</h3>
                    )}

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                    )}

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <ImageIcon size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{review.photos.length} photo(s)</span>
                      </div>
                    )}

                    {/* Hotel Reply */}
                    {review.hotelReply && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <p className="text-xs font-medium text-blue-700 mb-1">Hotel Response</p>
                        <p className="text-sm text-blue-800">{review.hotelReply}</p>
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar size={14} />
                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${
                      review.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {review.isPublished ? 'Published' : 'Pending'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
            <p className="mt-2 text-gray-500">
              After completing a stay, you can leave a review for the hotel.
            </p>
            <Button asChild className="mt-6">
              <Link href="/rooms">Browse Rooms</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
