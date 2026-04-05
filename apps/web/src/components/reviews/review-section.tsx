'use client';

/**
 * Review Section Component
 * Displays hotel reviews with ratings breakdown
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Star, 
  ThumbsUp, 
  MessageCircle,
  ChevronDown,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  guest: {
    name: string;
    avatarUrl?: string;
  };
  response?: {
    comment: string;
    createdAt: string;
  };
}

interface ReviewSectionProps {
  hotelId: string;
  averageRating?: number;
  reviewCount?: number;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: Review[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function ReviewSection({
  hotelId,
  averageRating = 0,
  reviewCount = 0,
  ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  reviews,
  onLoadMore,
  hasMore = false,
  loading = false,
}: ReviewSectionProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const toggleReviewExpansion = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const totalRatings = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);

  const getRatingLabel = (rating: number): string => {
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 4) return 'Excellent';
    if (rating >= 3.5) return 'Very Good';
    if (rating >= 3) return 'Good';
    if (rating >= 2) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Guest Reviews</h2>
          {reviewCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Based on {reviewCount} verified guest review{reviewCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        {/* Sort Dropdown */}
        {reviews.length > 1 && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        )}
      </div>

      {reviewCount > 0 ? (
        <>
          {/* Rating Summary */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Overall Rating */}
              <div className="text-center md:pr-6 md:border-r border-gray-200">
                <div className="text-5xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {getRatingLabel(averageRating)}
                </p>
              </div>

              {/* Rating Breakdown */}
              <div className="flex-1 space-y-2">
                {([5, 4, 3, 2, 1] as const).map((rating) => {
                  const count = ratingBreakdown[rating];
                  const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm text-gray-600">{rating}</span>
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: (5 - rating) * 0.1 }}
                          className="h-full bg-yellow-400 rounded-full"
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isExpanded={expandedReviews.has(review.id)}
                onToggle={() => toggleReviewExpansion(review.id)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Reviews'}
              </Button>
            </div>
          )}
        </>
      ) : (
        /* No Reviews */
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reviews yet
          </h3>
          <p className="text-gray-500">
            Be the first to review this hotel after your stay
          </p>
        </div>
      )}
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  isExpanded: boolean;
  onToggle: () => void;
}

function ReviewCard({ review, isExpanded, onToggle }: ReviewCardProps) {
  const hasLongComment = review.comment && review.comment.length > 300;
  const displayComment = hasLongComment && !isExpanded
    ? review.comment!.slice(0, 300) + '...'
    : review.comment;

  const guestName = review.guest?.name || 'Anonymous';
  const guestAvatar = review.guest?.avatarUrl;

  return (
    <div className="border-b border-gray-100 pb-6 last:border-0">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {guestAvatar ? (
            <Image
              src={guestAvatar}
              alt={guestName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-gray-900">{guestName}</h4>
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), 'MMMM yyyy')}
              </p>
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Comment */}
          {review.comment && (
            <div className="mt-3">
              <p className="text-gray-600 leading-relaxed">{displayComment}</p>
              {hasLongComment && (
                <button
                  onClick={onToggle}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium mt-2 flex items-center gap-1"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Hotel Response */}
          <AnimatePresence>
            {review.response && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pl-4 border-l-2 border-brand-200 bg-brand-50 rounded-r-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-brand-700">
                    Response from the hotel
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(review.response.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{review.response.comment}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ThumbsUp className="w-4 h-4" />
              Helpful
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
