'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Camera, X, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CREATE_REVIEW } from '@/lib/graphql/queries/reviews';

interface ReviewFormProps {
  bookingId: string;
  hotelName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewForm({ bookingId, hotelName, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [createReview, { loading }] = useMutation(CREATE_REVIEW, {
    onCompleted: () => {
      setSubmitted(true);
      onSuccess?.();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setError('');
    createReview({
      variables: {
        input: {
          bookingId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
          photos: photos.length > 0 ? photos : undefined,
        },
      },
    });
  };

  const addPhoto = () => {
    if (photoUrl.trim() && photos.length < 5) {
      setPhotos([...photos, photoUrl.trim()]);
      setPhotoUrl('');
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-gray-600 mb-6">
            Your review has been submitted and will be published after moderation.
          </p>
          <Button onClick={onClose}>Done</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold">Write a Review</h3>
            <p className="text-sm text-gray-500 mt-1">{hotelName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Your Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onMouseEnter={() => setHoverRating(r)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(r)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={36}
                  className={
                    r <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {rating === 5
                ? 'Excellent!'
                : rating === 4
                  ? 'Very Good'
                  : rating === 3
                    ? 'Average'
                    : rating === 2
                      ? 'Below Average'
                      : 'Poor'}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Review Title
          </label>
          <Input
            placeholder="Summarize your experience"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Your Review
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Tell others about your experience. What did you like? What could be improved?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {comment.length}/1000
          </p>
        </div>

        {/* Photos */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Photos (optional)
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              leftIcon={<Camera size={16} />}
              placeholder="Paste image URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addPhoto}
              disabled={!photoUrl.trim() || photos.length >= 5}
            >
              Add
            </Button>
          </div>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border"
                  />
                  <button
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Up to 5 photos</p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={loading}>
            <Send size={16} />
            Submit Review
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
