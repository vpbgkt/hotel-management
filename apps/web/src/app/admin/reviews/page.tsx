'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { format } from 'date-fns';
import {
  Star,
  MessageCircle,
  Send,
  Shield,
  ShieldOff,
  User,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HOTEL_ALL_REVIEWS, REPLY_TO_REVIEW } from '@/lib/graphql/queries/reviews';

export default function AdminReviewsPage() {
  const { data, loading: isLoading, refetch } = useQuery<any>(HOTEL_ALL_REVIEWS);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [replyToReview, { loading: replying }] = useMutation(REPLY_TO_REVIEW, {
    onCompleted: () => {
      setReplyingTo(null);
      setReplyText('');
      refetch();
    },
  });

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    replyToReview({
      variables: { input: { reviewId, reply: replyText.trim() } },
    });
  };

  const reviews = data?.hotelAllReviews || [];

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  const publishedCount = reviews.filter((r: any) => r.isPublished).length;
  const pendingCount = reviews.filter((r: any) => !r.isPublished).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage guest reviews and respond to feedback
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Average Rating"
          value={avgRating}
          icon={<Star className="text-amber-500" size={20} />}
        />
        <StatCard
          label="Total Reviews"
          value={String(reviews.length)}
          icon={<MessageCircle className="text-brand-500" size={20} />}
        />
        <StatCard
          label="Published"
          value={String(publishedCount)}
          icon={<Shield className="text-green-500" size={20} />}
        />
        <StatCard
          label="Pending"
          value={String(pendingCount)}
          icon={<ShieldOff className="text-amber-500" size={20} />}
        />
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Guest reviews will appear here after checkout</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {review.guest?.avatarUrl ? (
                      <img
                        src={review.guest.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {review.guest?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        className={
                          s <= review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-200'
                        }
                      />
                    ))}
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      review.isPublished
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {review.isPublished ? 'Published' : 'Pending'}
                  </span>

                  {review.isVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      Verified Stay
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Comment */}
              {review.title && (
                <p className="font-medium text-gray-900">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-gray-600 text-sm">{review.comment}</p>
              )}

              {/* Photos */}
              {review.photos?.length > 0 && (
                <div className="flex gap-2">
                  {review.photos.map((url: string, i: number) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt={`Review photo ${i + 1}`}
                        className="w-20 h-20 rounded-lg object-cover border"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Hotel Reply */}
              {review.hotelReply && (
                <div className="bg-brand-50 rounded-lg p-4 border border-brand-100">
                  <p className="text-xs font-medium text-brand-700 mb-1">
                    Hotel Response
                  </p>
                  <p className="text-sm text-gray-700">{review.hotelReply}</p>
                </div>
              )}

              {/* Reply Form */}
              {replyingTo === review.id ? (
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    rows={2}
                    placeholder="Write your response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleReply(review.id)}
                      isLoading={replying}
                      disabled={!replyText.trim()}
                    >
                      <Send size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                !review.hotelReply && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyingTo(review.id)}
                  >
                    <MessageCircle size={14} />
                    Reply
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
