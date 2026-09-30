import React, { useState } from 'react';
import { Star, X, Check, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReviewFormProps {
  productName: string;
  productImage: string;
  productSlug: string;
  onClose: () => void;
  onSubmit: (review: ReviewData) => void;
}

interface ReviewData {
  rating: number;
  title: string;
  comment: string;
  name: string;
  email: string;
  verified: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  productName,
  productImage,
  productSlug,
  onClose,
  onSubmit
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ratingLabels = [
    'Select a rating',
    'Poor',
    'Fair', 
    'Good',
    'Very Good',
    'Excellent'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }
    if (!title.trim()) {
      newErrors.title = 'Please enter a review title';
    }
    if (!comment.trim()) {
      newErrors.comment = 'Please write your review';
    }
    if (!name.trim()) {
      newErrors.name = 'Please enter your name';
    }
    if (!email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send review to backend endpoint
      const response = await fetch('/.netlify/functions/reviews-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_slug: productSlug,
          reviewer_name: name.trim(),
          reviewer_email: email.trim(),
          rating: Number(rating),
          title: title.trim() || null,
          body: comment.trim(),
          images: [], // Can be extended later for image uploads
          is_verified_buyer: false
        }),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { ok: false, error: responseText };
      }

      if (!response.ok) {
        throw new Error(result.error || result.body || 'Failed to submit review');
      }

      // Call the onSubmit callback for UI updates
      const reviewData: ReviewData = {
        rating,
        title: title.trim(),
        comment: comment.trim(),
        name: name.trim(),
        email: email.trim(),
        verified: false
      };
      
      onSubmit(reviewData);
      
      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      setName('');
      setEmail('');
      setErrors({});
      
    } catch (error: any) {
      console.error('Error submitting review:', error);
      setErrors({ 
        comment: error.message || 'Failed to submit review. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-pink-500" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Write a Review</h2>
              <p className="text-xs md:text-sm text-gray-600">Share your experience with others</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close review form"
          >
            <X className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
          </button>
        </div>

        {/* Product Info */}
        <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <img
              src={productImage}
              alt={productName}
              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">{productName}</h3>
              <p className="text-xs md:text-sm text-gray-600">Reviewing: {productSlug}</p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2 md:mb-3">
              Overall Rating *
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 md:h-8 md:w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-current'
                          : 'text-gray-300'
                      }`}
                      style={{ color: star <= (hoveredRating || rating) ? '#F59E0B' : undefined }}
                    />
                  </button>
                ))}
              </div>
              <span className="ml-2 md:ml-3 text-xs md:text-sm font-medium text-gray-700">
                {ratingLabels[rating]}
              </span>
            </div>
            {errors.rating && (
              <p className="text-red-500 text-xs md:text-sm mt-1">{errors.rating}</p>
            )}
          </div>

          {/* Review Title */}
          <div>
            <label htmlFor="review-title" className="block text-sm font-semibold text-gray-800 mb-2 md:mb-3">
              Review Title *
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-sm md:text-base"
            />
            {errors.title && (
              <p className="text-red-500 text-xs md:text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Review Comment */}
          <div>
            <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-800 mb-2 md:mb-3">
              Your Review *
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience with this product..."
              rows={3}
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all resize-none text-sm md:text-base"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {comment.length}/500 characters
              </span>
              {errors.comment && (
                <p className="text-red-500 text-xs md:text-sm">{errors.comment}</p>
              )}
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label htmlFor="reviewer-name" className="block text-sm font-semibold text-gray-800 mb-2 md:mb-3">
                Your Name *
              </label>
              <input
                id="reviewer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-sm md:text-base"
              />
              {errors.name && (
                <p className="text-red-500 text-xs md:text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="reviewer-email" className="block text-sm font-semibold text-gray-800 mb-2 md:mb-3">
                Email Address *
              </label>
              <input
                id="reviewer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none transition-all text-sm md:text-base"
              />
              {errors.email && (
                <p className="text-red-500 text-xs md:text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
            <div className="flex items-start gap-2 md:gap-3">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <Check className="h-2 w-2 md:h-3 md:w-3 text-blue-600" />
              </div>
              <div className="text-xs md:text-sm text-blue-800">
                <p className="font-medium mb-1">Privacy Notice</p>
                <p>Your email will not be published. We may use it to verify your purchase and contact you about your review.</p>
              </div>
            </div>
          </div>

          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4 p-4 md:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 md:px-6 py-2 md:py-3 w-full sm:w-auto text-sm md:text-base"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="bg-pink-400 hover:bg-pink-400 text-white font-semibold px-6 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto text-sm md:text-base"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </div>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
